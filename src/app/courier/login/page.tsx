'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TokenChecker from '@/components/TokenChecker'

export default function CourierLoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/courier/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, password })
      })

      const data = await response.json()

      if (data.success) {
        // console.log('Авторизация успешна, перенаправление...')
        // console.log('Response data:', data)
        
        // Передаем информацию о наличии Telegram уведомлений через query параметр
        const hasTelegramNotifications = data.data?.hasTelegramNotifications
        const queryParam = hasTelegramNotifications === false ? '?noTelegram=true' : ''
        
        // Определяем, является ли устройство мобильным
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        // console.log('Устройство мобильное:', isMobile)
        
        if (isMobile) {
          // Для мобильных устройств используем более надежный способ
          // console.log('Мобильное устройство - используем специальное перенаправление')
          
          // Сохраняем токен в localStorage как fallback для мобильных устройств
          try {
            localStorage.setItem('auth-token-backup', data.data?.user?.id || '')
            // console.log('Токен сохранен в localStorage как backup')
          } catch (e) {
            // console.log('Не удалось сохранить в localStorage:', e)
          }
          
          // Сначала пробуем через роутер
          router.push(`/courier/dashboard${queryParam}`)
          
          // Если через 200мс не сработало, принудительно через window.location
          setTimeout(() => {
            // console.log('Принудительное перенаправление для мобильного устройства...')
            window.location.replace(`/courier/dashboard${queryParam}`)
          }, 200)
          
          // Последняя попытка через window.location.href
          setTimeout(() => {
            // console.log('Последняя попытка перенаправления...')
            window.location.href = `/courier/dashboard${queryParam}`
          }, 1000)
        } else {
          // Для десктопа используем стандартный способ
          // console.log('Десктопное устройство - стандартное перенаправление')
          setTimeout(() => {
            // console.log('Перенаправление на dashboard...')
            window.location.href = `/courier/dashboard${queryParam}`
          }, 100)
        }
      } else {
        setError(data.error || 'Ошибка входа')
      }
    } catch (error) {
      setError('Ошибка подключения к серверу')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#1a1f2e' }}>
      <TokenChecker />
      {/* Декоративные элементы фона */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-white/3 rounded-full blur-2xl"></div>
      </div>
      
      {/* Основной контент */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md animate-fadeIn">
          
          {/* Форма входа */}
          <div className="glass-effect rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20">
            {/* Логотип внутри формы */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
            </div>

            {/* Заголовок внутри формы */}
            <div className="text-center mb-8">
              <h1 className="text-3xl mb-2 text-white drop-shadow-2xl tracking-tight">
                StoreCourier
              </h1>
              <p className="text-base text-white/70">
                Система управления доставкой
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Ошибки */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Поле номера телефона */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm mb-3 text-white">
                  Номер телефона
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+996555123456"
                    required
                    className="w-full pl-14 pr-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 bg-gray-700 text-white text-base placeholder-gray-400"
                    style={{ 
                      borderColor: '#4b5563',
                    }}
                  />
                </div>
              </div>

              {/* Поле пароля */}
              <div>
                <label htmlFor="password" className="block text-sm mb-3 text-white">
                  Пароль
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    required
                    className="w-full pl-14 pr-14 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 bg-gray-700 text-white text-base placeholder-gray-400"
                    style={{ 
                      borderColor: '#4b5563',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Кнопка входа */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-lg py-5 px-4 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group shadow-lg hover:shadow-xl hover:scale-[1.02]"
                style={{
                  backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Вход в систему...
                    </>
                  ) : (
                    <>
                      Войти в систему
                      <svg className="w-6 h-6 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </button>
            </form>

            {/* Футер формы */}
            <div className="mt-6 text-center">
              <p className="text-sm text-white/70">
                Нужна помощь? Обратитесь к администратору
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
