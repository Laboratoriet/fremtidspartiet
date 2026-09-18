import { relatedSchema } from '@/lib/schema/related'
import { CoreMessage, generateObject } from 'ai'
import {
    getModel,
    getToolCallModel,
    isToolCallSupported
} from '../utils/registry'

const RELATED_QUESTIONS_PROMPT = `Du foreslår tre oppfølgingsspørsmål til en samtale med Veiviseren, AI-samtalepartneren til Fremtidspartiet – et spekulativt prosjekt om politikk, teknologi og fremtid (ikke et registrert parti, og ikke Fremskrittspartiet).

Regler:
- Skriv spørsmålene på samme språk som brukeren (norsk bokmål som standard).
- Korte, naturlige spørsmål slik en nysgjerrig bruker ville stilt dem – maks 12 ord hver.
- Bygg videre på det siste svaret: ett som går dypere, ett som tar et annet perspektiv, ett som knytter temaet til Fremtidspartiets ideer (fremtidstenkning, demokratisk styring av teknologi, utdanning, borgerlønn, digitalt demokrati) når det passer.
- Nevn aldri Fremskrittspartiet, FrP eller andre politiske partier med mindre brukeren selv har tatt dem opp.
- Ingen nummerering, ingen forklaringer – bare de tre spørsmålene.`

export async function generateRelatedQuestions(
  messages: CoreMessage[],
  model: string
) {
  // End with a user turn: current Claude models reject a conversation that
  // ends with an assistant message (treated as prefill), and the request is
  // clearer for every provider this way.
  const lastMessages: CoreMessage[] = [
    ...messages.map(message => ({ ...message })),
    {
      role: 'user',
      content: 'Foreslå tre oppfølgingsspørsmål til svaret ditt over.'
    }
  ]

  const supportedModel = isToolCallSupported(model)
  const currentModel = supportedModel
    ? getModel(model)
    : getToolCallModel(model)

  const result = await generateObject({
    model: currentModel,
    system: RELATED_QUESTIONS_PROMPT,
    messages: lastMessages,
    schema: relatedSchema
  })

  return result
}
