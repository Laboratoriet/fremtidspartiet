'use client'

import { useSearchMode } from '@/lib/hooks/use-search-mode'
import { cn } from '@/lib/utils'
import { Globe } from 'lucide-react'
import { Button } from './ui/button'

export function SearchModeToggle() {
  const [isSearchEnabled, setIsSearchEnabled] = useSearchMode()

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        'rounded-full shadow-none',
        isSearchEnabled &&
          'bg-accent-blue text-accent-blue-foreground border-accent-blue-border'
      )}
      onClick={() => setIsSearchEnabled(!isSearchEnabled)}
    >
      <Globe size={16} />
    </Button>
  )
}
