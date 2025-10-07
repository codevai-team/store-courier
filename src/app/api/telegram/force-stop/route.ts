import { NextRequest, NextResponse } from 'next/server'
import { forceStopAllBots } from '@/lib/telegram-polling'

export async function POST(request: NextRequest) {
  try {
    console.log('🛑 API: Принудительная остановка всех экземпляров бота...')
    
    await forceStopAllBots()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Все экземпляры бота остановлены' 
    })
  } catch (error) {
    console.error('❌ Ошибка принудительной остановки бота:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка остановки бота' 
    }, { status: 500 })
  }
}
