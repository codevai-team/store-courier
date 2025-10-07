import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNewOrderNotification, sendOrderStatusUpdateNotification } from '@/lib/telegram'
import type { OrderWithDetails } from '@/types'

// Типы уведомлений
export type NotificationType = 'NEW_ORDER' | 'STATUS_UPDATE' | 'ORDER_CANCELLED'

// Интерфейс для запроса уведомления
export interface NotificationRequest {
  orderId: string
  type: NotificationType
  oldStatus?: string
  cancelComment?: string
}

// Интерфейс для результата уведомления
export interface NotificationResult {
  success: boolean
  message: string
  orderId: string
  type: NotificationType
  timestamp: number
  duplicate?: boolean
}

// Кэш для отслеживания отправленных уведомлений (ID заказа -> timestamp)
const notificationCache = new Map<string, number>()
const NOTIFICATION_COOLDOWN = 300000 // 5 минут cooldown между уведомлениями для одного заказа

// Очистка старых записей из кэша каждые 10 минут
setInterval(() => {
  const now = Date.now()
  for (const [orderId, timestamp] of notificationCache.entries()) {
    if (now - timestamp > NOTIFICATION_COOLDOWN * 2) { // Удаляем записи старше 10 минут
      notificationCache.delete(orderId)
      // console.log(`🧹 NotificationManager: Удален из кэша заказ: ${orderId.slice(-8)}`)
    }
  }
}, 600000) // 10 минут

// Функция для генерации уникального ключа уведомления
function generateNotificationKey(orderId: string, type: NotificationType, oldStatus?: string): string {
  if (type === 'STATUS_UPDATE' && oldStatus) {
    return `${orderId}_${type}_${oldStatus}`
  }
  return `${orderId}_${type}`
}

// Функция для проверки дублирования через cookies
function checkCookieDeduplication(request: NextRequest, notificationKey: string): boolean {
  const cookieName = `notification_${notificationKey}`
  const cookieValue = request.cookies.get(cookieName)?.value
  
  if (cookieValue) {
    const timestamp = parseInt(cookieValue)
    const now = Date.now()
    
    // Если cookie существует и не истек cooldown
    if (now - timestamp < NOTIFICATION_COOLDOWN) {
      // console.log(`🍪 NotificationManager: Дублирование обнаружено через cookie для ${notificationKey}`)
      return true
    }
  }
  
  return false
}

// Функция для установки cookie с дедупликацией
function setNotificationCookie(response: NextResponse, notificationKey: string): void {
  const cookieName = `notification_${notificationKey}`
  const timestamp = Date.now().toString()
  
  // Устанавливаем cookie на 10 минут (время жизни cooldown * 2)
  response.cookies.set(cookieName, timestamp, {
    maxAge: NOTIFICATION_COOLDOWN * 2 / 1000, // Конвертируем в секунды
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  
  // console.log(`🍪 NotificationManager: Установлен cookie для ${notificationKey}`)
}

// Основная функция для отправки уведомлений
export async function sendNotification(
  request: NextRequest,
  notificationRequest: NotificationRequest
): Promise<NotificationResult> {
  const { orderId, type, oldStatus, cancelComment } = notificationRequest
  const notificationKey = generateNotificationKey(orderId, type, oldStatus)
  
  // console.log(`📨 NotificationManager: Обработка уведомления ${type} для заказа ${orderId.slice(-8)}`)
  
  // Проверяем дублирование через кэш в памяти
  const lastNotificationTime = notificationCache.get(notificationKey)
  if (lastNotificationTime) {
    const timeSinceLastNotification = Date.now() - lastNotificationTime
    if (timeSinceLastNotification < NOTIFICATION_COOLDOWN) {
      // console.log(`⏸️ NotificationManager: Уведомление для ${notificationKey} уже было отправлено ${Math.round(timeSinceLastNotification / 1000)} секунд назад. Пропускаем.`)
      return {
        success: true,
        message: 'Уведомление уже было отправлено недавно',
        orderId,
        type,
        timestamp: Date.now(),
        duplicate: true
      }
    }
  }
  
  // Проверяем дублирование через cookies
  if (checkCookieDeduplication(request, notificationKey)) {
    return {
      success: true,
      message: 'Уведомление уже было отправлено недавно (cookie)',
      orderId,
      type,
      timestamp: Date.now(),
      duplicate: true
    }
  }
  
  try {
    // Получаем заказ из базы данных
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        courier: true,
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
                seller: true
              }
            }
          }
        }
      }
    })
    
    if (!order) {
      // console.log(`❌ NotificationManager: Заказ ${orderId.slice(-8)} не найден`)
      return {
        success: false,
        message: 'Заказ не найден',
        orderId,
        type,
        timestamp: Date.now()
      }
    }
    
    // Проверяем статус заказа для NEW_ORDER уведомлений
    if (type === 'NEW_ORDER' && order.status !== 'COURIER_WAIT') {
      // console.log(`⚠️ NotificationManager: Заказ ${orderId.slice(-8)} не имеет статус COURIER_WAIT: ${order.status}`)
      return {
        success: false,
        message: 'Заказ не имеет статус COURIER_WAIT',
        orderId,
        type,
        timestamp: Date.now()
      }
    }
    
    // Отправляем соответствующее уведомление
    let telegramSuccess = false
    let telegramMessage = ''
    
    try {
      if (type === 'NEW_ORDER') {
        await sendNewOrderNotification(order)
        telegramMessage = 'Уведомление о новом заказе отправлено'
      } else if (type === 'STATUS_UPDATE' && oldStatus) {
        await sendOrderStatusUpdateNotification(order, oldStatus)
        telegramMessage = 'Уведомление об изменении статуса отправлено'
      } else {
        throw new Error(`Неподдерживаемый тип уведомления: ${type}`)
      }
      
      telegramSuccess = true
      // console.log(`✅ NotificationManager: ${telegramMessage} для заказа ${orderId.slice(-8)}`)
    } catch (telegramError) {
      // console.error(`❌ NotificationManager: Ошибка отправки Telegram уведомления для заказа ${orderId.slice(-8)}:`, telegramError)
      telegramMessage = 'Ошибка отправки Telegram уведомления'
    }
    
    // Сохраняем timestamp в кэш
    const timestamp = Date.now()
    notificationCache.set(notificationKey, timestamp)
    
    return {
      success: telegramSuccess,
      message: telegramMessage,
      orderId,
      type,
      timestamp
    }
    
  } catch (error) {
    // console.error(`❌ NotificationManager: Ошибка обработки уведомления для заказа ${orderId.slice(-8)}:`, error)
    return {
      success: false,
      message: 'Ошибка при обработке уведомления',
      orderId,
      type,
      timestamp: Date.now()
    }
  }
}

// Функция для массовой отправки уведомлений
export async function sendBulkNotifications(
  request: NextRequest,
  notifications: NotificationRequest[]
): Promise<NotificationResult[]> {
    // console.log(`📨 NotificationManager: Обработка ${notifications.length} уведомлений`)
  
  const results: NotificationResult[] = []
  
  for (const notification of notifications) {
    const result = await sendNotification(request, notification)
    results.push(result)
    
    // Небольшая задержка между уведомлениями для снижения нагрузки
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const successCount = results.filter(r => r.success).length
  const duplicateCount = results.filter(r => r.duplicate).length
  
  // console.log(`📊 NotificationManager: Результаты массовой отправки - Успешно: ${successCount}, Дубликаты: ${duplicateCount}, Ошибок: ${results.length - successCount}`)
  
  return results
}

// Функция для получения статистики кэша
export function getCacheStats(): { size: number; entries: Array<{ key: string; timestamp: number }> } {
  const entries = Array.from(notificationCache.entries()).map(([key, timestamp]) => ({
    key,
    timestamp
  }))
  
  return {
    size: notificationCache.size,
    entries
  }
}

// Функция для очистки кэша
export function clearCache(): void {
  notificationCache.clear()
  // console.log('🧹 NotificationManager: Кэш очищен')
}
