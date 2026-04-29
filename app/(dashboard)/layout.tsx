import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import type { AuthUser } from '@/types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userOrNull = await getAuthUser();
  if (!userOrNull) redirect('/login');
  const user = userOrNull as AuthUser;

  return (
    <AppProvider initialUser={user}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div className="sidebar-desktop" style={{ display: 'flex' }}>
          <Sidebar user={user} />
        </div>
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', background: 'var(--bg)', minWidth: 0 }}>
          {children}
        </main>
        <Sidebar user={user} mobileOnly />
      </div>
    </AppProvider>
  );
}