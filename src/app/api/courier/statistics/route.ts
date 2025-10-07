import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию курьера
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Токен авторизации не найден' }, { status: 401 })
    }

    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Недействительный токен' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const priceMin = searchParams.get('priceMin')
    const priceMax = searchParams.get('priceMax')

    logger.log('📊 Статистика запрошена:', { 
      courierId: user.id, 
      period, 
      startDate, 
      endDate, 
      priceMin, 
      priceMax 
    })

    // Определяем диапазон дат в зависимости от периода
    let dateFilter: any = {}
    
    if (period !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (period) {
        case 'today':
          dateFilter = {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
          break
        case 'yesterday':
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          dateFilter = {
            gte: yesterday,
            lt: today
          }
          break
        case 'week':
          const dayOfWeek = now.getDay()
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 7)
          dateFilter = {
            gte: weekStart,
            lt: weekEnd
          }
          break
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          dateFilter = {
            gte: monthStart,
            lt: monthEnd
          }
          break
        case 'year':
          const yearStart = new Date(now.getFullYear(), 0, 1)
          const yearEnd = new Date(now.getFullYear() + 1, 0, 1)
          dateFilter = {
            gte: yearStart,
            lt: yearEnd
          }
          break
      }
    }

    // Если переданы конкретные даты, используем их (приоритет над периодом)
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Устанавливаем конец дня
      
      dateFilter = {
        gte: start,
        lt: end
      }
    }

    logger.log('🔍 Фильтр дат:', dateFilter)

    // Получаем все заказы курьера за период
    const orders = await prisma.order.findMany({
      where: {
        courierId: user.id,
        ...(Object.keys(dateFilter).length > 0 && {
          updatedAt: dateFilter
        })
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    logger.log(`📦 Найдено заказов: ${orders.length}`)

    // Фильтруем заказы по цене на стороне сервера
    let filteredOrders = orders
    
    if (priceMin || priceMax) {
      filteredOrders = orders.filter(order => {
        const total = order.orderItems.reduce((sum, item) => 
          sum + Number(item.price) * item.amount, 0
        )
        
        const min = priceMin ? Number(priceMin) : 0
        const max = priceMax ? Number(priceMax) : Infinity
        
        return total >= min && total <= max
      })
    }

    // Подсчитываем статистику на основе отфильтрованных заказов
    const totalOrders = filteredOrders.length
    const completedOrders = filteredOrders.filter(order => order.status === 'DELIVERED').length
    const canceledOrders = filteredOrders.filter(order => order.status === 'CANCELED').length
    const inProgressOrders = filteredOrders.filter(order => 
      ['COURIER_PICKED', 'ENROUTE'].includes(order.status)
    ).length

    // Подсчитываем общую выручку
    const totalRevenue = filteredOrders
      .filter(order => order.status === 'DELIVERED')
      .reduce((sum, order) => {
        return sum + order.orderItems.reduce((orderSum, item) => 
          orderSum + Number(item.price) * item.amount, 0
        )
      }, 0)

    // Подсчитываем средний чек
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0

    // Подсчитываем количество товаров
    const totalItems = filteredOrders
      .filter(order => order.status === 'DELIVERED')
      .reduce((sum, order) => {
        return sum + order.orderItems.reduce((orderSum, item) => orderSum + item.amount, 0)
      }, 0)

    // Подсчитываем среднее время доставки (в минутах)
    const deliveredOrders = filteredOrders.filter(order => order.status === 'DELIVERED')
    const averageDeliveryTime = deliveredOrders.length > 0 
      ? deliveredOrders.reduce((sum, order) => {
          const pickupTime = order.updatedAt // Время когда заказ был принят
          const deliveryTime = order.updatedAt // Время когда заказ был доставлен
          // Для упрощения используем разность между временем создания и обновления
          const timeDiff = deliveryTime.getTime() - order.createdAt.getTime()
          return sum + timeDiff
        }, 0) / deliveredOrders.length / (1000 * 60) // Конвертируем в минуты
      : 0

    // Статистика по дням недели (для графика)
    const dailyStats = filteredOrders.reduce((acc, order) => {
      const day = order.updatedAt.toLocaleDateString('ru-RU', { weekday: 'long' })
      if (!acc[day]) {
        acc[day] = { delivered: 0, canceled: 0, total: 0, revenue: 0 }
      }
      acc[day].total += 1
      if (order.status === 'DELIVERED') {
        acc[day].delivered += 1
        // Добавляем выручку только от доставленных заказов
        acc[day].revenue += order.orderItems.reduce((sum, item) => 
          sum + Number(item.price) * item.amount, 0
        )
      } else if (order.status === 'CANCELED') {
        acc[day].canceled += 1
      }
      return acc
    }, {} as Record<string, { delivered: number, canceled: number, total: number, revenue: number }>)

    // Сортируем дни недели в правильном порядке
    const dayOrder = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
    const sortedDailyStats = dayOrder.reduce((acc, day) => {
      if (dailyStats[day]) {
        acc[day] = dailyStats[day]
      } else {
        acc[day] = { delivered: 0, canceled: 0, total: 0, revenue: 0 }
      }
      return acc
    }, {} as Record<string, { delivered: number, canceled: number, total: number, revenue: number }>)

    // Статистика по часам (для графика активности)
    const hourlyStats = filteredOrders
      .filter(order => order.status === 'DELIVERED')
      .reduce((acc, order) => {
        const hour = order.updatedAt.getHours()
        if (!acc[hour]) {
          acc[hour] = { orders: 0, revenue: 0 }
        }
        acc[hour].orders += 1
        acc[hour].revenue += order.orderItems.reduce((sum, item) => 
          sum + Number(item.price) * item.amount, 0
        )
        return acc
      }, {} as Record<number, { orders: number, revenue: number }>)


    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          completedOrders,
          canceledOrders,
          inProgressOrders,
          totalRevenue,
          averageOrderValue,
          totalItems,
          averageDeliveryTime,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
        },
        charts: {
          dailyStats: sortedDailyStats,
          hourlyStats
        }
      }
    })

  } catch (error) {
    logger.error('Error fetching courier statistics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
