import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenSimple } from '@/lib/jwt-simple'

export function middleware(request: NextRequest) {
  // console.log('Middleware: Проверка маршрута:', request.nextUrl.pathname)
  
  // Определяем, является ли запрос с мобильного устройства
  const userAgent = request.headers.get('user-agent') || ''
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  // console.log('Middleware: Мобильное устройство:', isMobile)
  
  // Проверяем только маршруты курьеров (кроме страницы логина)
  if (request.nextUrl.pathname.startsWith('/courier') && 
      !request.nextUrl.pathname.startsWith('/courier/login')) {
    
    const token = request.cookies.get('auth-token')?.value
    const mobileToken = request.cookies.get('auth-token-mobile')?.value
    const finalToken = token || mobileToken // Используем любой доступный токен
    
    // console.log('Middleware: Токен найден:', !!token, token ? `Длина: ${token.length}` : 'Токен отсутствует')
    // console.log('Middleware: Мобильный токен найден:', !!mobileToken, mobileToken ? `Длина: ${mobileToken.length}` : 'Мобильный токен отсутствует')
    // console.log('Middleware: Финальный токен:', !!finalToken, finalToken ? `Длина: ${finalToken.length}` : 'Финальный токен отсутствует')
    // console.log('Middleware: Все cookies:', request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`))
    // console.log('Middleware: Cookie auth-token:', request.cookies.get('auth-token'))
    // console.log('Middleware: Cookie auth-token-mobile:', request.cookies.get('auth-token-mobile'))

    if (!finalToken) {
      // console.log('Middleware: Токен отсутствует, перенаправление на логин')
      // console.log('Middleware: Проверяем возможные причины отсутствия токена')
      
      const response = NextResponse.redirect(new URL('/courier/login', request.url))
      
      // Для мобильных устройств добавляем специальные заголовки
      if (isMobile) {
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        // console.log('Middleware: Добавлены специальные заголовки для мобильного устройства')
      }
      
      return response
    }

    // Проверяем действительность токена
    if (finalToken) {
      const user = verifyTokenSimple(finalToken)
      if (!user) {
        // Токен недействителен, удаляем его и перенаправляем на логин
        const response = NextResponse.redirect(new URL('/courier/login', request.url))
        response.cookies.delete('auth-token')
        response.cookies.delete('auth-token-mobile')
        
        // Для мобильных устройств добавляем специальные заголовки
        if (isMobile) {
          response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
          response.headers.set('Pragma', 'no-cache')
          response.headers.set('Expires', '0')
        }
        
        return response
      }
    }
    
    // console.log('Middleware: Токен действителен, разрешаем доступ')
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/courier/:path*']
}
