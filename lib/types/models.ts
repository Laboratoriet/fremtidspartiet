export interface Model {
  id: string
  name: string
  description?: string
  icon?: string
  provider: string
  providerId: string
  enabled: boolean
  toolCallType: 'native' | 'manual'
  toolCallModel?: string
  /** Answer style for Veiviseren. Drives the system prompt, see lib/prompts/veiviseren.ts */
  mode?: 'kort' | 'reflektert' | 'analytisk'
}
