import { NextRequest, NextResponse } from 'next/server'
import { isTelegramPollingActive } from '@/lib/telegram-polling'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Только проверяем статус, не запускаем бота
    // Бот запускается автоматически при старте сервера через server-init.ts
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Telegram бот статус',
      data: {
        isActive: isTelegramPollingActive(),
        autoStarted: false // Бот запускается через server-init, не через этот API
      }
    })
  } catch (error) {
    console.error('Auto-start error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при проверке статуса бота'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'start') {
      // Импортируем динамически для избежания циклических зависимостей
      const { startTelegramPolling } = await import('@/lib/telegram-polling')
      await startTelegramPolling()
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Telegram бот запущен вручную'
      })
    } else if (action === 'stop') {
      // Импортируем динамически для избежания циклических зависимостей
      const { stopTelegramPolling } = await import('@/lib/telegram-polling')
      await stopTelegramPolling()
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Telegram бот остановлен вручную'
      })
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Неизвестное действие'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Control bot error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при управлении ботом'
    }, { status: 500 })
  }
}
