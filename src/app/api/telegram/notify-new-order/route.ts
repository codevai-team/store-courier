import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/notification-manager'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId }: { orderId: string } = body

    console.log('API: Получен запрос на уведомление о новом заказе:', orderId)

    if (!orderId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Order ID не предоставлен'
      }, { status: 400 })
    }

    // Используем централизованную систему уведомлений
    const result = await sendNotification(request, {
      orderId,
      type: 'NEW_ORDER'
    })

    const response = NextResponse.json<ApiResponse>({
      success: result.success,
      message: result.message,
      data: {
        orderId: result.orderId,
        type: result.type,
        timestamp: result.timestamp,
        duplicate: result.duplicate
      }
    })

    // Устанавливаем cookie для дедупликации
    if (result.success && !result.duplicate) {
      const notificationKey = `${result.orderId}_${result.type}`
      const cookieName = `notification_${notificationKey}`
      const timestamp = result.timestamp.toString()
      
      response.cookies.set(cookieName, timestamp, {
        maxAge: 300, // 5 минут в секундах
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
    }

    return response
  } catch (error) {
    console.error('Notify new order error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при отправке уведомления о новом заказе'
    }, { status: 500 })
  }
}
