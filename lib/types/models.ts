export interface Model {
  id: string
  name: string
  description?: string
  provider: string
  providerId: string
  enabled: boolean
  toolCallType: 'native' | 'manual'
  toolCallModel?: string
}
