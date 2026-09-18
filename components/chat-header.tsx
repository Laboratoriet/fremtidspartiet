'use client'

import { Model } from '@/lib/types/models'
import { createModelId } from '@/lib/utils'
import { setCookie } from '@/lib/utils/cookies'
import { User } from '@supabase/supabase-js'
import {
  Check,
  ChevronsUpDown,
  MessageCirclePlus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import GuestMenu from './guest-menu'
import { ModelIcon } from './model-icon'
import { Button } from './ui/button'
import { Command, CommandEmpty, CommandItem, CommandList } from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import UserMenu from './user-menu'

interface ChatHeaderProps {
  models: Model[]
  selectedModel: Model | undefined
  setSelectedModelId: (id: string | null) => void
  user: User | null
}

export function ChatHeader({
  models,
  selectedModel,
  setSelectedModelId,
  user
}: ChatHeaderProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId)
    setCookie('selectedModelId', modelId)
    setOpen(false)
  }

  const renderIcon = (model: Model) => (
    <ModelIcon model={model} className="mr-2 size-5 text-muted-foreground/80" />
  )

  const handleNewChat = () => {
    router.push('/search')
  }

  const selectedModelId = selectedModel ? createModelId(selectedModel) : ''

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-background px-4">
      {/* TODO: Add a functional sidebar trigger here */}
      <div className="w-0" />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 text-base">
            <span className="font-semibold">Veiviseren</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>
                {selectedModel ? `- ${selectedModel.name}` : 'Select Model'}
              </span>
              <ChevronsUpDown size={16} />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 max-w-full" align="center">
          <Command>
            <CommandList>
              <CommandEmpty>No model found.</CommandEmpty>
              {models.map(model => {
                const modelId = createModelId(model)
                return (
                  <CommandItem
                    key={modelId}
                    value={modelId}
                    onSelect={() => handleModelSelect(modelId)}
                    className="flex items-start justify-between p-2"
                  >
                    <div className="flex items-start space-x-3">
                      {renderIcon(model)}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {model.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      </div>
                    </div>
                    <Check
                      className={`h-4 w-4 mt-1 ${
                        selectedModelId === modelId
                          ? 'opacity-100'
                          : 'opacity-0'
                      }`}
                    />
                  </CommandItem>
                )
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleNewChat}
        >
          <MessageCirclePlus size={16} />
        </Button>
        {user ? <UserMenu user={user} /> : <GuestMenu />}
      </div>
    </header>
  )
} 