import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

export async function POST() {
  const response = NextResponse.json<ApiResponse>({
    success: true,
    message: 'Успешный выход из системы'
  })

  // Удаляем все cookie с токенами
  response.cookies.delete('auth-token')
  response.cookies.delete('auth-token-mobile')

  return response
}


