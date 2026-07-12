import { PortalGuard } from '@/components/layout/portal-guard'
import { InventorySidebar } from '@/components/layout/inventory-sidebar'
import { InventoryHeaderDynamic } from '@/components/layout/inventory-header-dynamic'

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard allowedRoles={['inventory_manager', 'admin']}>
      <div className="min-h-screen bg-stone-50">
        <InventorySidebar />
        <InventoryHeaderDynamic />
        <main className="ml-64 min-h-screen max-w-[1440px] p-8 pt-24">{children}</main>
      </div>
    </PortalGuard>
  )
}
