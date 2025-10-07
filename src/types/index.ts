// Экспорт типов из Prisma
import type {
  User,
  UserRole,
  Category,
  Product,
  Size,
  Color,
  ProductSize,
  ProductColor,
  Order,
  OrderStatus,
  OrderItem,
  Setting,
  Review,
} from '@prisma/client'

export type {
  User,
  UserRole,
  Category,
  Product,
  Size,
  Color,
  ProductSize,
  ProductColor,
  Order,
  OrderStatus,
  OrderItem,
  Setting,
  Review,
}

// Дополнительные типы для API
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

export interface ProductWithDetails extends Product {
  category: Category
  seller: User
  productSizes: (ProductSize & { size: Size })[]
  productColors: (ProductColor & { color: Color })[]
  reviews: Review[]
}

export interface OrderWithDetails extends Order {
  courier?: User | null
  orderItems: (OrderItem & { 
    product: Product & { 
      category: Category
      seller: User 
    } 
  })[]
  // Явно добавляем поля, которые могут отсутствовать в сгенерированном типе Order
  adminComment: string | null
}

// Расширяем тип Order для включения всех полей
export interface ExtendedOrder extends Order {
  adminComment: string | null
}

export interface OrderWithDetailsExtended extends ExtendedOrder {
  courier?: User | null
  orderItems: (OrderItem & { 
    product: Product & { 
      category: Category
      seller: User 
    } 
  })[]
}

// Типы для Telegram
export interface TelegramKeyboard {
  inline_keyboard: Array<Array<{
    text: string
    url?: string
    callback_data?: string
  }>>
}

export interface TelegramRegistrationResult {
  success: boolean
  message: string
  data?: {
    courierId: string
    courierName: string
    chatId: string
  }
  keyboard?: TelegramKeyboard
}
