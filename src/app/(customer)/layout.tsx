import { CustomerHeader } from '@/components/layout/customer-header'
import { CustomerFooter } from '@/components/layout/customer-footer'
import { CustomerNav } from '@/components/layout/customer-nav'
import { ChatWidget } from '@/components/ai/chat-widget'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <CustomerHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <CustomerFooter />
      <CustomerNav />
      <ChatWidget />
      <PwaInstallPrompt />
    </div>
  )
}
