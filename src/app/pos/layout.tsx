import { PortalGuard } from '@/components/layout/portal-guard'
import { PosLayout } from '@/components/layout/pos-layout'

export default function PosRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard allowedRoles={['cashier', 'inventory_manager', 'admin']}>
      <PosLayout>{children}</PosLayout>
    </PortalGuard>
  )
}
