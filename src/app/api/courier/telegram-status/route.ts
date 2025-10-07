import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getCourierChatId } from '@/lib/settings'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Проверяем аутентификацию
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Недействительный токен'
      }, { status: 401 })
    }

    // Проверяем наличие COURIER_CHAT_ID
    const hasTelegramChatId = await getCourierChatId(payload.id)
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        hasTelegramNotifications: !!hasTelegramChatId
      }
    })
  } catch (error) {
    console.error('Telegram status check error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}

