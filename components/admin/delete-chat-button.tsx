'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteChatAsAdmin } from '@/lib/actions/admin'
import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'

export function DeleteChatButton({ chatId }: { chatId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <Trash2 className="mr-1 size-4" />
          Slett samtale
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slette samtalen?</AlertDialogTitle>
          <AlertDialogDescription>
            Samtalen fjernes for godt, også fra brukerens egen historikk og fra
            en eventuell delt lenke.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => deleteChatAsAdmin(chatId))}
          >
            Slett
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
