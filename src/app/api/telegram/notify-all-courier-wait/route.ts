import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBulkNotifications } from '@/lib/notification-manager'
import type { ApiResponse } from '@/types'
import type { NotificationRequest } from '@/lib/notification-manager'

export async function POST(request: NextRequest) {
  try {
    console.log('API: Получен запрос на уведомление о всех заказах COURIER_WAIT')

    // Получаем все заказы со статусом COURIER_WAIT
    const orders = await prisma.order.findMany({
      where: { status: 'COURIER_WAIT' },
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

    console.log('API: Найдено заказов COURIER_WAIT:', orders.length)

    if (orders.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Нет заказов со статусом COURIER_WAIT'
      })
    }

    // Подготавливаем массив уведомлений для централизованной системы
    const notifications: NotificationRequest[] = orders.map(order => ({
      orderId: order.id,
      type: 'NEW_ORDER' as const
    }))

    // Используем централизованную систему для массовой отправки
    const results = await sendBulkNotifications(request, notifications)

    const successCount = results.filter(r => r.success).length
    const duplicateCount = results.filter(r => r.duplicate).length
    const errorCount = results.length - successCount

    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: `Уведомления отправлены: ${successCount} успешно, ${duplicateCount} дубликатов, ${errorCount} с ошибками`,
      data: { 
        results, 
        summary: {
          total: results.length,
          success: successCount,
          duplicates: duplicateCount,
          errors: errorCount
        }
      }
    })

    // Устанавливаем cookies для успешно отправленных уведомлений
    results.forEach(result => {
      if (result.success && !result.duplicate) {
        const notificationKey = `${result.orderId}_${result.type}`
        const cookieName = `notification_${notificationKey}`
        const timestamp = result.timestamp.toString()
        
        response.cookies.set(cookieName, timestamp, {
          maxAge: 300, // 5 минут в секундах
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
      }
    })

    return response
  } catch (error) {
    console.error('Notify all courier wait error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при отправке уведомлений о заказах'
    }, { status: 500 })
  }
}

