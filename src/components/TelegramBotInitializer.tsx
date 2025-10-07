'use client'

import { useEffect } from 'react'

export default function TelegramBotInitializer() {
  useEffect(() => {
    // Только проверяем статус бота, не запускаем его
    const checkBotStatus = async () => {
      try {
        const response = await fetch('/api/telegram/auto-start', {
          method: 'GET'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.data?.isActive) {
            // console.log('✅ Telegram бот активен')
          } else {
            // console.log('ℹ️ Telegram бот не активен (запускается автоматически при старте сервера)')
          }
        }
      } catch (error) {
        console.error('❌ Ошибка проверки статуса Telegram бота:', error)
      }
    }

    // Проверяем статус через небольшую задержку
    const timer = setTimeout(checkBotStatus, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Компонент ничего не рендерит
  return null
}
