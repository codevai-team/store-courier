'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { OrderWithDetails, OrderStatus } from '@/types'

interface MobileOrderCardProps {
  order: OrderWithDetails
  onClick: () => void
  isGlowing?: boolean
  searchQuery?: string
  highlightText?: (text: string, query: string) => React.ReactNode
}

export function MobileOrderCard({ order, onClick, isGlowing = false, searchQuery = '', highlightText }: MobileOrderCardProps) {
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const totalAmount = order.orderItems.reduce((sum, item) => 
    sum + Number(item.price) * item.amount, 0
  )

  const totalItems = order.orderItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div 
      onClick={onClick}
      className={`card cursor-pointer transition-all duration-300 border group ${
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
      {/* Заголовок */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base font-semibold tracking-tight text-white">
              #{highlightText ? highlightText(order.id.slice(-8), searchQuery) : order.id.slice(-8)}
            </span>
            {getStatusBadge(order.status)}
          </div>
          <div className="text-right">
            <div className="text-base font-semibold gradient-text">
              {formatAmount(totalAmount)} {t('som')}
            </div>
            <div className="text-xs text-gray-400">
              {totalItems} {totalItems === 1 ? t('item') : totalItems < 5 ? t('items2') : t('items')}
            </div>
          </div>
        </div>
      </div>

      {/* Основная информация */}
      <div className="p-3">
        <div className="space-y-2">
          {/* Дата */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{t('date')}</span>
            <span className="text-xs text-white">
              {new Date(order.updatedAt).toLocaleDateString('ru-RU', { 
                day: '2-digit', 
                month: 'short',
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>

          {/* Клиент (если не COURIER_WAIT) */}
          {order.status !== 'COURIER_WAIT' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{t('client')}</span>
              <span className="text-xs text-white truncate max-w-[120px]">
                {highlightText ? highlightText(order.customerName || 'Не указано', searchQuery) : (order.customerName || 'Не указано')}
              </span>
            </div>
          )}

          {/* Телефон (если не COURIER_WAIT) */}
          {order.status !== 'COURIER_WAIT' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{t('phone')}</span>
              <span className="text-xs text-gray-400 select-none">
                {highlightText ? highlightText(order.customerPhone || 'Не указано', searchQuery) : (order.customerPhone || 'Не указано')}
              </span>
            </div>
          )}

          {/* Адрес */}
          <div className="flex items-start justify-between">
            <span className="text-xs text-gray-400">{t('address')}</span>
            <div className="text-right flex-1 ml-2">
              <span className="text-xs text-white leading-tight line-clamp-2 text-right select-none w-full">
                {highlightText ? highlightText(order.deliveryAddress || 'Не указано', searchQuery) : (order.deliveryAddress || 'Не указано')}
              </span>
            </div>
          </div>

          {/* Комментарий (если есть) */}
          {(order.customerComment || order.cancelComment || order.adminComment) && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{t('comment')}</span>
              <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-50 dark:bg-blue-500/10">
                <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
