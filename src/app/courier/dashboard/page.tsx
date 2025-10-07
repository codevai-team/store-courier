'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CompactOrderCard } from '@/components/courier/CompactOrderCard'
import { MobileOrderCard } from '@/components/courier/MobileOrderCard'
import { OrderDetailModal } from '@/components/courier/OrderDetailModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrders } from '@/contexts/OrdersContext'
import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { ClockIcon, BoltIcon, CheckCircleIcon, XCircleIcon, FunnelIcon, ArrowsUpDownIcon, CalendarIcon, CurrencyDollarIcon, ShoppingBagIcon, ChartBarIcon, TruckIcon } from '@heroicons/react/24/outline'
import type { OrderWithDetails, OrderStatus } from '@/types'
import { normalizePhoneForSearch, generatePhoneSearchVariants } from '@/lib/utils'
import { logger } from '@/lib/logger'

type TabType = 'available' | 'my' | 'completed' | 'canceled' | 'statistics'
type SortType = 'date-new' | 'date-old' | 'price-high' | 'price-low' | 'items-high' | 'items-low'
type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year'

// Функции для работы с датами
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

// Функция для форматирования сумм с сокращениями
const formatRevenue = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} млн.`
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)} тыс.`
  } else {
    return amount.toLocaleString()
  }
}

// Функция для генерации карточек дней в зависимости от фильтра
const generateDailyCards = (dateFilter: string, dailyStats: any) => {
  const now = new Date()
  
  switch (dateFilter) {
    case 'today': {
      const today = now.toLocaleDateString('ru-RU', { weekday: 'long' })
      const todayStats = dailyStats[today] || { delivered: 0, canceled: 0, total: 0, revenue: 0 }
      return [{ day: 'Сегодня', stats: todayStats }]
    }
    
    case 'yesterday': {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const yesterdayDay = yesterday.toLocaleDateString('ru-RU', { weekday: 'long' })
      const yesterdayStats = dailyStats[yesterdayDay] || { delivered: 0, canceled: 0, total: 0, revenue: 0 }
      return [{ day: 'Вчера', stats: yesterdayStats }]
    }
    
    case 'week': {
      const dayOrder = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
      return dayOrder.map(day => ({
        day: day.charAt(0).toUpperCase() + day.slice(1),
        stats: dailyStats[day] || { delivered: 0, canceled: 0, total: 0, revenue: 0 }
      }))
    }
    
    case 'month': {
      // Для месяца показываем календарный вид
      const year = now.getFullYear()
      const month = now.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const daysInMonth = lastDay.getDate()
      
      const calendarDays = []
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day)
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long' })
        const stats = dailyStats[dayName] || { delivered: 0, canceled: 0, total: 0, revenue: 0 }
        
        calendarDays.push({
          day: day.toString(),
          stats,
          isToday: day === now.getDate(),
          dayOfWeek: dayName
        })
      }
      
      return calendarDays
    }
    
    default: {
      // Для 'all' показываем все дни недели
      const dayOrder = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
      return dayOrder.map(day => ({
        day: day.charAt(0).toUpperCase() + day.slice(1),
        stats: dailyStats[day] || { delivered: 0, canceled: 0, total: 0, revenue: 0 }
      }))
    }
  }
}

const getTodayRange = (): string => {
  const today = new Date()
  const dateStr = formatDate(today)
  return `${dateStr} 00:00-${dateStr} 23:59`
}

const getYesterdayRange = (): string => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = formatDate(yesterday)
  return `${dateStr} 00:00-${dateStr} 23:59`
}

const getWeekRange = (): string => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  return `${formatDate(monday)}-${formatDate(sunday)}`
}

const getMonthRange = (): string => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  return `${formatDate(firstDay)}-${formatDate(lastDay)}`
}

const getYearRange = (): string => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), 0, 1)
  const lastDay = new Date(today.getFullYear(), 11, 31)
  
  return `${formatDate(firstDay)}-${formatDate(lastDay)}`
}

// Компонент для работы с searchParams
function CourierDashboardContent() {
  logger.log('CourierDashboard: Компонент загружается')
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Проверяем параметр noTelegram при загрузке
  useEffect(() => {
    const noTelegram = searchParams.get('noTelegram')
    if (noTelegram === 'true') {
      setShowTelegramNotification(true)
      // Очищаем параметр из URL
      const url = new URL(window.location.href)
      url.searchParams.delete('noTelegram')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])
  
  // Глобальная обработка ошибок расширений браузера
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message.includes('message channel closed') || 
          event.message.includes('asynchronous response')) {
        logger.log('🔧 Игнорируем ошибку расширения браузера:', event.message)
        event.preventDefault()
        return false
      }
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('message channel closed') ||
           event.reason.message.includes('asynchronous response'))) {
        logger.log('🔧 Игнорируем ошибку расширения браузера:', event.reason.message)
        event.preventDefault()
        return false
      }
    }
    
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  const { orders, setOrders } = useOrders()
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('available')
  const [currentCourierId, setCurrentCourierId] = useState<string | null>(null)
  const [isServerOnline, setIsServerOnline] = useState(true)
  const [networkErrorCount, setNetworkErrorCount] = useState(0)
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set())
  const [previousAvailableCount, setPreviousAvailableCount] = useState<number>(0)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [notifiedOrderIds, setNotifiedOrderIds] = useState<Set<string>>(new Set()) // Отслеживаем заказы, для которых уже отправлены уведомления
  
  // Ref'ы для стабильного доступа к актуальным значениям
  const previousOrderIdsRef = useRef<Set<string>>(new Set())
  const notifiedOrderIdsRef = useRef<Set<string>>(new Set())
  
  // Состояние для эффекта свечения карточек
  const [glowingOrders, setGlowingOrders] = useState<Set<string>>(new Set())
  
  // Состояние для уведомления о Telegram
  const [showTelegramNotification, setShowTelegramNotification] = useState(false)
  
  // Состояние для поиска
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Состояния для фильтров и сортировки
  const [sortBy, setSortBy] = useState<SortType>('date-new')
  const [showFilters, setShowFilters] = useState(false)
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all')

  // Состояние для определения размера экрана
  const [isMobile, setIsMobile] = useState(false)
  
  // Состояние для отслеживания недавнего изменения статуса
  const [recentStatusChange, setRecentStatusChange] = useState<boolean>(false)
  
  // Состояние для статистики
  const [statistics, setStatistics] = useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({start: '', end: ''})

  // Определяем размер экрана
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Синхронизируем ref'ы с state
  useEffect(() => {
    previousOrderIdsRef.current = previousOrderIds
  }, [previousOrderIds])

  useEffect(() => {
    notifiedOrderIdsRef.current = notifiedOrderIds
  }, [notifiedOrderIds])

  // Опции для dropdown'ов
  const sortOptions = [
    { value: 'date-new', label: t('sortNewest') },
    { value: 'date-old', label: t('sortOldest') },
    { value: 'price-high', label: t('sortPriceHigh') },
    { value: 'price-low', label: t('sortPriceLow') },
    { value: 'items-high', label: t('sortItemsHigh') },
    { value: 'items-low', label: t('sortItemsLow') }
  ]

  const dateFilterOptions = [
    { value: 'all', label: t('allTime') },
    { value: 'today', label: t('today') },
    { value: 'yesterday', label: t('yesterday') },
    { value: 'week', label: t('thisWeek') },
    { value: 'month', label: t('thisMonth') },
    { value: 'year', label: 'Год' }
  ]


  // Функция для автоматического заполнения полей дат при выборе готовых диапазонов
  const handleDateFilterChange = useCallback((value: DateFilterType) => {
    setDateFilter(value)
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Функция для форматирования даты в локальном формате YYYY-MM-DD
    const formatDateLocal = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    switch (value) {
      case 'today': {
        const todayStr = formatDateLocal(today)
        setCustomDateRange({ start: todayStr, end: todayStr })
        break
      }
      case 'yesterday': {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        const yesterdayStr = formatDateLocal(yesterday)
        setCustomDateRange({ start: yesterdayStr, end: yesterdayStr })
        break
      }
      case 'week': {
        const dayOfWeek = now.getDay()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        setCustomDateRange({ 
          start: formatDateLocal(weekStart), 
          end: formatDateLocal(weekEnd) 
        })
        break
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        setCustomDateRange({ 
          start: formatDateLocal(monthStart), 
          end: formatDateLocal(monthEnd) 
        })
        break
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const yearEnd = new Date(now.getFullYear(), 11, 31)
        setCustomDateRange({ 
          start: formatDateLocal(yearStart), 
          end: formatDateLocal(yearEnd) 
        })
        break
      }
      case 'all':
      default:
        setCustomDateRange({ start: '', end: '' })
        break
    }
  }, [])

  // Функция для загрузки статистики
  const fetchStatistics = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      let url = `/api/courier/statistics`
      const params = new URLSearchParams()
      
      // Всегда отправляем период, API сам определит диапазон дат
      params.append('period', dateFilter)
      
      // Добавляем фильтры по цене
      if (priceMin) {
        params.append('priceMin', priceMin)
      }
      if (priceMax) {
        params.append('priceMax', priceMax)
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      logger.log('📊 Загружаем статистику с параметрами:', { dateFilter, priceMin, priceMax })
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setStatistics(data.data)
        logger.log('✅ Статистика загружена:', data.data.summary)
      } else {
        logger.error('Ошибка загрузки статистики:', data.error)
      }
    } catch (error) {
      logger.error('Ошибка загрузки статистики:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [dateFilter, priceMin, priceMax])

  // Функция для подсветки найденного текста
  const highlightSearchText = (text: string, query: string) => {
    if (!query.trim() || !text) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded font-medium">
          {part}
        </mark>
      ) : part
    )
  }

  // Функция для рендеринга карточек заказов
  const renderOrderCard = (order: OrderWithDetails) => {
    const commonProps = {
      order,
      onClick: () => handleOrderClick(order),
      isGlowing: glowingOrders.has(order.id),
      searchQuery: searchQuery,
      highlightText: highlightSearchText
    }

    if (isMobile) {
      return <MobileOrderCard key={order.id} {...commonProps} />
    } else {
      return <CompactOrderCard key={order.id} {...commonProps} />
    }
  }

  // Слушаем события поиска из navbar
  useEffect(() => {
    const handleSearchChange = (event: CustomEvent) => {
      setSearchQuery(event.detail)
    }

    window.addEventListener('searchQueryChange', handleSearchChange as EventListener)

    return () => {
      window.removeEventListener('searchQueryChange', handleSearchChange as EventListener)
    }
  }, [])


  // Слушаем события навигации к статистике из ProfileDropdown
  useEffect(() => {
    const handleNavigateToStats = () => {
      setActiveTab('statistics')
    }

    window.addEventListener('navigateToStats', handleNavigateToStats as EventListener)

    return () => {
      window.removeEventListener('navigateToStats', handleNavigateToStats as EventListener)
    }
  }, [])
  

  // Функция для добавления эффекта свечения к заказу
  const addGlowEffect = useCallback((orderId: string) => {
    setGlowingOrders(prev => new Set(prev).add(orderId))
    // Убираем эффект через 3 секунды
    setTimeout(() => {
      setGlowingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }, 3000)
  }, [])

  // Функция для отправки браузерных уведомлений
  const sendBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'courier-notification',
        requireInteraction: false,
        silent: false
      })
    }
  }, [])

  // Запрос разрешения на уведомления при загрузке
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        logger.log('🔔 Разрешение на уведомления:', permission)
      })
    }
  }, [])

  // Функция для поиска заказа и определения нужной вкладки и страницы
  const findOrderLocation = useCallback((orderId: string) => {
    const availableOrders = orders.filter(order => order.status === 'COURIER_WAIT')
    const myOrders = orders.filter(order => 
      order.courierId === currentCourierId && 
      (order.status === 'COURIER_PICKED' || order.status === 'ENROUTE')
    )
    const completedOrders = orders.filter(order => order.status === 'DELIVERED')
    const canceledOrders = orders.filter(order => order.status === 'CANCELED')

    // Проверяем в каждой категории
    const categories = [
      { name: 'available' as TabType, orders: availableOrders },
      { name: 'my' as TabType, orders: myOrders },
      { name: 'completed' as TabType, orders: completedOrders },
      { name: 'canceled' as TabType, orders: canceledOrders }
    ]

    for (const category of categories) {
      const orderIndex = category.orders.findIndex(order => order.id === orderId)
      if (orderIndex !== -1) {
        const page = 1 // Убрали пагинацию, всегда показываем первую страницу
        return { tab: category.name, page: 1 }
      }
    }

    return null
  }, [orders, currentCourierId])


  // Объединенная функция для получения заказов и проверки новых
  const fetchOrdersAndCheckNew = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    
    try {
      // Проверяем доступность сервера перед запросом
      if (typeof window !== 'undefined') {
        try {
          // Простая проверка доступности сервера
          const healthCheck = await fetch('/api/courier/auth/verify', {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 секунд для проверки
          })
          
          if (!healthCheck.ok && healthCheck.status !== 401) {
            throw new Error('Сервер недоступен')
          }
        } catch (healthError) {
          logger.log('🌐 Сервер недоступен, пропускаем запрос заказов')
          setIsServerOnline(false)
          if (showLoading) {
            setError('Сервер недоступен. Проверьте подключение к интернету.')
          }
          return
        }
      }
      
      const response = await fetch('/api/courier/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Добавляем таймаут для запроса
        signal: AbortSignal.timeout(15000) // 15 секунд таймаут
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          // Проверяем, не происходит ли выход из системы
          const isLoggingOut = !document.cookie.includes('auth-token=') || 
                             document.cookie.includes('auth-token=;')
          
          if (!isLoggingOut) {
            setError('Ошибка авторизации. Пожалуйста, войдите снова.')
            // Перенаправляем на страницу входа
            router.push('/courier/login')
          }
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()

      if (data.success) {
        const newOrders = data.data || []
        
        setOrders(newOrders)
        setError('')
        setIsServerOnline(true) // Сервер работает
        setNetworkErrorCount(0) // Сбрасываем счетчик ошибок
        
        // Инициализируем счетчик доступных заказов при первой загрузке
        if (showLoading) {
          const availableOrders = newOrders.filter((order: OrderWithDetails) => 
            order.status === 'COURIER_WAIT' && !order.courierId
          )
          const availableOrderIds = new Set<string>(availableOrders.map((order: OrderWithDetails) => order.id))
          
          setPreviousOrderIds(new Set(Array.from(availableOrderIds)))
          setPreviousAvailableCount(availableOrders.length)
          
          // ВАЖНО: Добавляем все существующие заказы в notifiedOrderIds при инициализации
          // чтобы не отправлять для них повторные уведомления
          setNotifiedOrderIds(new Set(Array.from(availableOrderIds)))
          
          setIsInitialized(true)
          
          logger.log(`🔄 Инициализация: найдено ${availableOrders.length} доступных заказов, добавлены в notifiedOrderIds`)
        } else {
          // Проверяем новые заказы только при автоматическом обновлении
          const availableOrders = newOrders.filter((order: OrderWithDetails) => 
            order.status === 'COURIER_WAIT' && !order.courierId
          )
          
          const currentCount = availableOrders.length
          const currentOrderIds = new Set<string>(availableOrders.map((order: OrderWithDetails) => order.id))
          
          // Находим заказы, которых не было в предыдущем списке (реально новые)
          const newOrderIds = Array.from(currentOrderIds).filter((id) => !previousOrderIdsRef.current.has(id as string))
          
          if (newOrderIds.length > 0) {
            logger.log(`🎯 Обнаружено ${newOrderIds.length} новых заказов:`, newOrderIds.map((id) => (id as string).slice(-8)))
            logger.log(`📊 Статистика: previousOrderIds=${previousOrderIds.size}, currentOrderIds=${currentOrderIds.size}, notifiedOrderIds=${notifiedOrderIds.size}`)
            
            // Получаем объекты заказов для новых ID
            const newOrdersToNotify = availableOrders.filter((order: OrderWithDetails) => newOrderIds.includes(order.id as string))
            
            // Фильтруем заказы, для которых еще не отправлены уведомления
            const ordersToNotify = newOrdersToNotify.filter((order: OrderWithDetails) => !notifiedOrderIdsRef.current.has(order.id as string))
            
            if (ordersToNotify.length > 0) {
              logger.log(`📤 Отправляем уведомления для ${ordersToNotify.length} заказов:`, ordersToNotify.map((o: OrderWithDetails) => (o.id as string).slice(-8)))
              
              // Отправляем браузерные уведомления для каждого нового заказа
              ordersToNotify.forEach((order: OrderWithDetails) => {
                const orderNumber = order.id.slice(-8)
                const totalAmount = order.orderItems.reduce((sum, item) => 
                  sum + Number(item.price) * item.amount, 0
                )
                
                sendBrowserNotification(
                  '📦 Новый заказ!',
                  `Заказ #${orderNumber}\nАдрес: ${order.deliveryAddress}\nСумма: ${totalAmount} ${t('som')}`,
                  '/favicon.ico'
                )
              })
              
              // Отправляем уведомления параллельно с использованием Promise.all
              const notificationPromises = ordersToNotify.map(async (order: OrderWithDetails) => {
                try {
                  const controller = new AbortController()
                  const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 секунд таймаут
                  
                  const response = await fetch('/api/telegram/notify-new-order', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orderId: order.id }),
                    signal: controller.signal
                  })
                  
                  clearTimeout(timeoutId)
                  
                  if (response.ok) {
                    logger.log('✅ Уведомление отправлено для заказа:', (order.id as string).slice(-8))
                    // Добавляем ID заказа в Set отправленных уведомлений
                    setNotifiedOrderIds(prev => new Set(prev).add(order.id as string))
                    return { success: true, orderId: order.id }
                  } else {
                    logger.error('❌ Ошибка отправки уведомления для заказа:', (order.id as string).slice(-8), response.status)
                    return { success: false, orderId: order.id }
                  }
                } catch (error) {
                  if (error instanceof Error && error.name === 'AbortError') {
                    logger.log('⏰ Таймаут отправки уведомления для заказа:', (order.id as string).slice(-8))
                  } else {
                    logger.error('❌ Ошибка отправки уведомления:', error)
                  }
                  return { success: false, orderId: order.id }
                }
              })
              
              // Ждем завершения всех уведомлений
              await Promise.allSettled(notificationPromises)
            } else {
              logger.log('ℹ️ Все новые заказы уже имеют отправленные уведомления')
            }
          }
          
          // Обновляем сохраненный список ID заказов и счетчик
          setPreviousOrderIds(new Set(Array.from(currentOrderIds)))
          setPreviousAvailableCount(currentCount)
        }
      } else {
        setError(data.error || t('error'))
        logger.error('Ошибка API:', data.error)
      }
    } catch (error) {
      // Не логируем таймауты как ошибки, это нормальное поведение
      if (error instanceof Error && error.name === 'AbortError') {
        logger.log('⏰ Запрос был прерван (таймаут) - это нормально')
        return
      }
      
      logger.error('Ошибка загрузки заказов:', error)
      
      // Обрабатываем разные типы ошибок
      if (error instanceof Error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          logger.log('🌐 Сервер недоступен - проверьте, что сервер запущен')
        } else {
          logger.log('❌ Неизвестная ошибка:', error.message)
        }
      }
      
      // Не показываем ошибку при автоматическом обновлении, только при первой загрузке
      if (showLoading) {
        if (error instanceof Error && error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          setError('Сервер недоступен. Проверьте подключение к интернету.')
          setIsServerOnline(false)
          setNetworkErrorCount(prev => prev + 1)
        } else {
          setError('Ошибка загрузки заказов. Попробуйте обновить страницу.')
        }
      } else {
        // При автоматическом обновлении просто инкрементируем счетчик ошибок
        setNetworkErrorCount(prev => prev + 1)
        setIsServerOnline(false)
      }
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [router])

  const handleStatusUpdate = async (orderId: string, status: OrderStatus, cancelComment?: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/courier/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, cancelComment })
      })

      const data = await response.json()

      if (data.success) {
        // Обновляем заказ в списке
        setOrders((prevOrders: OrderWithDetails[]): OrderWithDetails[] => 
          prevOrders.map((order: OrderWithDetails): OrderWithDetails => 
            order.id === orderId 
              ? { ...order, ...data.data } as OrderWithDetails
              : order
          )
        )
        
        // Обновляем выбранный заказ если он открыт
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, ...data.data })
        }

        // Закрываем модальное окно
        setIsModalOpen(false)
        setSelectedOrder(null)

        // Переключаем на соответствующую вкладку в зависимости от статуса
        const getTargetTab = (newStatus: OrderStatus): TabType => {
          switch (newStatus) {
            case 'COURIER_PICKED':
            case 'ENROUTE':
              return 'my' // Мои заказы
            case 'DELIVERED':
              return 'completed' // Завершенные
            case 'CANCELED':
              return 'canceled' // Отмененные
            default:
              return 'available' // Доступные
          }
        }

        const targetTab = getTargetTab(status)
        
        // Принудительно переключаемся на нужную вкладку
        logger.log(`🔄 Переключаемся на вкладку "${targetTab}" для заказа ${orderId.slice(-8)} со статусом ${status}`)
        setActiveTab(targetTab)
        
        // Устанавливаем флаг недавнего изменения статуса
        setRecentStatusChange(true)
        
        // Сбрасываем флаг через 3 секунды
        setTimeout(() => {
          setRecentStatusChange(false)
        }, 3000)
        
        // Отправляем браузерное уведомление об изменении статуса
        const orderNumber = orderId.slice(-8)
        const statusLabels: Record<OrderStatus, string> = {
          'CREATED': 'Создан',
          'COURIER_WAIT': 'Ожидает курьера',
          'COURIER_PICKED': 'Принят',
          'ENROUTE': 'В пути',
          'DELIVERED': 'Доставлен',
          'CANCELED': 'Отменен'
        }
        
        sendBrowserNotification(
          '📋 Статус заказа обновлен',
          `Заказ #${orderNumber}\nСтатус: ${statusLabels[status]}`,
          '/favicon.ico'
        )
        
        // Добавляем эффект свечения к обновленному заказу
        addGlowEffect(orderId)
        
        // Локальное обновление уже выполнено выше, дополнительный запрос не нужен
        logger.log(`✅ Статус заказа ${orderId.slice(-8)} обновлен локально, переключение на вкладку "${targetTab}"`)
      } else {
        setError(data.error || t('error'))
      }
    } catch (error) {
      setError(t('error'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleOrderClick = (order: OrderWithDetails) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  useEffect(() => {
    // Проверяем токен перед загрузкой заказов
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/courier/auth/verify')
        if (!response.ok) {
          logger.log('Токен недействителен, перенаправление на логин')
          // Очищаем токен и перенаправляем
          document.cookie = 'auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
          router.push('/courier/login')
          return
        }
        const data = await response.json()
        logger.log('Токен действителен:', data)
        // Сохраняем ID текущего курьера
        if (data.success && data.data?.id) {
          setCurrentCourierId(data.data.id)
        }
        fetchOrdersAndCheckNew()
      } catch (error) {
        logger.error('Ошибка проверки авторизации:', error)
        // Проверяем, не происходит ли выход из системы
        const isLoggingOut = window.location.href.includes('logout') || 
                           document.cookie.includes('auth-token=;') ||
                           !document.cookie.includes('auth-token=')
        
        if (!isLoggingOut) {
          // Очищаем токен и перенаправляем только если это не процесс выхода
          document.cookie = 'auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
          router.push('/courier/login')
        }
      }
    }
    
    checkAuth()
  }, [fetchOrdersAndCheckNew, router])

  // Обработка URL параметров для перехода к заказу или вкладке
  useEffect(() => {
    if (orders.length > 0) {
      const orderId = searchParams.get('order')
      const tab = searchParams.get('tab')
      
      if (orderId) {
        // Найти заказ по ID и открыть модальное окно
        const order = orders.find(o => o.id === orderId)
        if (order) {
          setSelectedOrder(order)
          setIsModalOpen(true)
        }
      }
      
      if (tab && ['available', 'my', 'completed', 'canceled', 'statistics'].includes(tab)) {
        // Не переключаем вкладку, если недавно было изменение статуса
        if (!recentStatusChange) {
          logger.log(`🔄 Переключение на вкладку "${tab}" из URL параметра`)
          setActiveTab(tab as TabType)
        } else {
          logger.log(`⏸️ Пропускаем переключение на "${tab}" из-за недавнего изменения статуса`)
        }
      }
    }
  }, [orders, searchParams, recentStatusChange])


  // Загружаем статистику при переключении на вкладку статистики
  // Загружаем статистику при переходе на вкладку статистики или изменении фильтров
  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStatistics()
    }
  }, [activeTab, fetchStatistics, dateFilter, customDateRange, priceMin, priceMax])

  // Автоматическое обновление с адаптивным интервалом
  useEffect(() => {
    // Увеличиваем интервал при ошибках сети
    const interval = networkErrorCount > 3 ? 30000 : 10000 // 30 секунд при ошибках, иначе 10
    
    const timer = setInterval(() => {
      if (isInitialized && (networkErrorCount < 5 || isServerOnline)) {
        // Не делаем запросы если слишком много ошибок и сервер offline
        fetchOrdersAndCheckNew(false) // Обновляем без показа loading
      }
    }, interval)

    return () => clearInterval(timer)
  }, [fetchOrdersAndCheckNew, isInitialized, networkErrorCount, isServerOnline])

  // Очистка notifiedOrderIds для заказов, которые больше не в статусе COURIER_WAIT
  useEffect(() => {
    if (orders.length > 0 && notifiedOrderIds.size > 0) {
      const currentAvailableOrderIds = new Set(
        orders
          .filter(order => order.status === 'COURIER_WAIT' && !order.courierId)
          .map(order => order.id)
      )
      
      // Удаляем ID заказов, которые больше не в статусе COURIER_WAIT
      const updatedNotifiedIds = new Set(
        Array.from(notifiedOrderIds).filter(id => currentAvailableOrderIds.has(id))
      )
      
      // Обновляем Set только если что-то изменилось
      if (updatedNotifiedIds.size !== notifiedOrderIds.size) {
        logger.log(`🧹 Очищено ${notifiedOrderIds.size - updatedNotifiedIds.size} старых ID из списка отправленных уведомлений`)
        setNotifiedOrderIds(updatedNotifiedIds)
      }
    }
  }, [orders, notifiedOrderIds])

  // Функция поиска и фильтрации заказов
  const filterAndSortOrders = useCallback((ordersList: OrderWithDetails[]) => {
    let filtered = [...ordersList]
    
    // Применяем поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const normalizedQuery = normalizePhoneForSearch(query)
      
      filtered = filtered.filter(order => {
        // Поиск по ID заказа
        if (order.id.toLowerCase().includes(query)) return true
        
        // Поиск по адресу доставки
        if (order.deliveryAddress?.toLowerCase().includes(query)) return true
        
        // Поиск по комментарию клиента
        if (order.customerComment?.toLowerCase().includes(query)) return true
        
        // Поиск по имени клиента
        if (order.customerName?.toLowerCase().includes(query)) return true
        
        // Улучшенный поиск по телефону клиента
        if (order.customerPhone) {
          const customerPhone = order.customerPhone.toLowerCase()
          
          // Обычный поиск по строке
          if (customerPhone.includes(query)) return true
          
          // Поиск по нормализованному номеру (только цифры)
          if (normalizedQuery.length >= 3) {
            const customerPhoneVariants = generatePhoneSearchVariants(order.customerPhone)
            
            // Ищем совпадения в любом из вариантов номера клиента
            const hasMatch = customerPhoneVariants.some(variant => 
              variant.includes(normalizedQuery) || normalizedQuery.includes(variant)
            )
            
            if (hasMatch) return true
          }
        }
        
        // Поиск по товарам в заказе
        if (order.orderItems && order.orderItems.length > 0) {
          const hasMatchingItem = order.orderItems.some((item) => 
            item.product?.name?.toLowerCase().includes(query)
          )
          if (hasMatchingItem) return true
        }
        
        return false
      })
    }
    
    // Применяем фильтр по дате
    if (dateFilter !== 'all' && customDateRange.start && customDateRange.end) {
      const startDate = new Date(customDateRange.start)
      const endDate = new Date(customDateRange.end)
      endDate.setHours(23, 59, 59, 999) // Конец дня
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.updatedAt)
        return orderDate >= startDate && orderDate <= endDate
      })
    }
    
    // Применяем фильтр по цене
    if (priceMin || priceMax) {
      filtered = filtered.filter(order => {
        const total = order.orderItems.reduce((sum, item) => 
          sum + Number(item.price) * item.amount, 0
        )
        
        const min = priceMin ? Number(priceMin) : 0
        const max = priceMax ? Number(priceMax) : Infinity
        
        return total >= min && total <= max
      })
    }
    
    
    // Применяем сортировку
    filtered.sort((a, b) => {
      const totalA = a.orderItems.reduce((sum, item) => sum + Number(item.price) * item.amount, 0)
      const totalB = b.orderItems.reduce((sum, item) => sum + Number(item.price) * item.amount, 0)
      const itemsA = a.orderItems.reduce((sum, item) => sum + item.amount, 0)
      const itemsB = b.orderItems.reduce((sum, item) => sum + item.amount, 0)
      
      switch (sortBy) {
        case 'date-new':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'date-old':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case 'price-high':
          return totalB - totalA
        case 'price-low':
          return totalA - totalB
        case 'items-high':
          return itemsB - itemsA
        case 'items-low':
          return itemsA - itemsB
        default:
          return 0
      }
    })
    
    return filtered
  }, [searchQuery, priceMin, priceMax, dateFilter, sortBy, customDateRange])

  // Функция для фильтрации заказов по периоду статистики
  const filterOrdersByStatsPeriod = useCallback((ordersList: OrderWithDetails[]) => {
    if (dateFilter !== 'all' && customDateRange.start && customDateRange.end) {
      const startDate = new Date(customDateRange.start)
      const endDate = new Date(customDateRange.end)
      endDate.setHours(23, 59, 59, 999) // Конец дня
      
      return ordersList.filter(order => {
        const orderDate = new Date(order.updatedAt)
        return orderDate >= startDate && orderDate <= endDate
      })
    }
    
    return ordersList
  }, [dateFilter, customDateRange])

  // Группируем заказы по статусам
  // Доступные заказы - только те, что админ подтвердил (COURIER_WAIT) и еще не назначены
  const availableOrders = filterAndSortOrders(
    orders.filter(order => 
      order.status === 'COURIER_WAIT' && !order.courierId
    )
  )
  
  // Мои заказы - те, что я принял в работу (только мои заказы)
  const myOrders = filterAndSortOrders(
    orders.filter(order => 
      order.courierId === currentCourierId && ['COURIER_PICKED', 'ENROUTE'].includes(order.status)
    )
  )
  
  // Завершенные заказы - те, что я доставил (только мои заказы)
  const completedOrders = filterAndSortOrders(
    orders.filter(order => 
      order.status === 'DELIVERED' && order.courierId === currentCourierId
    )
  )
  
  // Отмененные заказы - те, что были отменены (только мои заказы)
  const canceledOrders = filterAndSortOrders(
    orders.filter(order => 
      order.status === 'CANCELED' && order.courierId === currentCourierId
    )
  )

  // Заказы по периоду статистики (только мои заказы)
  const statsOrders = filterOrdersByStatsPeriod(
    orders.filter(order => order.courierId === currentCourierId)
  )



  if (isLoading) {
    return (
      <div className="px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      
      {/* Левый Sidebar для десктопа */}
      <div className="hidden lg:flex lg:w-80 p-4 flex-shrink-0 h-full">
        <aside className="flex flex-col w-full h-full rounded-2xl px-5 py-4 shadow-2xl overflow-hidden" style={{ backgroundColor: '#242b3d' }}>
          {/* Заголовок */}
        <div className="mb-3 flex-shrink-0">
          <h1 className="text-xl mb-2 tracking-tight text-white">
            {t('courierPanel')}
          </h1>
          <p className="text-sm mb-3 text-gray-400">
            {t('manageOrders')}
          </p>
        </div>

          {/* Вкладки навигации - скроллящиеся при необходимости */}
          <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('available')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'available'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ClockIcon className={`w-5 h-5 ${activeTab === 'available' ? 'text-white' : 'text-yellow-400'}`} />
                <span>{t('available')}</span>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                activeTab === 'available' ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                {availableOrders.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('my')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'my'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BoltIcon className={`w-5 h-5 ${activeTab === 'my' ? 'text-white' : 'text-blue-400'}`} />
                <span>{t('inWork')}</span>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                activeTab === 'my' ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                {myOrders.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'completed'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className={`w-5 h-5 ${activeTab === 'completed' ? 'text-white' : 'text-green-400'}`} />
                <span>{t('delivered')}</span>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                activeTab === 'completed' ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                {completedOrders.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('canceled')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'canceled'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <XCircleIcon className={`w-5 h-5 ${activeTab === 'canceled' ? 'text-white' : 'text-red-400'}`} />
                <span>{t('canceled')}</span>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                activeTab === 'canceled' ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                {canceledOrders.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('statistics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'statistics'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ChartBarIcon className={`w-5 h-5 ${activeTab === 'statistics' ? 'text-white' : 'text-purple-400'}`} />
                <span>{t('statistics')}</span>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                activeTab === 'statistics' ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                📊
              </span>
            </button>
          </nav>
        </aside>
      </div>

      {/* Основной контент - занимает оставшуюся высоту */}
      <div className="flex-1 flex flex-col overflow-hidden h-full pb-16 lg:pb-0">
        {/* Фиксированный хедер */}
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {/* Уведомление о настройке Telegram */}
          {showTelegramNotification && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Настройте Telegram для уведомлений о заказах
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Для получения мгновенных уведомлений о новых заказах необходимо подключить ваш аккаунт к Telegram боту.
                    </p>
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <button
                    onClick={() => setShowTelegramNotification(false)}
                    className="inline-flex text-yellow-400 hover:text-yellow-600 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Мобильная версия - заголовок, поиск и статистика */}
          <div className="lg:hidden space-y-4">
            <div>
              <h1 className="text-xl mb-1 tracking-tight text-white">
                {t('courierPanel')}
              </h1>
              <p className="text-xs mb-2 text-gray-400">
                {t('manageOrders')}
              </p>
              {/* Индикатор текущей вкладки */}
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${
                  activeTab === 'available' ? 'bg-yellow-400' :
                  activeTab === 'my' ? 'bg-blue-400' :
                  activeTab === 'completed' ? 'bg-green-400' :
                  activeTab === 'canceled' ? 'bg-red-400' :
                  'bg-purple-400'
                }`}></div>
                <span className="text-sm font-medium text-white">
                  {activeTab === 'available' ? t('available') :
                   activeTab === 'my' ? t('inWork') :
                   activeTab === 'completed' ? t('delivered') :
                   activeTab === 'canceled' ? t('canceled') :
                   t('statistics')}
                </span>
              </div>
            </div>


        </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
              <button 
                onClick={() => setError('')}
                className="ml-2 text-red-800 hover:text-red-900"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Скроллящийся контент с заказами */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 pt-4 pb-0">
          {/* Панель фильтров и сортировки */}
          <div className="max-w-[1600px] mx-auto mb-4">
            <div className="flex items-center justify-between gap-3">
              {/* Кнопка фильтров */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 min-w-[140px] sm:min-w-[160px] ${
                  showFilters 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <FunnelIcon className="w-4 h-4" />
                <span>{t('filters')}</span>
              </button>
              
              {/* Сортировка - скрыта для статистики */}
              {activeTab !== 'statistics' && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CustomDropdown
                    options={sortOptions}
                    value={sortBy}
                    onChange={(value) => setSortBy(value as SortType)}
                    icon={ArrowsUpDownIcon}
                    className="min-w-[140px] sm:min-w-[160px]"
                  />
                </div>
              )}
            </div>
            
            {/* Панель фильтров */}
            {showFilters && (
              <div className="mt-3 p-4 rounded-lg border animate-in slide-in-from-top-2" style={{ 
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border)'
              }}>
                <div className="space-y-3">
                  {/* Мобильная версия - вертикальная компоновка */}
                  <div className="block sm:hidden space-y-3">
                    {/* Фильтры */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <FunnelIcon className="w-4 h-4" />
                        {t('filters')}
                      </div>
                      <CustomDropdown
                        options={dateFilterOptions}
                        value={dateFilter}
                        onChange={(value) => handleDateFilterChange(value as DateFilterType)}
                        icon={CalendarIcon}
                        className="w-full h-8"
                        isMobile={true}
                      />
                    </div>
                    
                    {/* Период */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <CalendarIcon className="w-4 h-4" />
                        {t('period')}
                      </div>
                      <div className="flex gap-1 h-8">
                        <input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border rounded"
                          style={{ backgroundColor: '#111827', borderColor: '#1f2937', color: 'var(--foreground)' }}
                        />
                        <input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border rounded"
                          style={{ backgroundColor: '#111827', borderColor: '#1f2937', color: 'var(--foreground)' }}
                        />
                      </div>
                    </div>
                    
                    {/* Цена заказа */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        {t('orderPrice')}
                      </div>
                      <div className="flex gap-1 h-8">
                        <input
                          type="number"
                          placeholder={t('from')}
                          value={priceMin || ''}
                          onChange={(e) => setPriceMin(e.target.value)}
                          className="w-36.5 px-2 py-1 text-xs border rounded"
                          style={{ backgroundColor: '#111827', borderColor: '#1f2937', color: 'var(--foreground)' }}
                        />
                        <input
                          type="number"
                          placeholder={t('to')}
                          value={priceMax || ''}
                          onChange={(e) => setPriceMax(e.target.value)}
                          className="w-36.5 px-2 py-1 text-xs border rounded"
                          style={{ backgroundColor: '#111827', borderColor: '#1f2937', color: 'var(--foreground)' }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Десктопная версия - горизонтальная компоновка */}
                  <div className="hidden sm:block space-y-3">
                    {/* Первая строка - названия */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <FunnelIcon className="w-4 h-4" />
                        {t('filters')}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <CalendarIcon className="w-4 h-4" />
                        {t('period')}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        {t('orderPrice')}
                      </div>
                      <div></div>
                    </div>
                    
                    {/* Вторая строка - элементы управления */}
                    <div className="grid grid-cols-4 gap-4 items-start">
                    {/* Готовые фильтры */}
                    <div className="h-8">
                      <CustomDropdown
                        options={dateFilterOptions}
                        value={dateFilter}
                        onChange={(value) => handleDateFilterChange(value as DateFilterType)}
                        icon={CalendarIcon}
                        className="w-full h-full"
                      />
                    </div>
                    
                    {/* Поля ввода дат */}
                    <div className="flex gap-1 h-8">
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange(prev => ({...prev, start: e.target.value}))}
                        className="flex-1 h-full px-3 py-0 rounded text-xs border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                          borderColor: 'var(--border)',
                          minWidth: '120px'
                        }}
                      />
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange(prev => ({...prev, end: e.target.value}))}
                        className="flex-1 h-full px-3 py-0 rounded text-xs border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                          borderColor: 'var(--border)',
                          minWidth: '120px'
                        }}
                      />
                    </div>
                    
                    {/* Поля ввода цен */}
                    <div className="flex gap-1 h-8">
                      <input
                        type="number"
                        placeholder={t('from')}
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        min="0"
                        className="flex-1 h-full px-2 rounded text-xs border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                          borderColor: 'var(--border)'
                        }}
                      />
                      <input
                        type="number"
                        placeholder={t('to')}
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        min="0"
                        className="flex-1 h-full px-2 rounded text-xs border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                          borderColor: 'var(--border)'
                        }}
                      />
                    </div>
                    
                    {/* Кнопка сброса фильтров */}
                    <div className="flex items-center justify-end h-8">
                      <button
                        onClick={() => {
                          handleDateFilterChange('all')
                          setPriceMin('')
                          setPriceMax('')
                        }}
                        disabled={dateFilter === 'all' && !priceMin && !priceMax && !customDateRange.start && !customDateRange.end}
                        className={`h-full flex items-center justify-center gap-1 px-2 rounded text-xs transition-all duration-200 shadow-sm hover:shadow-md ${
                          dateFilter === 'all' && !priceMin && !priceMax && !customDateRange.start && !customDateRange.end
                            ? 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                            : 'text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                        }`}
                      >
                        <ArrowsUpDownIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{t('resetAll')}</span>
                        <span className="sm:hidden">{t('resetAll')}</span>
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
                
                {/* Активные фильтры - показываем бейджи */}
                {(dateFilter !== 'all' || priceMin || priceMax || customDateRange.start || customDateRange.end) && (
                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs text-gray-400">{t('activeFilters')}</span>
                    
                    {dateFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                        <CalendarIcon className="w-3 h-3" />
                        {dateFilter === 'today' ? `${t('today')} (${getTodayRange()})` : 
                         dateFilter === 'yesterday' ? `${t('yesterday')} (${getYesterdayRange()})` : 
                         dateFilter === 'week' ? `${t('thisWeek')} (${getWeekRange()})` : 
                         dateFilter === 'month' ? `${t('thisMonth')} (${getMonthRange()})` :
                         dateFilter === 'year' ? `${t('thisYear')} (${getYearRange()})` :
                         `${t('thisMonth')} (${getMonthRange()})`}
                      </span>
                    )}
                    
                    {(priceMin || priceMax) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                        <CurrencyDollarIcon className="w-3 h-3" />
                        {priceMin || '0'} - {priceMax || '∞'} {t('som')}
                      </span>
                    )}
                    
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Содержимое вкладок */}
          <div className="max-w-[1600px] mx-auto">
            {/* Доступные заказы */}
            {activeTab === 'available' && (
            <div>
              {availableOrders.length > 0 ? (
                <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
                  {availableOrders.map(renderOrderCard)}
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <ClockIcon className="w-16 h-16 text-yellow-300 mx-auto mb-4" />
                  <p className="text-lg" style={{ color: 'var(--muted)' }}>{t('noAvailableOrders')}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t('newOrdersHere')}</p>
                </div>
              )}
            </div>
          )}

          {/* Мои заказы */}
          {activeTab === 'my' && (
            <div>
              {myOrders.length > 0 ? (
                <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
                  {myOrders.map(renderOrderCard)}
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <BoltIcon className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                  <p className="text-lg" style={{ color: 'var(--muted)' }}>{t('noActiveOrders')}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t('acceptFromAvailable')}</p>
                </div>
              )}
            </div>
          )}

          {/* Завершенные заказы */}
          {activeTab === 'completed' && (
            <div>
              {completedOrders.length > 0 ? (
                <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
                  {completedOrders.map(renderOrderCard)}
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <CheckCircleIcon className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <p className="text-lg" style={{ color: 'var(--muted)' }}>{t('noCompletedOrders')}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t('completedOrdersHere')}</p>
                </div>
              )}
            </div>
          )}

          {/* Отмененные заказы */}
          {activeTab === 'canceled' && (
            <div>
              {canceledOrders.length > 0 ? (
                <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
                  {canceledOrders.map(renderOrderCard)}
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <XCircleIcon className="w-16 h-16 text-red-300 mx-auto mb-4" />
                  <p className="text-lg" style={{ color: 'var(--muted)' }}>{t('noCanceledOrders')}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t('canceledOrdersHere')}</p>
                </div>
              )}
            </div>
          )}

          {/* Статистика */}
          {activeTab === 'statistics' && (
            <div>
              {isLoadingStats ? (
                <div className="flex items-center justify-center min-h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('loading')}</p>
                  </div>
                </div>
              ) : statistics ? (
                <div className="space-y-6">
                  {/* Заголовок статистики */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">{t('courierStatistics')}</h2>
                  </div>

                  {/* KPI Карточки */}
                    <div className="space-y-3 sm:space-y-4">
                      {/* Мобильная версия - 3+2 карточки */}
                      <div className="block sm:hidden space-y-3">
                        {/* Верхний ряд - 3 карточки */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Доставлено */}
                          <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <CheckCircleIcon className="w-6 h-6 text-green-400/60" />
                                <div className="text-lg font-bold text-white">{statistics.summary.completedOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('delivered')}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* В пути */}
                          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <TruckIcon className="w-6 h-6 text-blue-400/60" />
                                <div className="text-lg font-bold text-white">{statistics.summary.inProgressOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('statisticsInProgress')}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Отменено */}
                          <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <XCircleIcon className="w-6 h-6 text-red-400/60" />
                                <div className="text-lg font-bold text-white">{statistics.summary.canceledOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('canceledOrders')}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Нижний ряд - 2 карточки на всю ширину */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Заработано */}
                          <div className="bg-orange-500/10 rounded-xl p-3 border border-orange-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <CurrencyDollarIcon className="w-6 h-6 text-orange-400/60" />
                                <div className="text-sm font-bold text-white">{statistics.summary.totalRevenue.toLocaleString()} {t('som')}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('statisticsEarned')}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Всего заказов */}
                          <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <ShoppingBagIcon className="w-6 h-6 text-purple-400/60" />
                                <div className="text-lg font-bold text-white">{statistics.summary.totalOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('totalOrders')}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Десктопная версия - 5 карточек в ряд */}
                      <div className="hidden sm:block">
                        <div className="grid grid-cols-5 gap-4">
                          {/* Доставлено */}
                          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <CheckCircleIcon className="w-6 h-6 text-green-400/60" />
                                <div className="text-2xl font-bold text-white">{statistics.summary.completedOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('delivered')}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* В пути */}
                          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <TruckIcon className="w-6 h-6 text-blue-400/60" />
                                <div className="text-2xl font-bold text-white">{statistics.summary.inProgressOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('statisticsInProgress')}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Отменено */}
                          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <XCircleIcon className="w-6 h-6 text-red-400/60" />
                                <div className="text-2xl font-bold text-white">{statistics.summary.canceledOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('canceledOrders')}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Заработано */}
                          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <CurrencyDollarIcon className="w-6 h-6 text-orange-400/60" />
                                <div className="text-lg font-bold text-white">{statistics.summary.totalRevenue.toLocaleString()} {t('som')}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('statisticsEarned')}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Всего заказов */}
                          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <ShoppingBagIcon className="w-6 h-6 text-purple-400/60" />
                                <div className="text-2xl font-bold text-white">{statistics.summary.totalOrders}</div>
                              </div>
                              <div className="text-right mt-auto">
                                <div className="text-xs text-gray-400">{t('totalOrders')}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>



                  {/* Список заказов по периоду */}
                  {statsOrders.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4 text-white">
                        {t('ordersForPeriod')} ({statsOrders.length})
                      </h3>
                      <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
                        {statsOrders.map(renderOrderCard)}
                                  </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                  <ChartBarIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-300">{t('noStatistics')}</p>
                  <p className="text-sm mt-2 text-gray-400">{t('statisticsDescription')}</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Модальное окно с деталями заказа */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={isUpdating}
        />

      {/* Мобильное меню внизу */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--navbar-bg)' }}>
        <div className="flex items-center justify-around py-3">
          {[
            { key: 'available', icon: ClockIcon, count: availableOrders.length },
            { key: 'my', icon: BoltIcon, count: myOrders.length },
            { key: 'completed', icon: CheckCircleIcon, count: completedOrders.length },
            { key: 'canceled', icon: XCircleIcon, count: canceledOrders.length },
            { key: 'statistics', icon: ChartBarIcon, count: null }
          ].map(({ key, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabType)}
              className={`flex items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 ${
                activeTab === key
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
              style={{
                backgroundColor: activeTab === key ? 'var(--background-subtle)' : 'transparent'
              }}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${
                  activeTab === key
                    ? 'text-white'
                    : key === 'available' ? 'text-yellow-400' :
                      key === 'my' ? 'text-blue-400' :
                      key === 'completed' ? 'text-green-400' :
                      key === 'canceled' ? 'text-red-400' :
                      'text-purple-400'
                }`} />
                {count !== null && count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Основной компонент с Suspense
export default function CourierDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    }>
      <CourierDashboardContent />
    </Suspense>
  )
}
