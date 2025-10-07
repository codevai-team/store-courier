import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting, getCourierChatIds } from '@/lib/settings'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Получение настроек Telegram...')

    const botToken = await getSetting('COURIER_BOT_TOKEN')
    const chatIds = await getCourierChatIds()

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Настройки Telegram получены',
      data: {
        hasBotToken: !!botToken,
        botToken: botToken ? `${botToken.slice(0, 10)}...` : null, // Показываем только начало токена
        courierChatIds: chatIds,
        courierCount: Object.keys(chatIds).length
      }
    })
  } catch (error) {
    console.error('Get Telegram settings error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при получении настроек Telegram'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { botToken }: { botToken: string } = body

    console.log('API: Сохранение токена Telegram бота...')

    if (!botToken || !botToken.trim()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Токен бота не предоставлен'
      }, { status: 400 })
    }

    // Проверяем формат токена (должен быть вида: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/
    if (!tokenRegex.test(botToken.trim())) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Неверный формат токена бота'
      }, { status: 400 })
    }

    const success = await setSetting('COURIER_BOT_TOKEN', botToken.trim())
    
    if (success) {
      console.log('✅ Токен Telegram бота сохранен')
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Токен Telegram бота успешно сохранен'
      })
    } else {
      console.error('❌ Ошибка сохранения токена')
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Ошибка сохранения токена'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Save Telegram settings error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при сохранении настроек Telegram'
    }, { status: 500 })
  }
}
