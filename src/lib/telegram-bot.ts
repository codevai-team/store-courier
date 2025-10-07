import { getTelegramBotToken } from '@/lib/settings'

// Кэш для бота, чтобы не создавать новый экземпляр каждый раз
let botInstance: any = null

// Функция для динамического импорта TelegramBot
async function getTelegramBot() {
  try {
    const telegramModule = await import('node-telegram-bot-api')
    return telegramModule.default
  } catch (error) {
    console.error('❌ Ошибка импорта node-telegram-bot-api:', error)
    throw error
  }
}

// Функция для получения экземпляра бота
export async function getBot(): Promise<any | null> {
  try {
    if (botInstance) {
      return botInstance
    }

    const token = await getTelegramBotToken()
    if (!token) {
      console.error('Telegram bot token не найден')
      return null
    }

    const TelegramBotClass = await getTelegramBot()
    botInstance = new TelegramBotClass(token, { 
      polling: false,
      request: {
        timeout: 5000 // 5 секунд таймаут
      }
    })

    return botInstance
  } catch (error) {
    console.error('Ошибка создания экземпляра бота:', error)
    return null
  }
}
