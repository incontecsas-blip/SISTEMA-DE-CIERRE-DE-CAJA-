'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { authAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import CierreModal from '@/components/modals/CierreModal';
import type { AuthUser } from '@/types';

const ALL_NAV = [
  { id: 'dashboard',    lbl: 'Dashboard',        icon: 'fas fa-gauge-high',    path: '/dashboard' },
  { id: 'pos',          lbl: 'Punto de Venta',   icon: 'fas fa-cash-register', path: '/pos' },
  { id: 'ingresos',     lbl: 'Ingresos',         icon: 'fas fa-arrow-up',      path: '/ingresos' },
  { id: 'egresos',      lbl: 'Egresos',          icon: 'fas fa-arrow-down',    path: '/egresos' },
  { id: 'graficas',     lbl: 'Gráficas P&L',     icon: 'fas fa-chart-pie',     path: '/graficas' },
  { id: 'depositos',    lbl: 'Depósitos Banco',  icon: 'fas fa-university',    path: '/depositos' },
  { id: 'historial',    lbl: 'Historial Cierres',icon: 'fas fa-history',       path: '/historial' },
  { id: 'config',       lbl: 'Configuración',    icon: 'fas fa-sliders',       path: '/configuracion' },
];

export default function Sidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, notify } = useApp();
  const [showCierre, setShowCierre] = useState(false);

  const navItems = ALL_NAV.filter(n => can(n.id));

  const handleLogout = async () => {
    await authAPI.logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 10px', overflowY: 'auto', background: 'var(--wh)', borderRight: '1px solid var(--brd)', boxShadow: '2px 0 10px rgba(0,0,0,.05)', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ padding: '2px 7px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--cy),var(--mg))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-print" style={{ color: '#fff', fontSize: 12 }}></i>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>
                <span style={{ color: 'var(--cy)' }}>IMPRI</span>
                <span style={{ color: 'var(--mg)' }}>ME</span>
                <span style={{ color: '#C9A300' }}>YA</span>
              </div>
              <div style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase' }}>CierreCaja Pro</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {navItems.map(item => {
            const active = pathname === item.path;
            return (
              <Link key={item.id} href={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 9, marginBottom: 2,
                color: active ? '#fff' : 'var(--t3)',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                background: active ? 'var(--cy)' : 'transparent',
                boxShadow: active ? '0 3px 10px rgba(0,193,212,.26)' : 'none',
                transition: 'all .15s',
              }}>
                <i className={item.icon} style={{ width: 14, textAlign: 'center', fontSize: 11 }}></i>
                <span>{item.lbl}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid var(--brd)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', background: 'var(--bg)', borderRadius: 9, marginBottom: 6, border: '1px solid var(--brd)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--mg),var(--cy))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
              {user.nombre.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nombre}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>
                {user.rol}{user.rol === 'admin' && <span style={{ color: 'var(--mg)', marginLeft: 4 }}>★</span>}
              </div>
            </div>
          </div>
          <button onClick={() => setShowCierre(true)} className="btn btn-mg" style={{ width: '100%', padding: 8, fontSize: 11, marginBottom: 5 }}>
            <i className="fas fa-cash-register"></i> Cerrar Caja
          </button>
          <button onClick={handleLogout} style={{ width: '100%', padding: 6, border: 'none', background: 'none', color: 'var(--t4)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
            <i className="fas fa-sign-out-alt" style={{ marginRight: 4 }}></i>Cambiar usuario
          </button>
        </div>
      </aside>

      {showCierre && <CierreModal onClose={() => setShowCierre(false)} />}
    </>
  );
}
