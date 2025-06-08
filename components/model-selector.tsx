'use client'

import { Model } from '@/lib/types/models'
import { getCookie, setCookie } from '@/lib/utils/cookies'
import { isReasoningModel } from '@/lib/utils/registry'
import { Check, ChevronsUpDown, Lightbulb } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { createModelId } from '../lib/utils'
import { Button } from './ui/button'
import {
    Command,
    CommandEmpty,
    CommandItem,
    CommandList
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

interface ModelSelectorProps {
  models: Model[]
}

export function ModelSelector({ models }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    const savedModel = getCookie('selectedModel')
    if (savedModel) {
      try {
        const model = JSON.parse(savedModel) as Model
        setValue(createModelId(model))
      } catch (e) {
        console.error('Failed to parse saved model:', e)
      }
    } else if (models.length > 0) {
      // Set the first model as the default if no cookie is found
      const defaultModel = models[0]
      const defaultModelId = createModelId(defaultModel)
      setValue(defaultModelId)
      setCookie('selectedModel', JSON.stringify(defaultModel))
    }
  }, [models])

  const handleModelSelect = (id: string) => {
    const newValue = id === value ? '' : id
    setValue(newValue)

    const selectedModel = models.find(model => createModelId(model) === newValue)
    if (selectedModel) {
      setCookie('selectedModel', JSON.stringify(selectedModel))
    } else {
      setCookie('selectedModel', '')
    }

    setOpen(false)
  }

  const selectedModel = models.find(model => createModelId(model) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="text-sm rounded-full shadow-none focus:ring-0"
        >
          {selectedModel ? (
            <div className="flex items-center space-x-1">
              <Image
                src={`/providers/logos/${selectedModel.providerId}.svg`}
                alt={selectedModel.provider}
                width={18}
                height={18}
                className="bg-white rounded-full border"
              />
              <span className="text-xs font-medium">{selectedModel.name}</span>
              {isReasoningModel(selectedModel.id) && (
                <Lightbulb size={12} className="text-accent-blue-foreground" />
              )}
            </div>
          ) : (
            'Select model'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {models.map(model => {
              const modelId = createModelId(model)
              return (
                <CommandItem
                  key={modelId}
                  value={modelId}
                  onSelect={handleModelSelect}
                  className="flex items-start justify-between p-2"
                >
                  <div className="flex items-start space-x-3">
                    <Image
                      src={`/providers/logos/${model.providerId}.svg`}
                      alt={model.provider}
                      width={20}
                      height={20}
                      className="bg-white rounded-full border"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </div>
                  <Check
                    className={`h-4 w-4 mt-1 ${
                      value === modelId ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </CommandItem>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
