import { PortalGuard } from '@/components/layout/portal-guard'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeaderDynamic } from '@/components/layout/admin-header-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-stone-50">
        <AdminSidebar />
        <AdminHeaderDynamic />
        <main className="ml-64 min-h-screen max-w-[1440px] p-8 pt-24">{children}</main>
      </div>
    </PortalGuard>
  )
}
