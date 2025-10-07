import { NextRequest, NextResponse } from 'next/server'
import { registerCourierInTelegram, findCourierByPhone } from '@/lib/telegram'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, phoneNumber }: { chatId: string, phoneNumber: string } = body

    console.log('API: Тестирование регистрации курьера...')
    console.log('Chat ID:', chatId)
    console.log('Phone Number:', phoneNumber)

    if (!chatId || !phoneNumber) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chat ID и номер телефона обязательны'
      }, { status: 400 })
    }

    // Сначала проверим, есть ли курьер с таким номером
    const courier = await findCourierByPhone(phoneNumber)
    
    if (!courier) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Курьер с номером ${phoneNumber} не найден в базе данных`,
        data: { phoneNumber }
      }, { status: 404 })
    }

    console.log('Найден курьер:', courier.fullname, courier.id)

    // Пытаемся зарегистрировать курьера
    const result = await registerCourierInTelegram(chatId, phoneNumber)

    return NextResponse.json<ApiResponse>({
      success: result.success,
      message: result.message,
      data: {
        courier: {
          id: courier.id,
          fullname: courier.fullname,
          phoneNumber: courier.phoneNumber
        },
        chatId,
        registrationSuccess: result.success,
        keyboard: result.keyboard
      }
    })
  } catch (error) {
    console.error('Test registration error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Ошибка при тестировании регистрации'
    }, { status: 500 })
  }
}
