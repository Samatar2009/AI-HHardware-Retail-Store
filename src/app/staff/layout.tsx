import { PortalGuard } from '@/components/layout/portal-guard'
import { StaffSidebar } from '@/components/layout/staff-sidebar'
import { StaffHeaderDynamic } from '@/components/layout/staff-header-dynamic'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard allowedRoles={['cashier', 'inventory_manager', 'admin']}>
      <div className="min-h-screen bg-stone-50">
        <StaffSidebar />
        <StaffHeaderDynamic />
        <main className="ml-64 min-h-screen max-w-[1440px] p-8 pt-24">{children}</main>
      </div>
    </PortalGuard>
  )
}
