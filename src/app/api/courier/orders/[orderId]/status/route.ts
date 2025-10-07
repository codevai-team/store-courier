import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notification-manager'
import type { ApiResponse } from '@/types'
import type { OrderStatus } from '@prisma/client'
import type { NotificationRequest } from '@/lib/notification-manager'

interface RouteParams {
  params: Promise<{
    orderId: string
  }>
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const params = await context.params
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

    const body = await request.json()
    const { status, cancelComment }: { status: OrderStatus; cancelComment?: string } = body

    // Проверяем, что курьер может изменить статус только на определенные значения
    const allowedStatuses: OrderStatus[] = ['COURIER_PICKED', 'ENROUTE', 'DELIVERED', 'CANCELED']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Недопустимый статус заказа'
      }, { status: 400 })
    }

    // Проверяем, что для отмены заказа указан комментарий
    if (status === 'CANCELED' && !cancelComment?.trim()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Комментарий обязателен для отмены заказа'
      }, { status: 400 })
    }

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.orderId }
    })

    if (!existingOrder) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Заказ не найден'
      }, { status: 404 })
    }

    // Обновляем заказ
    const updateData: { status: OrderStatus; courierId?: string; cancelComment?: string } = { status }
    
    // Если это отмена заказа, добавляем комментарий
    if (status === 'CANCELED' && cancelComment) {
      updateData.cancelComment = cancelComment
    }

    // Если курьер принимает заказ, назначаем его на заказ
    if (status === 'COURIER_PICKED' && !existingOrder.courierId) {
      updateData.courierId = user.id
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.orderId },
      data: updateData,
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
      }
    })

    // Отправляем уведомление в Telegram об изменении статуса
    try {
      let notificationRequest: NotificationRequest | null = null
      
      // Если статус изменился на COURIER_WAIT, отправляем уведомление о новом заказе
      if (status === 'COURIER_WAIT' && existingOrder.status !== 'COURIER_WAIT') {
        notificationRequest = {
          orderId: params.orderId,
          type: 'NEW_ORDER'
        }
      } else {
        // Отправляем уведомление об изменении статуса
        notificationRequest = {
          orderId: params.orderId,
          type: 'STATUS_UPDATE',
          oldStatus: existingOrder.status
        }
      }
      
      if (notificationRequest) {
        const notificationResult = await sendNotification(request, notificationRequest)
        // console.log(`📨 Статус заказа ${params.orderId.slice(-8)}: ${notificationResult.message}`)
      }
    } catch (error) {
      // console.error('Ошибка отправки Telegram уведомления:', error)
      // Не прерываем выполнение, если уведомление не отправилось
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedOrder,
      message: `Статус заказа обновлен на "${getStatusLabel(status)}"`
    })
  } catch (error) {
    // console.error('Update order status error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при обновлении статуса заказа'
    }, { status: 500 })
  }
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    CREATED: 'Создан',
    COURIER_WAIT: 'Ожидает курьера',
    COURIER_PICKED: 'Принят курьером',
    ENROUTE: 'В пути',
    DELIVERED: 'Доставлен',
    CANCELED: 'Отменен'
  }
  return labels[status] || status
}
