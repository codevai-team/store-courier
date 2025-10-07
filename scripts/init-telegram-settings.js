const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initTelegramSettings() {
  try {
    console.log('🔧 Инициализация настроек Telegram...')

    // Проверяем, есть ли уже настройки
    const existingToken = await prisma.setting.findUnique({
      where: { key: 'COURIER_BOT_TOKEN' }
    })

    const existingChatIds = await prisma.setting.findUnique({
      where: { key: 'COURIER_CHAT_ID' }
    })

    if (!existingToken) {
      await prisma.setting.create({
        data: {
          key: 'COURIER_BOT_TOKEN',
          value: ''
        }
      })
      console.log('✅ Создана запись для COURIER_BOT_TOKEN')
    } else {
      console.log('ℹ️  COURIER_BOT_TOKEN уже существует')
    }

    if (!existingChatIds) {
      await prisma.setting.create({
        data: {
          key: 'COURIER_CHAT_ID',
          value: '{}'
        }
      })
      console.log('✅ Создана запись для COURIER_CHAT_ID')
    } else {
      console.log('ℹ️  COURIER_CHAT_ID уже существует')
    }

    // Показываем текущие настройки
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['COURIER_BOT_TOKEN', 'COURIER_CHAT_ID']
        }
      }
    })

    console.log('\n📋 Текущие настройки Telegram:')
    settings.forEach(setting => {
      if (setting.key === 'COURIER_BOT_TOKEN') {
        console.log(`  ${setting.key}: ${setting.value ? `${setting.value.slice(0, 10)}...` : 'не установлен'}`)
      } else {
        console.log(`  ${setting.key}: ${setting.value}`)
      }
    })

    console.log('\n🎉 Инициализация завершена!')
    console.log('\n📝 Следующие шаги:')
    console.log('1. Создайте бота через @BotFather в Telegram')
    console.log('2. Сохраните токен через API: POST /api/telegram/settings')
    console.log('3. Установите webhook: POST /api/telegram/setup-webhook')
    console.log('4. Протестируйте бота: POST /api/test/telegram')

  } catch (error) {
    console.error('❌ Ошибка инициализации:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск скрипта
initTelegramSettings()
