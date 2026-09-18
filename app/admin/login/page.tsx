import { loginAdmin } from '@/lib/actions/admin'
import { isAdminConfigured, isAdminRequest } from '@/lib/auth/admin'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { IconLogo } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Admin · Fremtidspartiet' }
export const dynamic = 'force-dynamic'

const ERRORS: Record<string, string> = {
  wrong: 'Feil passord.',
  ratelimit: 'For mange forsøk. Prøv igjen om ti minutter.',
  unconfigured: 'Admin er ikke satt opp: ADMIN_PASSWORD og ADMIN_SESSION_SECRET mangler.'
}

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  if (await isAdminRequest()) {
    redirect('/admin')
  }
  const { error } = await props.searchParams
  const message = error ? ERRORS[error] : null
  const configured = isAdminConfigured()

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex flex-col items-center gap-4 text-2xl">
            <IconLogo className="size-12" />
            Admin
          </CardTitle>
          <CardDescription>Alle samtaler med Veiviseren</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAdmin} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Passord</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                disabled={!configured}
              />
            </div>
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!configured}>
              Logg inn
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
