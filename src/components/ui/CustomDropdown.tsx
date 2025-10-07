'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface DropdownOption {
  value: string
  label: string
}

interface CustomDropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  icon?: React.ComponentType<{ className?: string }>
  isMobile?: boolean
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  className = '',
  icon: Icon,
  isMobile = false
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          backgroundColor: isMobile ? '#111827' : 'var(--card-bg)',
          color: 'var(--foreground)',
          borderColor: isMobile ? '#1f2937' : 'var(--border)'
        }}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span>{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg animate-in slide-in-from-top-2"
          style={{
            backgroundColor: isMobile ? '#111827' : 'var(--card-bg)',
            borderColor: isMobile ? '#1f2937' : 'var(--border)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option.value)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors duration-200 ${
                  isMobile 
                    ? `hover:bg-gray-600 ${option.value === value ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300'}`
                    : `hover:bg-gray-100 dark:hover:bg-gray-700 ${option.value === value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`
                }`}
                style={{
                  color: option.value === value ? 'var(--primary)' : 'var(--foreground)'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
