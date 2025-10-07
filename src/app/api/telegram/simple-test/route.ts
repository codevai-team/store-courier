import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 API: Простой тест Telegram...')

    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Сообщение не указано'
      }, { status: 400 })
    }

    // Простая проверка - возвращаем успех без реальной отправки
    console.log('✅ Простой тест успешен:', message)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Простой тест выполнен успешно`,
      data: {
        receivedMessage: message,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Simple test error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при выполнении простого теста'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Простой тест endpoint работает',
    data: {
      timestamp: new Date().toISOString()
    }
  })
}
