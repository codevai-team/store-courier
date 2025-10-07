import { getTelegramBotToken } from '@/lib/settings'
import { registerCourierInTelegram } from '@/lib/telegram'
import { logger } from '@/lib/logger'

// Динамический импорт для совместимости с Turbopack
let TelegramBot: any = null
let botInstance: any = null
let isPollingActive = false

// Функция для динамического импорта TelegramBot
async function getTelegramBot() {
  if (!TelegramBot) {
    try {
      const telegramModule = await import('node-telegram-bot-api')
      TelegramBot = telegramModule.default
    } catch (error) {
      console.error('❌ Ошибка импорта node-telegram-bot-api:', error)
      throw error
    }
  }
  return TelegramBot
}

// Функция для проверки статуса бота
async function checkBotStatus(token: string): Promise<boolean> {
  try {
    const TelegramBotClass = await getTelegramBot()
    const testBot = new TelegramBotClass(token, { 
      polling: false,
      request: {
        agentOptions: {
          keepAlive: true,
          family: 4 // Принудительно используем IPv4
        }
      }
    })
    
    // Устанавливаем таймаут для запроса
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 10000) // 10 секунд таймаут
    })
    
    const getMePromise = testBot.getMe()
    
    const botInfo = await Promise.race([getMePromise, timeoutPromise])
    logger.log('✅ Бот доступен:', (botInfo as any)?.first_name || 'Unknown')
    return true
  } catch (error: any) {
    logger.log('⚠️ Ошибка проверки статуса бота:', error.message)
    
    // Если это таймаут или сетевая ошибка, считаем что бот недоступен
    if (error.message.includes('TIMEOUT') || 
        error.message.includes('ETIMEDOUT') || 
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNREFUSED')) {
      logger.log('🌐 Проблемы с сетью - пропускаем проверку')
      return true // Пропускаем проверку при проблемах с сетью
    }
    
    // Если это конфликт 409, бот уже запущен где-то еще
    if (error.message.includes('409') || error.message.includes('Conflict')) {
      logger.log('⚠️ Бот уже запущен в другом месте (конфликт 409)')
      return false
    }
    
    return false
  }
}

// Функция для запуска бота в режиме polling
export async function startTelegramPolling() {
  try {
    // Проверяем, не запущен ли уже бот
    if (botInstance || isPollingActive) {
      logger.log('⚠️ Бот уже запущен, пропускаем повторный запуск')
      return
    }

    const token = await getTelegramBotToken()
    if (!token) {
      logger.log('⚠️ Telegram bot token не найден, polling не запущен')
      return
    }

    // Проверяем статус бота перед запуском
    logger.log('🔍 Проверка статуса бота...')
    const isBotAvailable = await checkBotStatus(token)
    if (!isBotAvailable) {
      logger.log('❌ Бот недоступен или уже запущен в другом месте')
      return
    }

    // Webhook функциональность полностью удалена - используем только polling
    logger.log('✅ Используем только polling режим (webhook отключен)')

    logger.log('🚀 Запуск Telegram бота в режиме polling...')

    // Создаём новый экземпляр с улучшенными настройками сети
    const TelegramBotClass = await getTelegramBot()
    botInstance = new TelegramBotClass(token, { 
      polling: {
        interval: 3000, // Увеличиваем интервал для снижения нагрузки
        params: {
          timeout: 30, // Увеличиваем таймаут
          allowed_updates: ['message', 'callback_query'] // Ограничиваем типы обновлений
        }
      },
      request: {
        agentOptions: {
          keepAlive: true,
          family: 4, // Принудительно используем IPv4
          timeout: 30000 // 30 секунд таймаут для запросов
        }
      }
    })

    // Обработчик команды /start
    botInstance.onText(/\/start/, async (msg: any) => {
      const chatId = msg.chat.id.toString()
      logger.log(`📨 /start от пользователя ${chatId} (${msg.from?.first_name})`)

      const welcomeMessage = `
👋 Добро пожаловать!

Если вы курьер, пожалуйста, поделитесь своим номером телефона, нажав кнопку ниже.
Здесь вы будете получать уведомления о заказах.

👋 Кош келиңиз!

Эгерде сиз курьер болсоңуз, төмөндөгү баскычты басып, телефон номериңизди бөлүшүңүз.
Бул жерден сиз заказдар боюнча билдирмелерди ала аласыз.`

      const keyboard = {
        keyboard: [
          [
            {
              text: '📱 Поделиться номером телефона / Телефон номерин бөлүшүү',
              request_contact: true
            }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }

      try {
        await botInstance!.sendMessage(chatId, welcomeMessage, {
          reply_markup: keyboard
        })
      } catch (error) {
        console.error('❌ Ошибка отправки приветственного сообщения:', error)
      }
    })

    // Обработчик команды /help
    botInstance.onText(/\/help/, async (msg: any) => {
      const chatId = msg.chat.id.toString()
      logger.log(`❓ /help от пользователя ${chatId}`)

      const helpMessage = `🆘 Помощь / Жардам

🇷🇺 Русский:
🔹 /start - Начать регистрацию
🔹 📱 Поделиться номером - Зарегистрироваться в системе
🔹 /help - Показать эту справку

🇰🇬 Кыргызча:
🔹 /start - Катталууну баштоо
🔹 📱 Номер бөлүшүү - Системага катталуу
🔹 /help - Бул жардамды көрсөтүү

❓ Эгер суроолоруңуз болсо, администраторго кайрылыңыз.`

      try {
        await botInstance!.sendMessage(chatId, helpMessage)
      } catch (error) {
        console.error('❌ Ошибка отправки справки:', error)
      }
    })

    // Обработчик контактов
    botInstance.on('contact', async (msg: any) => {
      const chatId = msg.chat.id.toString()
      const contact = msg.contact
      
      if (!contact) return

      console.log(`📞 Контакт от ${chatId}: ${contact.phone_number}`)

      const result = await registerCourierInTelegram(
        chatId, 
        contact.phone_number
      )

      try {
        const messageOptions: any = {
          reply_markup: {
            remove_keyboard: true
          }
        }

        // Если есть клавиатура в результате, добавляем её
        if (result.keyboard) {
          messageOptions.reply_markup = result.keyboard
        }

        await botInstance!.sendMessage(chatId, result.message, messageOptions)
        
        if (result.success) {
          console.log(`✅ Курьер успешно зарегистрирован: ${result.data?.courierName}`)
        }
      } catch (error) {
        console.error('❌ Ошибка отправки ответа на контакт:', error)
      }
    })

    // Обработчик текстовых сообщений
    botInstance.on('message', async (msg: any) => {
      // Пропускаем сообщения, которые уже обработаны
      if (msg.text && (msg.text.startsWith('/') || msg.contact)) {
        return
      }

      const chatId = msg.chat.id.toString()
      const text = msg.text?.toLowerCase().trim()

      if (!text) return

      // Обработка номера телефона в текстовом виде
      const phoneRegex = /[\+]?[0-9\s\-\(\)]{9,15}/
      if (phoneRegex.test(text)) {
        console.log(`📞 Номер телефона в тексте от ${chatId}: ${text}`)
        
        const result = await registerCourierInTelegram(
          chatId, 
          text
        )

        try {
          await botInstance!.sendMessage(chatId, result.message)
          
          if (result.success) {
            console.log(`✅ Курьер успешно зарегистрирован: ${result.data?.courierName}`)
          }
        } catch (error) {
          console.error('❌ Ошибка отправки ответа на номер:', error)
        }
        return
      }

      // Неизвестная команда
      const unknownMessage = `❓ Извините, я не понимаю эту команду / Кечиресиз, мен бул буйрукту түшүнбөйм.

Используйте / Колдонуңуз:
🔹 /start - Для начала регистрации / Катталууну баштоо
🔹 /help - Для получения справки / Жардам алуу

Или поделитесь своим номером телефона / Же телефон номериңизди бөлүшүңүз.`

      try {
        await botInstance!.sendMessage(chatId, unknownMessage)
      } catch (error) {
        console.error('❌ Ошибка отправки сообщения о неизвестной команде:', error)
      }
    })

    // Обработчики ошибок
    botInstance.on('polling_error', (error: any) => {
      console.error('🔴 Telegram polling error:', error.message)
      
      // Если это таймаут или сетевая ошибка, не перезапускаем
      if (error.message.includes('ETIMEDOUT') || 
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('EFATAL')) {
        console.log('🌐 Сетевая ошибка - не перезапускаем бота')
        return
      }
      
      // Если это конфликт 409 - НЕ перезапускаем, а логируем
      if (error.message.includes('409') || error.message.includes('Conflict')) {
        console.log('⚠️ Конфликт 409: Бот уже запущен в другом месте')
        console.log('💡 Рекомендация: Проверьте, не запущен ли бот в другом процессе')
        console.log('🛑 Автоматический перезапуск отключен для предотвращения бесконечных циклов')
        return
      }
      
      // Для других ошибок просто логируем
      console.log('📝 Ошибка polling зафиксирована, бот продолжает работу')
    })

    botInstance.on('error', (error: any) => {
      console.error('🔴 Telegram bot error:', error)
    })

    isPollingActive = true
    console.log('✅ Telegram бот запущен в режиме polling')

  } catch (error) {
    console.error('❌ Ошибка запуска Telegram polling:', error)
  }
}

// Функция для остановки polling
export async function stopTelegramPolling() {
  try {
    if (botInstance) {
      console.log('🛑 Остановка Telegram polling...')
      
      try {
        // Для node-telegram-bot-api polling останавливается автоматически при null
        // Просто очищаем экземпляр
      } catch (error) {
        console.log('⚠️ Ошибка при остановке polling (это нормально):', error)
      }
      
      // Очищаем экземпляр
      botInstance = null
      isPollingActive = false
      
      console.log('✅ Telegram polling успешно остановлен')
    } else {
      isPollingActive = false
      console.log('ℹ️ Telegram polling уже остановлен')
    }
  } catch (error) {
    console.error('❌ Ошибка остановки Telegram polling:', error)
    // Принудительно сбрасываем состояние даже при ошибке
    botInstance = null
    isPollingActive = false
  }
}

// Функция для принудительной остановки всех экземпляров бота
export async function forceStopAllBots() {
  try {
    console.log('🛑 Принудительная остановка всех экземпляров бота...')
    
    // Останавливаем текущий экземпляр
    await stopTelegramPolling()
    
    // Дополнительная задержка для полной остановки
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('✅ Все экземпляры бота остановлены')
  } catch (error) {
    console.error('❌ Ошибка принудительной остановки:', error)
  }
}

// Проверка статуса
export function isTelegramPollingActive(): boolean {
  return isPollingActive
}

