import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface CourierPayload {
  id: string
  phoneNumber: string
  fullname: string
}

export async function authenticateCourier(phoneNumber: string, password: string) {
  try {
    const courier = await prisma.user.findUnique({
      where: { 
        phoneNumber,
        role: 'COURIER'
      }
    })

    if (!courier) {
      return null
    }

    const isValidPassword = await bcrypt.compare(password, courier.password)
    
    // Если bcrypt не сработал, проверяем как plain text (для совместимости)
    if (!isValidPassword && password === courier.password) {
      try {
        // Обновляем на хешированный пароль
        const hashedPassword = await bcrypt.hash(password, 10)
        await prisma.user.update({
          where: { id: courier.id },
          data: { password: hashedPassword }
        })
        return courier
      } catch (updateError) {
        return courier // Все равно авторизуем
      }
    }
    
    if (!isValidPassword) {
      return null
    }

    return courier
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function createToken(payload: CourierPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): CourierPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as CourierPayload
  } catch (error) {
    console.error('Token verification error:', error instanceof Error ? error.message : error)
    return null
  }
}

