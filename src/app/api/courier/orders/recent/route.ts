import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, OrderWithDetails } from '@/types'

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

    // Получаем параметр limit из query string
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')

    // Получаем последние доступные заказы
    const recentOrders = await prisma.order.findMany({
      where: {
        status: 'COURIER_WAIT',
        courierId: null
      },
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
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    })

    return NextResponse.json<ApiResponse<OrderWithDetails[]>>({
      success: true,
      data: recentOrders
    })
  } catch (error) {
    console.error('Get recent orders error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при получении последних заказов'
    }, { status: 500 })
  }
}
