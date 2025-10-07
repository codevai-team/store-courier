import { NextRequest, NextResponse } from 'next/server'
import { authenticateCourier, createToken } from '@/lib/auth'
import { getCourierChatId } from '@/lib/settings'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, password } = body

    if (!phoneNumber || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Номер телефона и пароль обязательны'
      }, { status: 400 })
    }

    const user = await authenticateCourier(phoneNumber, password)
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Неверный номер телефона или пароль'
      }, { status: 401 })
    }

    // Проверяем наличие COURIER_CHAT_ID для Telegram уведомлений
    const hasTelegramChatId = await getCourierChatId(user.id)
    // console.log(`Курьер ${user.fullname} (${user.id}): Telegram Chat ID ${hasTelegramChatId ? 'найден' : 'не найден'}`)

    const token = createToken({
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullname: user.fullname
    })

    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          id: user.id,
          fullname: user.fullname,
          phoneNumber: user.phoneNumber,
          role: user.role
        },
        hasTelegramNotifications: !!hasTelegramChatId
      },
      message: 'Успешная авторизация'
    })

    // Определяем, является ли запрос с мобильного устройства
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isProduction = process.env.NODE_ENV === 'production'
    const isHttps = request.url.startsWith('https://')
    
    // Для мобильных устройств в production с HTTPS используем 'none', иначе 'lax'
    const sameSitePolicy = (isProduction && isMobile && isHttps) ? 'none' : 'lax'
    const secureCookie = isProduction && isHttps
    
    // Устанавливаем cookie с токеном с учетом мобильных устройств
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: sameSitePolicy,
      maxAge: 7 * 24 * 60 * 60, // 7 дней
      path: '/' // Явно указываем путь
    })

    // Дополнительный cookie для мобильных устройств с более мягкими настройками
    if (isMobile) {
      response.cookies.set('auth-token-mobile', token, {
        httpOnly: false, // Не httpOnly для мобильных устройств
        secure: false, // Не secure для мобильных устройств
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 дней
        path: '/'
      })
      // console.log('Дополнительный мобильный cookie установлен')
    }

    // console.log('Login successful for courier:', user.fullname)
    // console.log('Token created:', token.substring(0, 20) + '...')
    // console.log('Cookie set with path: /')
    // console.log('Mobile device:', isMobile)
    // console.log('Production mode:', isProduction)
    // console.log('HTTPS:', isHttps)
    // console.log('SameSite policy:', sameSitePolicy)
    // console.log('Secure cookie:', secureCookie)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}

