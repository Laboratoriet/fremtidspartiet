'use client'

import { getCookie, setCookie } from '@/lib/utils/cookies'
import { useEffect, useState } from 'react'

export function useSearchMode(): [boolean, (value: boolean) => void] {
  const [isSearchMode, setIsSearchMode] = useState(true)

  useEffect(() => {
    const savedMode = getCookie('search-mode')
    if (savedMode !== null) {
      setIsSearchMode(savedMode === 'true')
    } else {
      setCookie('search-mode', 'true')
    }
  }, [])

  const setSearchMode = (value: boolean) => {
    setIsSearchMode(value)
    setCookie('search-mode', value.toString())
  }

  return [isSearchMode, setSearchMode]
} 