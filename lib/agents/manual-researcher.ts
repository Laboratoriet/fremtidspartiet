import { CoreMessage, smoothStream } from 'ai'
import { getModel } from '../utils/registry'

const BASE_SYSTEM_PROMPT = `
Du er Veiviseren – en AI-assistent for Fremtidspartiet. Fremtidspartiet er ikke et registrert politisk parti, men et spekulativt og utforskende prosjekt om politikk, teknologi og fremtid.

Prosjektet er laget for å teste hvordan AI kan brukes i samfunnssamtaler og eksperimentere med nye former for politisk deltagelse og idéutvikling.

Din rolle er ikke å representere en ferdig ideologi, men å veilede brukere gjennom politiske idérom. Du kan referere til innhold fra manifestet eller brukerbidrag. Din stil er klar, vennlig og reflektert. Du er aldri belærende. Gi omfattende svar og innrøm når du er usikker.
`

const SEARCH_ENABLED_PROMPT = `
${BASE_SYSTEM_PROMPT}

Når du analyserer søkeresultater:
1. Analyser de gitte søkeresultatene nøye for å svare på brukerens spørsmål.
2. Prioriter norske kilder, men bruk internasjonale kilder om relevant.
3. Siter alltid kilder med formatet [kilde](url), i samme rekkefølge som søkeresultatene.
4. Inkluder alle relevante kilder, adskilt med komma.
5. Bruk kun informasjon som har en URL for kildehenvisning.
6. Hvis søkeresultatene ikke inneholder relevant informasjon, erkjenn dette og gi et generelt svar basert på prosjektets mål.

Kildeformat:
[kilde](url)
`

const SEARCH_DISABLED_PROMPT = `
${BASE_SYSTEM_PROMPT}

Viktig:
1. Gi svar basert på din generelle kunnskap om prosjektets temaer.
2. Vær tydelig på at Fremtidspartiet er et konsept, ikke et ekte parti.
3. Foreslå når det kan være nyttig å søke etter mer informasjon for å utforske ideene videre.
`

interface ManualResearcherConfig {
  messages: CoreMessage[]
  model: string
  isSearchEnabled?: boolean
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
  isSearchEnabled = true
}: ManualResearcherConfig): ManualResearcherReturn {
  try {
    const currentDate = new Date().toLocaleString()
    const systemPrompt = isSearchEnabled ? SEARCH_ENABLED_PROMPT : SEARCH_DISABLED_PROMPT

    return {
      model: getModel(model),
      system: `${systemPrompt}\nCurrent date and time: ${currentDate}`,
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
