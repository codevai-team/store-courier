import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { ApiResponse, OrderWithDetails } from '@/types'

export async function GET(request: NextRequest) {
  try {
    logger.log('API: Получен запрос на загрузку заказов')
    const token = request.cookies.get('auth-token')?.value
    logger.log('API: Токен найден:', !!token, token ? `Длина: ${token.length}` : 'Токен отсутствует')

    if (!token) {
      logger.log('API: Токен не найден')
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Токен авторизации не найден'
      }, { status: 401 })
    }

    logger.log('API: Проверяем токен...')
    const user = verifyToken(token)
    logger.log('API: Результат проверки токена:', !!user, user ? `ID: ${user.id}` : 'Токен недействителен')
    
    if (!user) {
      logger.log('API: Токен недействителен')
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Недействительный токен'
      }, { status: 401 })
    }

    logger.log('API: Запрашиваем заказы из базы данных...')
    // Получаем заказы (курьер видит только заказы, которые админ подтвердил)
    const orders = await prisma.order.findMany({
      where: {
        // Курьер видит только заказы начиная с COURIER_WAIT
        status: {
          in: ['COURIER_WAIT', 'COURIER_PICKED', 'ENROUTE', 'DELIVERED', 'CANCELED']
        }
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
      }
    })

    logger.log('API: Заказы получены из БД, количество:', orders.length)
    return NextResponse.json<ApiResponse<OrderWithDetails[]>>({
      success: true,
      data: orders
    })
  } catch (error) {
    logger.error('Get orders error:', error)
    
    // Проверяем тип ошибки для более точной обработки
    if (error instanceof Error) {
      // Ошибка подключения к БД
      if (error.message.includes("Can't reach database server") || 
          error.message.includes("Server has closed the connection")) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Проблема с подключением к серверу. Попробуйте обновить страницу.'
        }, { status: 503 })
      }
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при получении заказов'
    }, { status: 500 })
  }
}
