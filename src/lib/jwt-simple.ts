// Простая проверка JWT токена для Edge Runtime (без использования jsonwebtoken)
// Это упрощенная версия, которая проверяет только базовую структуру токена

export interface SimpleJwtPayload {
  id: string
  phoneNumber: string
  fullname: string
  iat: number
  exp: number
}

export function verifyTokenSimple(token: string): SimpleJwtPayload | null {
  try {
    // Разделяем токен на части
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Декодируем payload (вторая часть)
    const payload = JSON.parse(atob(parts[1])) as SimpleJwtPayload
    
    // Проверяем срок действия токена
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    // Проверяем наличие обязательных полей
    if (!payload.id || !payload.phoneNumber || !payload.fullname) {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}
