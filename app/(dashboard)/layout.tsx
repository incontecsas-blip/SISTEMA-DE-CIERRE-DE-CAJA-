import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return (
    <AppProvider initialUser={user}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar user={user} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', background: 'var(--bg)', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </AppProvider>
  );
}
