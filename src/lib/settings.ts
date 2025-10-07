import { prisma } from '@/lib/prisma'

// Функция для получения настройки по ключу
export async function getSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key }
    })
    return setting?.value || null
  } catch (error) {
    console.error(`Ошибка получения настройки ${key}:`, error)
    return null
  }
}

// Функция для установки настройки
export async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
    return true
  } catch (error) {
    console.error(`Ошибка установки настройки ${key}:`, error)
    return false
  }
}

// Функция для получения токена Telegram бота
export async function getTelegramBotToken(): Promise<string | null> {
  // Получаем токен только из базы данных
  return await getSetting('COURIER_BOT_TOKEN')
}

// Функция для получения chat_id курьеров
export async function getCourierChatIds(): Promise<Record<string, string>> {
  try {
    const chatIdsJson = await getSetting('COURIER_CHAT_ID')
    if (!chatIdsJson) {
      return {}
    }
    
    return JSON.parse(chatIdsJson)
  } catch (error) {
    console.error('Ошибка парсинга COURIER_CHAT_ID:', error)
    return {}
  }
}

// Функция для добавления/обновления chat_id курьера
export async function setCourierChatId(courierId: string, chatId: string): Promise<boolean> {
  try {
    const currentChatIds = await getCourierChatIds()
    currentChatIds[courierId] = chatId
    
    const success = await setSetting('COURIER_CHAT_ID', JSON.stringify(currentChatIds))
    console.log(`Chat ID для курьера ${courierId} ${success ? 'сохранен' : 'не удалось сохранить'}:`, chatId)
    
    return success
  } catch (error) {
    console.error(`Ошибка установки chat_id для курьера ${courierId}:`, error)
    return false
  }
}

// Функция для получения chat_id конкретного курьера
export async function getCourierChatId(courierId: string): Promise<string | null> {
  const chatIds = await getCourierChatIds()
  return chatIds[courierId] || null
}

// Функция для удаления chat_id курьера
export async function removeCourierChatId(courierId: string): Promise<boolean> {
  try {
    const currentChatIds = await getCourierChatIds()
    delete currentChatIds[courierId]
    
    return await setSetting('COURIER_CHAT_ID', JSON.stringify(currentChatIds))
  } catch (error) {
    console.error(`Ошибка удаления chat_id для курьера ${courierId}:`, error)
    return false
  }
}
