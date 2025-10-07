import { NextRequest, NextResponse } from 'next/server'
import { startTelegramPolling, isTelegramPollingActive } from '@/lib/telegram-polling'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    console.log('API: Запуск Telegram бота в режиме polling...')

    // Проверяем, не запущен ли уже бот
    if (isTelegramPollingActive()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Бот уже запущен. Сначала остановите текущий экземпляр.'
      }, { status: 409 })
    }

    // Запускаем бота с улучшенной логикой
    await startTelegramPolling()

    console.log('✅ Telegram бот запущен в режиме polling')
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Telegram бот успешно запущен в режиме polling',
      data: {
        mode: 'polling',
        status: 'active'
      }
    })
  } catch (error) {
    console.error('Start polling error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при запуске polling режима'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('API: Остановка Telegram бота...')

    // Импортируем функцию остановки
    const { stopTelegramPolling } = await import('@/lib/telegram-polling')
    await stopTelegramPolling()
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Telegram бот успешно остановлен'
    })
  } catch (error) {
    console.error('Stop polling error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при остановке бота'
    }, { status: 500 })
  }
}
