'use client'

import { getCookie, setCookie } from '@/lib/utils/cookies'
import { Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'

export function SearchModeToggle() {
  const [isSearchMode, setIsSearchMode] = useState(true)

  useEffect(() => {
    const savedMode = getCookie('search-mode')
    if (savedMode !== null) {
      setIsSearchMode(savedMode === 'true')
    } else {
      setCookie('search-mode', 'true')
    }
  }, [])

  const handleSearchModeChange = (pressed: boolean) => {
    setIsSearchMode(pressed)
    setCookie('search-mode', pressed.toString())
  }

  return (
    <Button
      variant="outline"
      className="text-sm rounded-full shadow-none"
      onClick={() => handleSearchModeChange(!isSearchMode)}
    >
      <div className="flex items-center space-x-2">
        <Globe size={16} />
        <span className="text-xs font-medium">Websøk</span>
      </div>
    </Button>
  )
}
