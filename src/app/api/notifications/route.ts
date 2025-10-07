import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, sendBulkNotifications, getCacheStats, clearCache } from '@/lib/notification-manager'
import type { ApiResponse } from '@/types'
import type { NotificationRequest } from '@/lib/notification-manager'

// POST - Отправка одного уведомления
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, type, oldStatus, cancelComment }: NotificationRequest = body
    
    console.log('API: Получен запрос на отправку уведомления:', { orderId: orderId?.slice(-8), type })
    
    if (!orderId || !type) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Order ID и тип уведомления обязательны'
      }, { status: 400 })
    }
    
    const result = await sendNotification(request, {
      orderId,
      type,
      oldStatus,
      cancelComment
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
    
    // Устанавливаем cookie для дедупликации только если уведомление было отправлено успешно
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
    console.error('Centralized notification error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при отправке уведомления'
    }, { status: 500 })
  }
}

// PUT - Массовая отправка уведомлений
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notifications }: { notifications: NotificationRequest[] } = body
    
    console.log('API: Получен запрос на массовую отправку уведомлений:', notifications.length)
    
    if (!notifications || !Array.isArray(notifications)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Массив уведомлений обязателен'
      }, { status: 400 })
    }
    
    if (notifications.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Нет уведомлений для отправки'
      })
    }
    
    const results = await sendBulkNotifications(request, notifications)
    
    const successCount = results.filter(r => r.success).length
    const duplicateCount = results.filter(r => r.duplicate).length
    const errorCount = results.length - successCount
    
    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: `Обработано ${results.length} уведомлений: ${successCount} успешно, ${duplicateCount} дубликатов, ${errorCount} ошибок`,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          duplicates: duplicateCount,
          errors: errorCount
        }
      }
    })
    
    // Устанавливаем cookies для успешно отправленных уведомлений
    results.forEach(result => {
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
    })
    
    return response
    
  } catch (error) {
    console.error('Bulk notification error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при массовой отправке уведомлений'
    }, { status: 500 })
  }
}

// GET - Статистика кэша
export async function GET(request: NextRequest) {
  try {
    const stats = getCacheStats()
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Статистика кэша уведомлений',
      data: {
        cacheSize: stats.size,
        entries: stats.entries.map(entry => ({
          key: entry.key,
          timestamp: entry.timestamp,
          age: Math.round((Date.now() - entry.timestamp) / 1000) // возраст в секундах
        }))
      }
    })
    
  } catch (error) {
    console.error('Cache stats error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при получении статистики кэша'
    }, { status: 500 })
  }
}

// DELETE - Очистка кэша
export async function DELETE(request: NextRequest) {
  try {
    clearCache()
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Кэш уведомлений очищен'
    })
    
  } catch (error) {
    console.error('Clear cache error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при очистке кэша'
    }, { status: 500 })
  }
}
