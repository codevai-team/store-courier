'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { OrderWithDetails, OrderStatus } from '@/types'

interface OrderDetailModalProps {
  order: OrderWithDetails | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate: (orderId: string, status: OrderStatus, cancelComment?: string) => Promise<void>
  isUpdating?: boolean
}

export function OrderDetailModal({ 
  order, 
  isOpen, 
  onClose, 
  onStatusUpdate, 
  isUpdating = false 
}: OrderDetailModalProps) {
  const { t } = useLanguage()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelComment, setCancelComment] = useState('')
  const [cancelError, setCancelError] = useState('')
  
  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleActionClick = async (action: any) => {
    if (action.requiresComment) {
      setShowCancelModal(true)
    } else {
      await onStatusUpdate(order!.id, action.status)
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancelComment.trim()) {
      setCancelError(t('cancelCommentRequired') || 'Комментарий обязателен для отмены заказа')
      return
    }
    
    setCancelError('')
    await onStatusUpdate(order!.id, 'CANCELED', cancelComment)
    setShowCancelModal(false)
    setCancelComment('')
  }

  const handleCancelModalClose = () => {
    setShowCancelModal(false)
    setCancelComment('')
    setCancelError('')
  }

  if (!isOpen || !order) return null

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      CREATED: { label: t('created'), color: 'bg-gray-500/20 text-gray-300' },
      COURIER_WAIT: { label: t('courierWait'), color: 'bg-yellow-500/20 text-yellow-400' },
      COURIER_PICKED: { label: t('courierPicked'), color: 'bg-blue-500/20 text-blue-400' },
      ENROUTE: { label: t('enroute'), color: 'bg-orange-500/20 text-orange-400' },
      DELIVERED: { label: t('deliveredStatus'), color: 'bg-green-500/20 text-green-400' },
      CANCELED: { label: t('canceled'), color: 'bg-red-500/20 text-red-400' }
    }
    
    const config = statusConfig[status]
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getNextActions = (status: OrderStatus, courierId: string | null) => {
    const actions = []
    
    if (status === 'COURIER_WAIT' && !courierId) {
      actions.push({
        label: t('acceptOrder'),
        status: 'COURIER_PICKED' as OrderStatus,
        type: 'primary',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      })
    } else if (status === 'COURIER_PICKED') {
      actions.push({
        label: t('startDelivery'),
        status: 'ENROUTE' as OrderStatus,
        type: 'primary',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      })
      actions.push({
        label: t('cancelOrder') || 'Отменить заказ',
        status: 'CANCELED' as OrderStatus,
        type: 'danger',
        requiresComment: true,
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      })
    } else if (status === 'ENROUTE') {
      actions.push({
        label: t('markDelivered'),
        status: 'DELIVERED' as OrderStatus,
        type: 'primary',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      })
      actions.push({
        label: t('cancelOrder') || 'Отменить заказ',
        status: 'CANCELED' as OrderStatus,
        type: 'danger',
        requiresComment: true,
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      })
    }
    
    return actions
  }

  const totalAmount = order.orderItems.reduce((sum, item) => 
    sum + Number(item.price) * item.amount, 0
  )

  const actions = getNextActions(order.status, order.courierId)

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 transition-opacity backdrop-blur-md bg-black/40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div className="relative rounded-xl sm:rounded-2xl border max-w-sm sm:max-w-md lg:max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar shadow-2xl animate-modal-in" style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--border)'
        }}>
          
          {/* Header */}
          <div className="sticky top-0 z-10 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 border-b backdrop-blur-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-base sm:text-lg lg:text-xl tracking-tight text-white">
                    #{order.id.slice(-8)}
                  </h2>
                  {getStatusBadge(order.status)}
                </div>
                {/* Информация о датах */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t('created')}: {new Date(order.createdAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{t('lastUpdated')}: {new Date(order.updatedAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5">
            
            {/* Информация о клиенте и адресе - табличный вид для принятых заказов */}
            {order.status !== 'COURIER_WAIT' && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="p-3 lg:p-4 w-32 text-gray-400">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{t('client')}</span>
                        </div>
                      </td>
                      <td className="p-3 lg:p-4 text-white">
                        <div>{order.customerName}</div>
                      </td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="p-3 lg:p-4 text-gray-400">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{t('phoneLabel')}</span>
                        </div>
                      </td>
                      <td className="p-3 lg:p-4">
                        <a 
                          href={`tel:${order.customerPhone}`} 
                          className="text-blue-400 hover:underline active:scale-95 transition-all duration-150 ease-out select-none"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Добавляем визуальную обратную связь
                            if (e.currentTarget) {
                              e.currentTarget.style.transform = 'scale(0.95)'
                              setTimeout(() => {
                                if (e.currentTarget) {
                                  e.currentTarget.style.transform = 'scale(1)'
                                }
                              }, 150)
                            }
                          }}
                        >
                          {order.customerPhone}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 lg:p-4 align-top text-gray-400">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{t('addressLabel')}</span>
                        </div>
                      </td>
                      <td className="p-3 lg:p-4">
                        <a 
                          href={`geo:0,0?q=${encodeURIComponent(order.deliveryAddress)}`}
                          onClick={(e) => {
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            if (!isMobile) {
                              e.preventDefault();
                              window.open(`https://2gis.kg/search/${encodeURIComponent(order.deliveryAddress)}`, '_blank');
                            }
                          }}
                          className="text-yellow-600 dark:text-yellow-400 hover:underline break-words max-w-[300px] sm:max-w-[400px] lg:max-w-none"
                        >
                          {order.deliveryAddress}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            
            {/* {t('addressLabel')} доставки для доступных заказов */}
            {order.status === 'COURIER_WAIT' && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="p-3 lg:p-4 w-32 align-top text-gray-400">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{t('addressLabel')}</span>
                        </div>
                      </td>
                      <td className="p-3 lg:p-4">
                        <a 
                          href={`geo:0,0?q=${encodeURIComponent(order.deliveryAddress)}`}
                          onClick={(e) => {
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            if (!isMobile) {
                              e.preventDefault();
                              window.open(`https://2gis.kg/search/${encodeURIComponent(order.deliveryAddress)}`, '_blank');
                            }
                          }}
                          className="text-yellow-600 dark:text-yellow-400 hover:underline break-words max-w-[300px] sm:max-w-[400px] lg:max-w-none"
                        >
                          {order.deliveryAddress}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Комментарии - табличный вид */}
            {(order.customerComment || order.cancelComment || order.adminComment) && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    {order.customerComment && (
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="p-3 lg:p-4 w-40 align-top text-gray-400">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{t('customerComment')}</span>
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 italic text-white break-words">
                          "{order.customerComment}"
                        </td>
                      </tr>
                    )}
                    {order.status === 'CANCELED' && order.cancelComment && (
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="p-3 lg:p-4 align-top text-gray-400">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t('cancelComment')}</span>
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 italic text-white break-words">
                          "{order.cancelComment}"
                        </td>
                      </tr>
                    )}
                    {order.adminComment && (
                      <tr>
                        <td className="p-3 lg:p-4 align-top text-gray-400">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t('adminComment')}</span>
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 italic text-white break-words">
                          "{order.adminComment}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Товары в заказе - список с группировкой по продавцам */}
            <div className="rounded-xl p-3 sm:p-4 lg:p-6 border" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2 sm:mb-3 lg:mb-4">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="text-sm sm:text-base lg:text-lg text-white">{t('products')}</span>
              </div>
              
              <div className="space-y-4">
                {(() => {
                  // Группируем товары по продавцам
                  const groupedBySeller = order.orderItems.reduce((acc, item) => {
                    const sellerId = item.product.seller.id
                    const sellerName = item.product.seller.fullname
                    
                    if (!acc[sellerId]) {
                      acc[sellerId] = {
                        seller: item.product.seller,
                        items: []
                      }
                    }
                    acc[sellerId].items.push(item)
                    return acc
                  }, {} as Record<string, { seller: any, items: any[] }>)

                  return Object.values(groupedBySeller).map((sellerGroup, groupIndex) => (
                    <div key={sellerGroup.seller.id} className="space-y-2">
                      {/* Заголовок продавца */}
                      <div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--background-subtle)' }}>
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium text-blue-400">
                          {t('seller')}: {sellerGroup.seller.fullname}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({sellerGroup.items.length} {sellerGroup.items.length === 1 ? t('product') : sellerGroup.items.length < 5 ? t('products2') : t('products5')})
                        </span>
                      </div>
                      
                      {/* Товары этого продавца */}
                      <div className="space-y-2 ml-4">
                        {sellerGroup.items.map((item, itemIndex) => (
                          <div key={item.id} className="flex justify-between items-start gap-2 sm:gap-3 rounded-lg p-2 sm:p-3 lg:p-4 border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-subtle)' }}>
                            <div className="flex gap-2 sm:gap-3 flex-1 min-w-0">
                              <span className="text-xs sm:text-sm text-gray-400 flex-shrink-0">
                                {itemIndex + 1}.
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm lg:text-base break-words text-white line-clamp-2">
                                  {item.product.name}
                                </p>
                                <p className="text-xs mt-0.5 text-gray-400">
                                  {item.amount} {t('pcs') || 'шт.'} × {Number(item.price).toLocaleString('ru-RU')} сом
                                </p>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm lg:text-base whitespace-nowrap text-white">
                              {(Number(item.price) * item.amount).toLocaleString('ru-RU')} сом
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
              
              <div className="border-t pt-2 sm:pt-3 lg:pt-4 mt-2 sm:mt-3 lg:mt-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base lg:text-lg text-white">{t('total')}:</span>
                  <span className="text-lg sm:text-xl lg:text-2xl gradient-text">
                    {totalAmount.toLocaleString('ru-RU')} сом
                  </span>
                </div>
              </div>
            </div>

            {/* Действия */}
            {actions.length > 0 && (
              <div className="flex gap-2 sm:gap-2 lg:gap-3 sticky bottom-0 pb-1">
                {actions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => handleActionClick(action)}
                    disabled={isUpdating}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 lg:py-3 px-2 sm:px-3 lg:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 ${
                      action.type === 'danger' 
                        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white' 
                        : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white'
                    }`}
                  >
                    {action.icon}
                    <span className="truncate">{isUpdating ? t('updating') : action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения отмены */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div 
            className="fixed inset-0 transition-opacity backdrop-blur-md bg-black/50"
            onClick={handleCancelModalClose}
          />
          
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <div className="relative rounded-xl sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full custom-scrollbar border animate-modal-in" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
              
              {/* Header */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold" style={{ color: 'var(--foreground)' }}>
                      {t('confirmCancelOrder') || 'Отмена заказа'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCancelModalClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <svg className="w-5 h-5" style={{ color: 'var(--muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 sm:p-4">
                <div className="mb-3 sm:mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-red-200 dark:border-red-800">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {t('confirmCancelText') || 'Вы действительно хотите отменить заказ'} <span className="font-bold">#{order.id.slice(-8)}</span>?
                  </p>
                  <p className="text-xs mt-1 sm:mt-2 text-red-700 dark:text-red-400">
                    {t('pleaseSpecifyReason') || 'Пожалуйста, укажите причину отмены:'}
                  </p>
                </div>

                <div className="mb-4">
                  <textarea
                    value={cancelComment}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 250) {
                        setCancelComment(value);
                      }
                    }}
                    placeholder={t('cancelReasonPlaceholder') || 'Укажите причину отмены заказа...'}
                    maxLength={250}
                    className="w-full px-3 py-3 border rounded-xl resize-none h-28 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
                    style={{ 
                      backgroundColor: 'var(--card-bg)',
                      borderColor: cancelError ? '#ef4444' : 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    {cancelError && (
                      <p className="text-red-500 text-sm font-medium">{cancelError}</p>
                    )}
                    <p className={`text-xs ml-auto px-2 py-1 rounded-lg ${cancelComment.length >= 250 ? 'text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20' : 'text-gray-400 dark:text-gray-500'}`}>
                      {cancelComment.length}/250
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCancelModalClose}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 text-xs sm:text-sm"
                    style={{ 
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    {t('cancel') || 'Отмена'}
                  </button>
                  <button
                    onClick={handleCancelConfirm}
                    disabled={isUpdating}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95 text-xs sm:text-sm"
                  >
                    {isUpdating ? (t('cancelling') || 'Отменяем...') : (t('confirmCancel') || 'Подтвердить отмену')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
