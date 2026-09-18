import { CoreMessage, smoothStream, streamText } from 'ai'
import { buildVeiviserenPrompt, VeiviserenMode } from '../prompts/veiviseren'
import { createQuestionTool } from '../tools/question'
import { retrieveTool } from '../tools/retrieve'
import { createSearchTool } from '../tools/search'
import { createVideoSearchTool } from '../tools/video-search'
import { getModel } from '../utils/registry'

const TOOL_INSTRUCTIONS = `
# Verktøy (søk er slått på)
Du har tilgang til verktøy for å søke på internett, hente innhold fra nettsider brukeren oppgir, søke etter videoer og stille strukturerte oppfølgingsspørsmål.

- Spørsmål om Fremtidspartiet selv (hva det er, logoen, verdiene, hvem som står bak, hvordan bidra) besvarer du fra faktaene over. Ikke søk etter dette – søkeresultater om "Fremtidspartiet" handler ofte om Fremskrittspartiet og skal aldri brukes som kilde om prosjektet.
- Søk når brukeren spør om aktuelle hendelser, tall, forskning eller ting utenfor prosjektet. Prioriter norske kilder, men utvid til internasjonale ved behov.
- Bruk \`retrieve\` kun med URL-er brukeren selv har gitt deg.
- Bruk \`ask_question\` bare når spørsmålet er så tvetydig at du ikke kan svare fornuftig uten avklaring. Lag korte spørsmål med relevante alternativer, på brukerens språk (alternativverdier på engelsk).
- Når du bruker søkeresultater: siter kildene med formatet [kilde](url), i samme rekkefølge som resultatene, adskilt med komma. Bruk bare informasjon som har en URL.
- Hvis resultatene ikke er relevante, si det og støtt deg på faktaene om prosjektet og din generelle kunnskap.
- Svarstilen for valgt modus gjelder også når du siterer kilder: Direkte-modus skal fortsatt være kort.
`

type ResearcherReturn = Parameters<typeof streamText>[0]

export function researcher({
  messages,
  model,
  searchMode,
  mode
}: {
  messages: CoreMessage[]
  model: string
  searchMode: boolean
  mode?: VeiviserenMode
}): ResearcherReturn {
  try {
    const currentDate = new Date().toLocaleString()

    // Create model-specific tools
    const searchTool = createSearchTool(model)
    const videoSearchTool = createVideoSearchTool(model)
    const askQuestionTool = createQuestionTool(model)

    const system = buildVeiviserenPrompt({
      mode,
      extra: `${searchMode ? TOOL_INSTRUCTIONS : ''}\nDato og klokkeslett nå: ${currentDate}`
    })

    return {
      model: getModel(model),
      system,
      messages,
      tools: {
        search: searchTool,
        retrieve: retrieveTool,
        videoSearch: videoSearchTool,
        ask_question: askQuestionTool
      },
      experimental_activeTools: searchMode
        ? ['search', 'retrieve', 'videoSearch', 'ask_question']
        : [],
      maxSteps: searchMode ? 5 : 1,
      experimental_transform: smoothStream()
    }
  } catch (error) {
    console.error('Error in chatResearcher:', error)
    throw error
  }
}
