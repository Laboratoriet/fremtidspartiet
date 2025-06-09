'use client'

import { Model } from '@/lib/types/models'
import { getCookie, setCookie } from '@/lib/utils/cookies'
import { isReasoningModel } from '@/lib/utils/registry'
import {
    BarChartBig,
    BrainCircuit,
    Check,
    ChevronsUpDown,
    Lightbulb,
    Microscope,
    Scale
} from 'lucide-react'
import Image from 'next/image'
import { ComponentType, useEffect, useState } from 'react'
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

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  lightbulb: Lightbulb,
  microscope: Microscope,
  'brain-circuit': BrainCircuit,
  'bar-chart-big': BarChartBig,
  scale: Scale
}

export function ModelSelector({ models }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    const savedModelId = getCookie('selectedModelId')
    if (savedModelId) {
      setValue(savedModelId)
    } else if (models.length > 0) {
      const defaultModel = models[0]
      const defaultModelId = createModelId(defaultModel)
      setValue(defaultModelId)
      setCookie('selectedModelId', defaultModelId)
    }
  }, [models])

  const handleModelSelect = (id: string) => {
    const newValue = id === value ? '' : id
    setValue(newValue)
    setCookie('selectedModelId', newValue)
    setOpen(false)
  }

  const selectedModel = models.find(model => createModelId(model) === value)

  const renderIcon = (model: Model) => {
    const IconComponent = model.icon ? iconMap[model.icon] : null
    if (IconComponent) {
      return (
        <IconComponent className="mr-2 size-5 text-muted-foreground/80" />
      )
    }

    const providerIcon =
      model.providerId === 'google' ? 'google' : model.providerId

    return (
      <Image
        src={`/providers/logos/${providerIcon}.svg`}
        alt={model.provider}
        width={18}
        height={18}
        className="mr-2 bg-white rounded-full border"
      />
    )
  }

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
              {renderIcon(selectedModel)}
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
                    {renderIcon(model)}
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
