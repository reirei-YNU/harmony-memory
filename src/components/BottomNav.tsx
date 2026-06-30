'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Mic, Music, User } from 'lucide-react'

const tabs = [
  { href: '/home', icon: Home, label: '練習' },
  { href: '/record', icon: Mic, label: '録音' },
  { href: '/feed', icon: Music, label: 'みんな' },
  { href: '/profile', icon: User, label: 'プロフィール' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex border-t safe-bottom"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors"
            style={{ color: active ? 'var(--primary-light)' : 'var(--muted)' }}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
