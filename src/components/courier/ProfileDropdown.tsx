'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

export function ProfileDropdown({ isOpen, onClose, anchorRef }: ProfileDropdownProps) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Определяем размер экрана
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Загрузка данных профиля
  useEffect(() => {
    if (isOpen && !name) {
      fetchProfile()
    }
  }, [isOpen, name])

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/courier/profile')
      const data = await response.json()
      
      if (data.success) {
        setName(data.data.fullname || '')
        setPhone(data.data.phoneNumber || '')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  return (
    <div 
      ref={dropdownRef}
      className={`absolute top-full mt-2 rounded-xl shadow-xl border z-[99999] ${
        isMobile 
          ? 'right-0 w-72' 
          : 'right-0 w-80'
      }`}
      style={{ 
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="p-4">
          {/* Заголовок */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {t('yourProfile') || 'Ваш профиль'}
            </h3>
          </div>

          {isLoading && (
            <div className="text-center mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 mx-auto"></div>
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t('loadingData') || 'Загрузка данных...'}</p>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Информация о профиле */}
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--secondary)' }}>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      {t('name')}
                    </label>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {name || t('notSpecified') || 'Не указано'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      {t('phone')}
                    </label>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {phone || t('notSpecified') || 'Не указан'}
                    </p>
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
    </div>
  )
}
