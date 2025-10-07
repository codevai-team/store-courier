import { NextRequest, NextResponse } from 'next/server'
import { getBot } from '@/lib/telegram-bot'
import { getTelegramBotToken } from '@/lib/settings'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 API: Отправка тестового сообщения в Telegram...')

    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Сообщение не указано'
      }, { status: 400 })
    }

    // Получаем токен бота
    const botToken = await getTelegramBotToken()
    if (!botToken) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Telegram бот не настроен'
      }, { status: 500 })
    }

    // Получаем бота
    const bot = await getBot()
    if (!bot) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Не удалось получить экземпляр бота'
      }, { status: 500 })
    }

    // Получаем список всех зарегистрированных курьеров из настроек
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    try {
      // Получаем настройку COURIER_CHAT_ID (JSON объект с курьерами)
      const courierChatIdSetting = await prisma.setting.findUnique({
        where: { key: 'COURIER_CHAT_ID' }
      })

      if (!courierChatIdSetting || !courierChatIdSetting.value) {
        console.log('⚠️ Нет зарегистрированных курьеров с Telegram, отправляем тестовое сообщение в консоль')
        
        // Вместо ошибки, просто логируем сообщение
        console.log('📤 Тестовое сообщение:', message)
        
        return NextResponse.json<ApiResponse>({
          success: true,
          message: 'Тестовое сообщение обработано (нет курьеров для отправки)',
          data: {
            total: 0,
            success: 0,
            errors: 0,
            results: [],
            note: 'Нет зарегистрированных курьеров с Telegram. Сообщение залогировано в консоль.'
          }
        })
      }

      // Парсим JSON с курьерами
      const courierChatIds = JSON.parse(courierChatIdSetting.value)
      const courierIds = Object.keys(courierChatIds)
      
      if (courierIds.length === 0) {
        console.log('⚠️ JSON с курьерами пуст, отправляем тестовое сообщение в консоль')
        console.log('📤 Тестовое сообщение:', message)
        
        return NextResponse.json<ApiResponse>({
          success: true,
          message: 'Тестовое сообщение обработано (нет курьеров для отправки)',
          data: {
            total: 0,
            success: 0,
            errors: 0,
            results: [],
            note: 'JSON с курьерами пуст. Сообщение залогировано в консоль.'
          }
        })
      }

      // Получаем информацию о курьерах из базы данных
      const couriers = await prisma.user.findMany({
        where: {
          id: { in: courierIds },
          role: 'COURIER'
        },
        select: {
          id: true,
          fullname: true
        }
      })

      // Отправляем сообщение всем курьерам
      const results = []
      for (const courier of couriers) {
        const chatId = courierChatIds[courier.id]
        
        if (!chatId) {
          console.log(`⚠️ Нет Chat ID для курьера ${courier.fullname} (${courier.id})`)
          continue
        }
        
        try {
          await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML'
          })
          results.push({
            courier: courier.fullname,
            courierId: courier.id,
            chatId: chatId,
            status: 'success'
          })
          console.log(`✅ Сообщение отправлено курьеру ${courier.fullname} (${courier.id}) -> ${chatId}`)
        } catch (error: any) {
          console.error(`❌ Ошибка отправки курьеру ${courier.fullname}:`, error)
          results.push({
            courier: courier.fullname,
            courierId: courier.id,
            chatId: chatId,
            status: 'error',
            error: error.message || 'Неизвестная ошибка'
          })
        }
      }

      const successCount = results.filter(r => r.status === 'success').length
      const errorCount = results.filter(r => r.status === 'error').length

      console.log(`📊 Результат отправки: ${successCount} успешно, ${errorCount} ошибок`)

      return NextResponse.json<ApiResponse>({
        success: true,
        message: `Тестовое сообщение отправлено ${successCount} курьерам`,
        data: {
          total: couriers.length,
          success: successCount,
          errors: errorCount,
          results
        }
      })

    } finally {
      await prisma.$disconnect()
    }

  } catch (error) {
    console.error('Test message error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при отправке тестового сообщения'
    }, { status: 500 })
  }
}
