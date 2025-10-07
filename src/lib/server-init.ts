/**
 * Инициализация сервера - запуск Telegram бота при старте
 */

let isServerInitialized = false
let initializationPromise: Promise<void> | null = null

export async function initializeServer() {
  if (isServerInitialized) {
    return
  }

  // Если инициализация уже в процессе, ждем её завершения
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      // console.log('🚀 Инициализация сервера...')
      
      // Динамический импорт для совместимости с Turbopack
      const { startTelegramPolling, isTelegramPollingActive } = await import('./telegram-polling')
      
      // Проверяем, не запущен ли уже бот
      if (isTelegramPollingActive()) {
        // console.log('ℹ️ Telegram бот уже активен, пропускаем запуск')
        isServerInitialized = true
        return
      }
      
      // Запускаем Telegram бота при старте сервера
      // console.log('📱 Запуск Telegram бота...')
      await startTelegramPolling()
      
      isServerInitialized = true
      // console.log('✅ Сервер успешно инициализирован')
    } catch (error) {
      // console.error('❌ Ошибка инициализации сервера:', error)
      isServerInitialized = true // Помечаем как инициализированный, чтобы не повторять
    }
  })()

  return initializationPromise
}

// Автоматически вызываем инициализацию при импорте модуля
if (typeof window === 'undefined') {
  // Только на сервере
  initializeServer().catch(() => {})
}
