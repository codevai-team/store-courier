'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TokenChecker() {
  const router = useRouter()

  useEffect(() => {
    // Проверяем токены при загрузке страницы
    const checkTokens = () => {
      const authToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]
      
      const mobileToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token-mobile='))
        ?.split('=')[1]

      const localStorageToken = localStorage.getItem('auth-token')

      // Если есть токены, но мы на странице логина, очищаем их
      if ((authToken || mobileToken || localStorageToken) && window.location.pathname === '/courier/login') {
        // Очищаем все токены
        document.cookie = 'auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        document.cookie = 'auth-token-mobile=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        localStorage.removeItem('auth-token')
        localStorage.removeItem('auth-token-mobile')
        
        // Перезагружаем страницу для очистки состояния
        window.location.reload()
      }
    }

    // Проверяем токены через небольшую задержку
    const timer = setTimeout(checkTokens, 100)

    return () => clearTimeout(timer)
  }, [router])

  return null
}
