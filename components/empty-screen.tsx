import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const exampleMessages = [
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
export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-2 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base whitespace-normal text-left justify-start"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <ArrowRight size={16} className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
