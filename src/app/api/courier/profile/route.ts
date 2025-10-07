import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Токен авторизации не найден'
      }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Недействительный токен'
      }, { status: 401 })
    }

    // Получаем информацию о курьере из базы данных
    const courier = await prisma.user.findUnique({
      where: { 
        id: user.id,
        role: 'COURIER'
      },
      select: {
        id: true,
        fullname: true,
        phoneNumber: true,
        role: true,
        createdAt: true
      }
    })

    if (!courier) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Курьер не найден'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: courier
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Токен авторизации не найден'
      }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Недействительный токен'
      }, { status: 401 })
    }

    const body = await request.json()
    const { fullname, phoneNumber } = body

    if (!fullname?.trim()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Имя обязательно для заполнения'
      }, { status: 400 })
    }

    const updateData: { fullname: string; phoneNumber?: string } = { fullname }
    
    // Если передан новый телефон, добавляем его к данным обновления
    if (phoneNumber?.trim()) {
      updateData.phoneNumber = phoneNumber.trim()
    }

    const updatedCourier = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        fullname: true,
        phoneNumber: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedCourier,
      message: 'Профиль успешно обновлен'
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
