import { Model } from '@/lib/types/models'
import {
  BarChartBig,
  BrainCircuit,
  Compass,
  Feather,
  Lightbulb,
  MessageCircle,
  Microscope,
  Scale,
  Sparkles,
  Zap
} from 'lucide-react'
import Image from 'next/image'
import { ComponentType } from 'react'

/**
 * One icon map for every place a mode is shown. Add new icons here, never in
 * the pickers, so the two never drift and no picker falls back to a
 * provider logo (which would reveal which vendor sits behind a mode).
 */
export const modeIcons: Record<string, ComponentType<{ className?: string }>> = {
  zap: Zap,
  feather: Feather,
  sparkles: Sparkles,
  compass: Compass,
  'message-circle': MessageCircle,
  lightbulb: Lightbulb,
  microscope: Microscope,
  'brain-circuit': BrainCircuit,
  'bar-chart-big': BarChartBig,
  scale: Scale
}

export function ModelIcon({
  model,
  className
}: {
  model: Model
  className?: string
}) {
  const Icon = model.icon ? modeIcons[model.icon] : null
  if (Icon) {
    return <Icon className={className} />
  }
  const providerIcon = model.providerId === 'google' ? 'google' : model.providerId
  return (
    <Image
      src={`/providers/logos/${providerIcon}.svg`}
      alt={model.provider}
      width={18}
      height={18}
      className="bg-white rounded-full border"
    />
  )
}
