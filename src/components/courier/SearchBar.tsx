'use client'

import { useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useLanguage } from '@/contexts/LanguageContext'

interface SearchBarProps {
  onSearchChange?: (value: string) => void
}

export function SearchBar({ onSearchChange }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)

  // Показываем только на странице dashboard
  if (pathname !== '/courier/dashboard') {
    return null
  }

  // Обработка изменения поискового запроса
  const handleChange = (value: string) => {
    setSearchQuery(value)
    
    if (onSearchChange) {
      onSearchChange(value)
    }

    // Отправляем событие для dashboard
    window.dispatchEvent(new CustomEvent('searchQueryChange', { detail: value }))
  }

  // Обработка клавиатуры - только скрытие клавиатуры на мобильных
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && window.innerWidth < 1024) {
      e.preventDefault()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="w-full relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('searchOrders') || 'Поиск заказов...'}
          value={searchQuery}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {}}
          className="w-full pl-9 pr-9 py-2 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            backgroundColor: 'var(--card-bg)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => handleChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

