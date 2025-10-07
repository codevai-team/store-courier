import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Токен не найден'
      }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Недействительный токен'
      }, { status: 401 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: user,
      message: 'Токен действителен'
    })
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка проверки токена'
    }, { status: 500 })
  }
}
