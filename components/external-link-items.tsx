'use client'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { BookText } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { SiGithub, SiX } from 'react-icons/si'

const externalLinks = [
  {
    name: 'Manifest',
    href: '/manifest',
    icon: <BookText className="mr-2 h-4 w-4" />,
    isInternal: true
  },
  {
    name: 'Alkemist',
    href: 'https://alkemist.no',
    icon: (
      <Image
        src="/alkemisticon.svg"
        alt="Alkemist icon"
        width={16}
        height={16}
        className="mr-2"
      />
    )
  },
  {
    name: 'X',
    href: 'https://x.com/fremtidspartiet',
    icon: <SiX className="mr-2 h-4 w-4" />
  },
  {
    name: 'GitHub',
    href: 'https://github.com/fremtidspartiet/fremtidspartiet',
    icon: <SiGithub className="mr-2 h-4 w-4" />
  }
]

export function ExternalLinkItems() {
  return (
    <>
      {externalLinks.map(link => (
        <DropdownMenuItem key={link.name} asChild>
          <Link
            href={link.href}
            target={link.isInternal ? undefined : '_blank'}
            rel="noopener noreferrer"
          >
            {link.icon}
            <span>{link.name}</span>
          </Link>
        </DropdownMenuItem>
      ))}
    </>
  )
}
