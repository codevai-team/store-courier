'use client'

import { usePathname } from 'next/navigation'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { OrdersProvider } from '@/contexts/OrdersContext'
import { SimpleLanguageToggle } from '@/components/ui/SimpleLanguageToggle'
import { TruckIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'
import { ProfileDropdown } from '@/components/courier/ProfileDropdown'
import { SearchBar } from '@/components/courier/SearchBar'

function CourierLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [courierName, setCourierName] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [secondsUntilUpdate, setSecondsUntilUpdate] = useState<number>(10)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')
  
  // Загружаем имя курьера при монтировании компонента
  useEffect(() => {
    const fetchCourierProfile = async () => {
      try {
        const response = await fetch('/api/courier/profile')
        const data = await response.json()
        
        if (data.success && data.data.fullname) {
          setCourierName(data.data.fullname)
        }
      } catch (error) {
        console.error('Error fetching courier profile:', error)
      }
    }
    
    // Загружаем профиль только если не на странице логина
    if (pathname !== '/courier/login') {
      fetchCourierProfile()
    }
  }, [pathname])

  // Отсчет секунд до обновления
  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsUntilUpdate(prev => {
        if (prev <= 1) {
          return 10 // Сбрасываем на 10 секунд
        }
        return prev - 1
      })
    }, 1000) // Каждую секунду

    return () => clearInterval(countdown)
  }, [])

  // Обновляем время каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
      setConnectionStatus('connected')
    }, 10000)

    return () => clearInterval(interval)
  }, [])
  
  // Для страницы логина не показываем навигацию
  if (pathname === '/courier/login') {
    return <>{children}</>
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#1a1f2e' }}>
      {/* Навигационная панель */}
      <nav style={{ 
        backgroundColor: 'var(--navbar-bg)', 
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-md)'
      }} className="border-b relative z-50">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20 gap-2 sm:gap-4">
            {/* Логотип */}
            <div className="flex items-center group cursor-pointer flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-105 transition-all duration-300">
                <TruckIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h1 className="ml-1 sm:ml-2 lg:ml-4 text-sm sm:text-lg lg:text-2xl tracking-tight" style={{ color: 'var(--foreground)' }}>
                Unimark<span className="gradient-text hidden sm:inline">Courier</span>
              </h1>
            </div>

            {/* Поиск посередине - показываем только на странице dashboard */}
            <div className="flex-1 flex justify-center max-w-xs sm:max-w-md lg:max-w-none">
              <div className="w-full max-w-sm lg:max-w-none">
                <SearchBar />
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-1.5 lg:space-x-3 flex-shrink-0">
              {/* Переключатель языка */}
              <SimpleLanguageToggle />

              {/* Профиль курьера */}
              <div className="relative z-[100]">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg sm:rounded-xl lg:rounded-2xl px-1.5 py-1.5 sm:px-2 sm:py-2 lg:px-4 lg:py-3 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  style={{ backgroundColor: 'var(--background-subtle)' }}
                >
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
                    {courierName ? courierName : (
                      <span className="opacity-50">{t('courier')}</span>
                    )}
                  </p>
                  <div className="flex items-center justify-end space-x-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' 
                        ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' 
                        : connectionStatus === 'disconnected'
                        ? 'bg-red-500 shadow-lg shadow-red-500/50'
                        : 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                    }`}></div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('activeStatus')}</p>
                    <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                      {lastUpdate.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                      {secondsUntilUpdate}с
                    </span>
                  </div>
                </div>
                  <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                    <UserIcon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                  </div>
                </button>

                <ProfileDropdown 
                  isOpen={isProfileDropdownOpen}
                  onClose={() => setIsProfileDropdownOpen(false)}
                  anchorRef={profileButtonRef}
                />
              </div>

              {/* Выход */}
              <button
                onClick={async () => {
                  try {
                    // Очищаем все токены на клиенте
                    document.cookie = 'auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
                    document.cookie = 'auth-token-mobile=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
                    
                    // Очищаем localStorage
                    localStorage.removeItem('auth-token')
                    localStorage.removeItem('auth-token-mobile')
                    
                    // Затем отправляем запрос на сервер
                    await fetch('/api/courier/auth/logout', { method: 'POST' })
                    
                    // Перенаправляем на страницу логина
                    window.location.href = '/courier/login'
                  } catch {
                    // console.error('Ошибка при выходе')
                    // В любом случае перенаправляем на логин
                    window.location.href = '/courier/login'
                  }
                }}
                className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 rounded-lg sm:rounded-xl lg:rounded-2xl border-2 px-1.5 py-1.5 sm:px-2.5 sm:py-2 lg:px-5 lg:py-3 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:scale-105"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--card-bg)'
                }}
              >
                <ArrowRightOnRectangleIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                <span className="hidden lg:inline">{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

    </div>
  )
}

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OrdersProvider>
      <CourierLayoutWrapper>
        {children}
      </CourierLayoutWrapper>
    </OrdersProvider>
  )
}

function CourierLayoutWrapper({ 
  children
}: { 
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Для страницы логина не применяем тему - только языковой контекст
  if (pathname === '/courier/login') {
    return (
      <LanguageProvider>
        <CourierLayoutContent>
          {children}
        </CourierLayoutContent>
      </LanguageProvider>
    )
  }

  // Для остальных страниц применяем только язык
  return (
    <LanguageProvider>
      <CourierLayoutContent>
        {children}
      </CourierLayoutContent>
    </LanguageProvider>
  )
}
