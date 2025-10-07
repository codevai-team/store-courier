'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { OrderWithDetails } from '@/types'

interface OrdersContextType {
  orders: OrderWithDetails[]
  setOrders: React.Dispatch<React.SetStateAction<OrderWithDetails[]>>
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])

  return (
    <OrdersContext.Provider value={{ orders, setOrders }}>
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrdersProvider')
  }
  return context
}
