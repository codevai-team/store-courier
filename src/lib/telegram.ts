import type { OrderWithDetails, TelegramRegistrationResult } from '@/types'
import { getCourierChatId, setCourierChatId } from '@/lib/settings'
import { prisma } from '@/lib/prisma'
import { getBot } from '@/lib/telegram-bot'


// Функция для проверки, можно ли использовать URL в Telegram inline keyboard
function isValidTelegramUrl(url: string): boolean {
  // Telegram не поддерживает localhost, 127.0.0.1, 192.168.x.x и другие локальные адреса
  const invalidPatterns = [
    /localhost/i,
    /127\.0\.0\.1/,
    /192\.168\./,
    /10\.\d+\.\d+\.\d+/,
    /172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^http:\/\/(?!.*\.)/  // HTTP без домена
  ]
  
  return !invalidPatterns.some(pattern => pattern.test(url))
}

// Функция для проверки длины сообщения
function checkMessageLength(message: string, keyboard?: object): boolean {
  const messageLength = message.length
  const keyboardLength = keyboard ? JSON.stringify(keyboard).length : 0
  const totalLength = messageLength + keyboardLength
  
  // // console.log(`Telegram: Длина сообщения: ${messageLength} символов`)
  // // console.log(`Telegram: Длина клавиатуры: ${keyboardLength} символов`)
  // // console.log(`Telegram: Общая длина: ${totalLength} символов`)
  
  if (totalLength > 4096) {
    // // console.warn('⚠️ Telegram: Превышен лимит 4096 символов!')
    return false
  }
  
  return true
}

// Функция для отправки уведомления о новом заказе всем курьерам
export async function sendNewOrderNotification(order: OrderWithDetails) {
  try {
    // console.log('Telegram: Начинаем отправку уведомления о новом заказе:', order.id)
    
    const bot = await getBot()
    if (!bot) {
      // console.error('Telegram: Не удалось получить экземпляр бота')
      return
    }

    // Получаем всех активных курьеров
    const couriers = await prisma.user.findMany({
      where: {
        role: 'COURIER'
      }
    })

    // console.log('Telegram: Найдено курьеров:', couriers.length)
    
    // Формируем сообщение
    const message = `🆕 *Новый заказ!*
    
📋 *Заказ #${order.id.slice(-8)}*
📍 *Адрес:* ${order.deliveryAddress}
💰 *Сумма:* ${order.orderItems.reduce((sum, item) => sum + Number(item.price) * item.amount, 0).toFixed(2)} сом
📅 *Дата:* ${new Date(order.createdAt).toLocaleString('ru-RU')}

${order.customerComment ? `💬 *Комментарий:* ${order.customerComment}` : ''}

*Товары:*
${order.orderItems.map(item => 
  `• ${item.product.name} (${item.amount} шт.) - ${(Number(item.price) * item.amount).toFixed(2)} сом`
).join('\n')}`

    // console.log('Telegram: Отправляем сообщение курьерам...')
    
    // Создаем клавиатуру только если URL валидный для Telegram
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const isUrlValid = isValidTelegramUrl(baseUrl)
    
    let keyboard = null
    if (isUrlValid) {
      keyboard = {
        inline_keyboard: [
          [
            {
              text: '📋 Посмотреть заказ',
              url: `${baseUrl}/courier/dashboard?order=${order.id}`
            }
          ]
        ]
      }
      // console.log(`Telegram: Клавиатура с URL создана: ${baseUrl}`)
    } else {
      // console.log(`⚠️ Telegram: URL "${baseUrl}" не поддерживается Telegram. Отправляем без кнопок.`)
    }
    
    // Отправляем уведомления всем курьерам
    let _successCount = 0
    let _errorCount = 0

    for (const courier of couriers) {
      try {
        const chatId = await getCourierChatId(courier.id)
        if (!chatId) {
          // console.log(`Telegram: Chat ID не найден для курьера ${courier.fullname} (${courier.id})`)
          continue
        }

        // Проверяем длину сообщения и отправляем
        if (!keyboard || !checkMessageLength(message, keyboard)) {
          // Отправляем без кнопки
          const sendMessagePromise = bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown'
          })
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Telegram API timeout')), 10000)
          })
          
          await Promise.race([sendMessagePromise, timeoutPromise])
        } else {
          // Отправляем с кнопкой
          const sendMessagePromise = bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          })
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Telegram API timeout')), 10000)
          })
          
          await Promise.race([sendMessagePromise, timeoutPromise])
        }

        // console.log(`Telegram: Уведомление отправлено курьеру ${courier.fullname}`)
        _successCount++
      } catch (_courierError) { // eslint-disable-line @typescript-eslint/no-unused-vars
        // console.error(`Telegram: Ошибка отправки курьеру ${courier.fullname}:`, _courierError)
        _errorCount++
      }
    }

    // console.log(`Telegram: Уведомление отправлено для заказа ${order.id}. Успешно: ${successCount}, Ошибок: ${errorCount}`)
  } catch (error) {
    // console.error('Ошибка отправки Telegram уведомления:', error)
    
    // Не пробрасываем ошибку дальше, чтобы не прерывать основной процесс
    // Просто логируем ошибку
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        // console.log('Telegram: Таймаут при отправке уведомления')
      } else if (error.message.includes('ETELEGRAM')) {
        // console.log('Telegram: Ошибка API Telegram')
      }
    }
  }
}

// Функция для отправки уведомления об изменении статуса заказа конкретному курьеру
export async function sendOrderStatusUpdateNotification(order: OrderWithDetails, oldStatus: string) {
  try {
    const bot = await getBot()
    if (!bot) {
      // console.error('Telegram: Не удалось получить экземпляр бота')
      return
    }

    // Если у заказа нет назначенного курьера, не отправляем уведомление
    if (!order.courierId) {
      // console.log('Telegram: У заказа нет назначенного курьера, уведомление не отправляется')
      return
    }

    const chatId = await getCourierChatId(order.courierId)
    if (!chatId) {
      // console.log(`Telegram: Chat ID не найден для курьера ${order.courierId} (${order.courier?.fullname || 'Неизвестный курьер'})`)
      // console.log('Telegram: Курьер должен зарегистрироваться в боте через команду /start')
      return
    }
    
    const statusLabels = {
      'CREATED': 'Создан',
      'COURIER_WAIT': 'Ожидает курьера',
      'COURIER_PICKED': 'Принят курьером',
      'ENROUTE': 'В пути',
      'DELIVERED': 'Доставлен',
      'CANCELED': 'Отменен'
    }

    // Специальное сообщение для принятия заказа курьером
    if (oldStatus === 'COURIER_WAIT' && order.status === 'COURIER_PICKED') {
      const message = `✅ *Вы взяли заказ #${order.id.slice(-8)}*

📍 *Адрес:* ${order.deliveryAddress}
👤 *Клиент:* ${order.customerName}
📞 *Телефон:* ${order.customerPhone}

${order.customerComment ? `💬 *Комментарий:* ${order.customerComment}` : ''}

🚚 *Курьер:* ${order.courier ? order.courier.fullname : 'Не назначен'}`
      
      // Создаем клавиатуру только если URL валидный
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const isUrlValid = isValidTelegramUrl(baseUrl)
      
      let keyboard = null
      if (isUrlValid) {
        keyboard = {
          inline_keyboard: [
            [
              {
                text: '📦 Мои заказы',
                url: `${baseUrl}/courier/dashboard?tab=my`
              }
            ]
          ]
        }
      }
      
      // Проверяем длину сообщения и отправляем
      try {
        if (!keyboard || !checkMessageLength(message, keyboard)) {
          await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown'
          })
          // console.log(`Telegram: Уведомление отправлено курьеру ${order.courier?.fullname} (${chatId})`)
          return
        }
        
        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        })
        // console.log(`Telegram: Уведомление с кнопкой отправлено курьеру ${order.courier?.fullname} (${chatId})`)
        return
      } catch (error: any) {
        // console.error(`Telegram: Ошибка отправки уведомления курьеру ${order.courier?.fullname} (${chatId}):`, error.message)
        if (error.message.includes('chat not found')) {
          // console.log(`Telegram: Chat ID ${chatId} не найден. Курьер должен зарегистрироваться в боте.`)
        }
        return
      }
    }

    // Определяем эмодзи для статуса
    const _getStatusEmoji = (status: string) => {
      switch (status) {
        case 'ENROUTE': return '🚚'
        case 'DELIVERED': return '✅'
        case 'CANCELED': return '❌'
        default: return '🔄'
      }
    }

    let message = ''
    
    // Разные сообщения для разных статусов
    if (order.status === 'ENROUTE') {
      message = `🚚 *Заказ #${order.id.slice(-8)} в пути*

📍 *Адрес:* ${order.deliveryAddress}
👤 *Клиент:* ${order.customerName}
📞 *Телефон:* ${order.customerPhone}

${order.customerComment ? `💬 *Комментарий:* ${order.customerComment}` : ''}

🚚 *Курьер:* ${order.courier ? order.courier.fullname : 'Не назначен'}`
    } else if (order.status === 'DELIVERED') {
      message = `✅ *Заказ #${order.id.slice(-8)} доставлен*

📍 *Адрес:* ${order.deliveryAddress}
👤 *Клиент:* ${order.customerName}

🚚 *Курьер:* ${order.courier ? order.courier.fullname : 'Не назначен'}`
    } else if (order.status === 'CANCELED') {
      message = `❌ *Заказ #${order.id.slice(-8)} отменен*

📍 *Адрес:* ${order.deliveryAddress}
${order.cancelComment ? `💬 *Причина отмены:* ${order.cancelComment}` : ''}

🚚 *Курьер:* ${order.courier ? order.courier.fullname : 'Не назначен'}`
    } else {
      // Обычное сообщение для других статусов
      message = `🔄 *Обновление заказа #${order.id.slice(-8)}*

Статус изменен: *${statusLabels[oldStatus as keyof typeof statusLabels]}* → *${statusLabels[order.status as keyof typeof statusLabels]}*

📍 *Адрес:* ${order.deliveryAddress}

${order.courier ? `🚚 *Курьер:* ${order.courier.fullname}` : ''}`
    }

    // Создаем клавиатуру для активных заказов только если URL валидный
    let keyboard = null
    if (order.status === 'ENROUTE') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const isUrlValid = isValidTelegramUrl(baseUrl)
      
      if (isUrlValid) {
        keyboard = {
          inline_keyboard: [
            [
              {
                text: '📦 Мои заказы',
                url: `${baseUrl}/courier/dashboard?tab=my`
              }
            ]
          ]
        }
      }
    }

    // Проверяем длину сообщения и отправляем
    try {
      if (!keyboard || !checkMessageLength(message, keyboard)) {
        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown'
        })
        // console.log(`Telegram: Уведомление об обновлении статуса отправлено курьеру ${order.courier?.fullname} (${chatId})`)
        return
      }

      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
      // console.log(`Telegram: Уведомление об обновлении статуса с кнопкой отправлено курьеру ${order.courier?.fullname} (${chatId})`)
    } catch (error: any) {
      // console.error(`Telegram: Ошибка отправки уведомления об обновлении статуса курьеру ${order.courier?.fullname} (${chatId}):`, error.message)
      if (error.message.includes('chat not found')) {
        // console.log(`Telegram: Chat ID ${chatId} не найден. Курьер должен зарегистрироваться в боте.`)
      }
      return
    }
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // console.error('Ошибка отправки Telegram уведомления об обновлении статуса:', _error)
  }
}

// Функция для тестирования бота
export async function testTelegramBot() {
  // console.log('Telegram: Начинаем тестирование бота...')
  
  const bot = await getBot()
  if (!bot) {
    throw new Error('Не удалось получить экземпляр бота')
  }

  // Получаем всех курьеров с chat_id
  const couriers = await prisma.user.findMany({
    where: {
      role: 'COURIER'
    }
  })

  // console.log('Telegram: Найдено курьеров:', couriers.length)
  
  let _successCount = 0
  let _errorCount = 0

  for (const courier of couriers) {
    try {
      const chatId = await getCourierChatId(courier.id)
      if (!chatId) {
        // console.log(`Telegram: Chat ID не найден для курьера ${courier.fullname}`)
        continue
      }

      // console.log(`Telegram: Отправляем тестовое сообщение курьеру ${courier.fullname}...`)
      
      // Создаем Promise с таймаутом для тестового сообщения
      const sendMessagePromise = bot.sendMessage(chatId, `🤖 Привет, ${courier.fullname}! Telegram бот работает! Уведомления о заказах активированы.`)
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Telegram API timeout')), 10000)
      })
      
      // Отправляем сообщение с таймаутом
      await Promise.race([sendMessagePromise, timeoutPromise])
      
      // console.log(`✅ Тестовое сообщение отправлено курьеру ${courier.fullname}`)
      _successCount++
    } catch (_courierError) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // console.error(`❌ Ошибка отправки курьеру ${courier.fullname}:`, _courierError)
      _errorCount++
    }
  }
  
  // console.log(`Тестирование завершено. Успешно: ${_successCount}, Ошибок: ${_errorCount}`)
  
  if (_successCount === 0) {
    throw new Error('Не удалось отправить тестовое сообщение ни одному курьеру')
  }
}

// Функция для поиска курьера по номеру телефона
export async function findCourierByPhone(phoneNumber: string) {
  try {
    // Нормализуем номер телефона (убираем пробелы, дефисы, плюсы)
    const normalizedPhone = phoneNumber.replace(/[\s\-+()]/g, '')
    
    const courier = await prisma.user.findFirst({
      where: {
        role: 'COURIER',
        OR: [
          { phoneNumber: phoneNumber },
          { phoneNumber: normalizedPhone },
          { phoneNumber: `+${normalizedPhone}` },
          { phoneNumber: `+996${normalizedPhone.slice(-9)}` }, // Для кыргызских номеров
        ]
      }
    })

    return courier
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // console.error('Ошибка поиска курьера по номеру телефона:', _error)
    return null
  }
}

// Функция для обработки регистрации курьера в Telegram
export async function registerCourierInTelegram(chatId: string, phoneNumber: string): Promise<TelegramRegistrationResult> {
  try {
    // console.log(`Telegram: Попытка регистрации курьера. Chat ID: ${chatId}, Phone: ${phoneNumber}`)
    
    // Ищем курьера по номеру телефона
    const courier = await findCourierByPhone(phoneNumber)
    
    if (!courier) {
      // console.log(`Telegram: Курьер с номером ${phoneNumber} не найден в базе данных`)
      return {
        success: false,
        message: `❌ Курьер с номером ${phoneNumber} не найден в системе. Обратитесь к администратору.`
      }
    }

    // console.log(`Telegram: Найден курьер: ${courier.fullname} (ID: ${courier.id})`)

    // Проверяем, не зарегистрирован ли уже этот курьер
    const existingChatId = await getCourierChatId(courier.id)
    if (existingChatId && existingChatId === chatId) {
      // console.log(`Telegram: Курьер ${courier.fullname} уже зарегистрирован с этим Chat ID: ${existingChatId}`)
      return {
        success: true,
        message: `✅ Вы уже зарегистрированы в системе, ${courier.fullname}! Ожидайте уведомления о новых заказах.`
      }
    }

    // Сохраняем courierID и chatID в JSON формате
    const success = await setCourierChatId(courier.id, chatId)
    
    if (success) {
      // console.log(`Telegram: Курьер ${courier.fullname} (ID: ${courier.id}) успешно зарегистрирован с Chat ID: ${chatId}`)
      return {
        success: true,
        message: `✅ Добро пожаловать, ${courier.fullname}! 

Вы успешно зарегистрированы в системе уведомлений. Теперь вы будете получать уведомления о новых заказах.

💻 Для просмотра всех заказов и управления ими используйте веб-сайт:`,
        data: {
          courierId: courier.id,
          courierName: courier.fullname,
          chatId: chatId
        },
        keyboard: {
          inline_keyboard: [[
            {
              text: '🌐 Войти на сайт',
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/courier/login`
            }
          ]]
        }
      }
    } else {
      // console.error(`Telegram: Ошибка сохранения Chat ID для курьера ${courier.fullname}`)
      return {
        success: false,
        message: `❌ Произошла ошибка при регистрации. Попробуйте позже или обратитесь к администратору.`
      }
    }
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // console.error('Ошибка регистрации курьера в Telegram:', _error)
    return {
      success: false,
      message: `❌ Произошла ошибка при регистрации. Попробуйте позже или обратитесь к администратору.`
    }
  }
}
