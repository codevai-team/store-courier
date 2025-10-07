'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import Image from 'next/image'

// Устанавливаем ширину и высоту в пикселях, соответствующие классам w-5 h-4
// w-5 = 1.25rem = 20px; h-4 = 1rem = 16px
const FLAG_WIDTH = 20
const FLAG_HEIGHT = 16

export function SimpleLanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'ru' ? 'ky' : 'ru')}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
      title={language === 'ru' ? 'Переключить на кыргызский' : 'Переключить на русский'}
    >
      {/* Флаг России (Оставлен на чистом CSS для простоты) */}
      {language === 'ru' && (
        <div className="flex items-center space-x-1">
          <div className="w-5 h-4 rounded-sm overflow-hidden flex flex-col">
            <div className="flex-1 bg-white"></div>
            <div className="flex-1 bg-blue-500"></div>
            <div className="flex-1 bg-red-500"></div>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>RU</span>
        </div>
      )}
      
      {/* Флаг Кыргызстана (Исправлен на компонент Image и корневой путь) */}
      {language === 'ky' && (
        <div className="flex items-center space-x-1">
          {/* Используем div для обрамления, чтобы TailwindCSS классы w-5 h-4 
              задавали размеры контейнера для компонента Image */}
          <div className="w-5 h-4 rounded-sm overflow-hidden relative">
            <Image 
              src="/Flag_of_Kyrgyzstan.svg" // ИСПРАВЛЕННЫЙ КОРНЕВОЙ ПУТЬ
              alt="Кыргызстан" 
              fill={true} // Используем fill, чтобы Image растянулся на родительский div (w-5 h-4)
              sizes={`${FLAG_WIDTH}px`} // Обязательный параметр для `fill`
              style={{ objectFit: 'cover' }}
              // width и height не нужны, когда fill=true, 
              // но мы их определили для ясности размеров
            />
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>KG</span>
        </div>
      )}
    </button>
  )
}