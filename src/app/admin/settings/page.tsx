import Link from 'next/link'
import { ArrowLeftRight, Award } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardTitle } from '@/components/ui/card'

const SETTINGS_LINKS = [
  { href: '/admin/settings/exchange-rate', label: 'Exchange Rate', icon: ArrowLeftRight },
  { href: '/admin/settings/loyalty', label: 'Loyalty Config', icon: Award },
]

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-3 gap-4">
        {SETTINGS_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-colors hover:border-orange-300">
              <CardContent className="flex items-center gap-3">
                <link.icon className="size-5 text-orange-500" />
                <CardTitle className="text-base">{link.label}</CardTitle>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
