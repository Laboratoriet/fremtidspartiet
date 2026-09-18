import { CoreMessage, smoothStream } from 'ai'
import { buildVeiviserenPrompt, VeiviserenMode } from '../prompts/veiviseren'
import { getModel } from '../utils/registry'

const SEARCH_ENABLED_INSTRUCTIONS = `
# Søkeresultater (søk er slått på)
Søkeresultater kan ligge vedlagt i samtalen. Når du bruker dem:
- Spørsmål om Fremtidspartiet selv besvarer du fra faktaene over, aldri fra søkeresultater – treff på "Fremtidspartiet" handler ofte om Fremskrittspartiet.
- Prioriter norske kilder, men bruk internasjonale om relevant.
- Siter kilder med formatet [kilde](url), i samme rekkefølge som resultatene, adskilt med komma. Bruk bare informasjon som har en URL.
- Hvis resultatene ikke er relevante, si det og svar ut fra faktaene om prosjektet og din generelle kunnskap.
- Svarstilen for valgt modus gjelder også når du siterer kilder.
`

const SEARCH_DISABLED_INSTRUCTIONS = `
# Uten søk
- Svar ut fra faktaene om prosjektet og din generelle kunnskap.
- Foreslå å slå på søk når brukeren trenger ferske tall, nyheter eller kilder.
`

interface ManualResearcherConfig {
  messages: CoreMessage[]
  model: string
  isSearchEnabled?: boolean
  mode?: VeiviserenMode
}

type ManualResearcherReturn = {
  model: any
  system: string
  messages: CoreMessage[]
  temperature: number
  topP: number
  topK: number
  experimental_transform: any
}

export function manualResearcher({
  messages,
  model,
  isSearchEnabled = true,
  mode
}: ManualResearcherConfig): ManualResearcherReturn {
  try {
    const currentDate = new Date().toLocaleString()
    const instructions = isSearchEnabled
      ? SEARCH_ENABLED_INSTRUCTIONS
      : SEARCH_DISABLED_INSTRUCTIONS

    return {
      model: getModel(model),
      system: buildVeiviserenPrompt({
        mode,
        extra: `${instructions}\nDato og klokkeslett nå: ${currentDate}`
      }),
      messages,
      temperature: 0.6,
      topP: 1,
      topK: 40,
      experimental_transform: smoothStream()
    }
  } catch (error) {
    console.error('Error in manualResearcher:', error)
    throw error
  }
}
