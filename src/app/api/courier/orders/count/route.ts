import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Токен авторизации не найден'
      }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Недействительный токен'
      }, { status: 401 })
    }

    // Получаем только количество доступных заказов (COURIER_WAIT без назначенного курьера)
    const availableCount = await prisma.order.count({
      where: {
        status: 'COURIER_WAIT',
        courierId: null
      }
    })

    return NextResponse.json<ApiResponse<{ count: number }>>({
      success: true,
      data: { count: availableCount }
    })
  } catch (error) {
    console.error('Get orders count error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при получении счетчика заказов'
    }, { status: 500 })
  }
}
