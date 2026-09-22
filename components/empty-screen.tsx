import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export type PublicQuestion = { question: string; createdAt: number }

const exampleMessages = [
  {
    heading: 'Hva er Fremtidspartiet?',
    message: 'Hva er Fremtidspartiet, og hva vil dere oppnå?'
  },
  {
    heading: 'Kan AI hjelpe oss å bygge et bedre samfunn?',
    message: 'Hvordan kan vi designe et samfunn der maskiner jobber og mennesker lever meningsfylte liv?'
  },
  {
    heading: 'Hvordan kan vi fornye demokratiet?',
    message: 'Kan teknologi som sanntidsavstemning gi oss nye og mer direkte former for folkestyre?'
  },
  {
    "heading": "Hva er egentlig borgerlønn?",
    "message": "Gjør rede for hvorfor borgerlønn er en idé som er verdt å teste ut, spesielt i et land som Norge. Ta med økonomiske, sosiale og teknologiske perspektiver."
  },
  {
    "heading": "Hva om staten var en app?",
    "message": "Se for deg at staten var like intuitiv som Spotify eller Vipps. Du eier tjenestene, infrastrukturen og fondet. Men hvorfor føles det ikke sånn? Utforsk hvordan vi kunne designe mer tilgjengelige og medborgerlige systemer for deltakelse og eierskap."
  }
]

function QuestionButton({
  label,
  message,
  onSelect
}: {
  label: string
  message: string
  onSelect: (message: string) => void
}) {
  return (
    <Button
      variant="link"
      className="h-auto p-0 text-base whitespace-normal text-left justify-start"
      name={message}
      onClick={() => onSelect(message)}
    >
      <ArrowRight size={16} className="mr-2 shrink-0 text-muted-foreground" />
      {label}
    </Button>
  )
}

export function EmptyScreen({
  submitMessage,
  publicQuestions = [],
  className
}: {
  submitMessage: (message: string) => void
  publicQuestions?: PublicQuestion[]
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-2 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <QuestionButton
              key={index}
              label={message.heading}
              message={message.message}
              onSelect={submitMessage}
            />
          ))}
        </div>

        {publicQuestions.length > 0 && (
          <section aria-labelledby="andre-har-spurt" className="mt-6 mb-4">
            <h2
              id="andre-har-spurt"
              className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Andre har spurt
            </h2>
            <div className="flex flex-col items-start space-y-2">
              {publicQuestions.map(item => (
                <QuestionButton
                  key={item.createdAt + item.question}
                  label={item.question}
                  message={item.question}
                  onSelect={submitMessage}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
