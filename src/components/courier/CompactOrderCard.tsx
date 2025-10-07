'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { OrderWithDetails, OrderStatus } from '@/types'

interface CompactOrderCardProps {
  order: OrderWithDetails
  onClick: () => void
  isGlowing?: boolean
  searchQuery?: string
  highlightText?: (text: string, query: string) => React.ReactNode
}

export function CompactOrderCard({ order, onClick, isGlowing = false, searchQuery = '', highlightText }: CompactOrderCardProps) {
  const { t } = useLanguage()
  
  // Функция для форматирования сумм с сокращениями
  const formatAmount = (amount: number): string => {
    if (amount >= 100000) {
      return `${(amount / 1000).toFixed(0)} тыс.`
    } else {
      return amount.toLocaleString('ru-RU')
    }
  }
  
  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      CREATED: { label: t('created'), color: 'bg-gray-500/20 text-gray-300' },
      COURIER_WAIT: { label: t('courierWait'), color: 'bg-yellow-500/20 text-yellow-400' },
      COURIER_PICKED: { label: t('courierPicked'), color: 'bg-blue-500/20 text-blue-400' },
      ENROUTE: { label: t('enroute'), color: 'bg-orange-500/20 text-orange-400' },
      DELIVERED: { label: t('deliveredStatus'), color: 'bg-green-500/20 text-green-400' },
      CANCELED: { label: t('canceledOrders'), color: 'bg-red-500/20 text-red-400' }
    }
    
    const config = statusConfig[status]
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'COURIER_WAIT':
        return (
          <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center border border-yellow-200">
            <svg className="w-3 h-3 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'COURIER_PICKED':
        return (
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
            <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'ENROUTE':
        return (
          <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center border border-orange-200">
            <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'DELIVERED':
        return (
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center border border-green-200">
            <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
            <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )
    }
  }

  const totalAmount = order.orderItems.reduce((sum, item) => 
    sum + Number(item.price) * item.amount, 0
  )

  const totalItems = order.orderItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div 
      onClick={onClick}
      className={`card p-2 sm:p-3 lg:p-4 cursor-pointer transition-all duration-300 border group ${
        isGlowing 
          ? 'animate-pulse shadow-2xl shadow-green-500/50 border-green-400 ring-2 ring-green-400 ring-offset-2' 
          : ''
      }`}
      style={{
        background: isGlowing 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)'
          : 'var(--card-bg)'
      }}
    >
      {/* Основная строка: ID, статус, дата, сумма */}
      <div className="flex items-center justify-between mb-2 lg:mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-base lg:text-lg tracking-tight text-white">
            #{highlightText ? highlightText(order.id.slice(-8), searchQuery) : order.id.slice(-8)}
          </span>
          {getStatusBadge(order.status)}
          <span className="text-sm lg:text-base text-gray-400">
            {new Date(order.updatedAt).toLocaleDateString('ru-RU', { 
              day: '2-digit', 
              month: 'short',
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        <div className="text-base lg:text-lg gradient-text">
          {formatAmount(totalAmount)} {t('som')}
        </div>
      </div>

      {/* Вторая строка: Клиент и телефон (только для принятых заказов) */}
      {order.status !== 'COURIER_WAIT' && (
        <div className="flex items-center space-x-4 mb-2 lg:mb-3 text-sm lg:text-base">
          <div className="flex items-center space-x-1 lg:space-x-2">
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate text-white max-w-[120px] sm:max-w-[150px] lg:max-w-none">
              {highlightText ? highlightText(order.customerName || 'Не указано', searchQuery) : (order.customerName || 'Не указано')}
            </span>
          </div>
          <div className="flex items-center space-x-1 lg:space-x-2">
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-gray-400 select-none">
              {highlightText ? highlightText(order.customerPhone || 'Не указано', searchQuery) : (order.customerPhone || 'Не указано')}
            </span>
          </div>
        </div>
      )}

      {/* Третья строка: Адрес и товары */}
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-2 text-sm lg:text-base flex-1 min-w-0">
          <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-1 leading-tight truncate text-gray-400 select-none text-left max-w-[200px] sm:max-w-[250px] lg:max-w-none">
            {highlightText ? highlightText(order.deliveryAddress || '', searchQuery) : order.deliveryAddress}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 ml-3">
          <div className="flex items-center space-x-1 px-2 py-1 lg:px-3 lg:py-1.5 rounded text-sm lg:text-base" style={{ backgroundColor: 'var(--background-subtle)' }}>
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-white">
              {totalItems}
            </span>
          </div>
          {/* Индикатор комментария */}
          {(order.customerComment || order.cancelComment || order.adminComment) && (
            <div className="flex items-center justify-center w-7 h-7 lg:w-8 lg:h-8 rounded bg-blue-50 dark:bg-blue-500/10">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
              </svg>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

