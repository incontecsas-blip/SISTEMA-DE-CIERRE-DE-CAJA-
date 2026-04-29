'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { authAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import CierreModal from '@/components/modals/CierreModal';
import type { AuthUser } from '@/types';

interface SidebarProps {
  user: AuthUser;
  mobileOnly?: boolean;
}

const ALL_NAV = [
  { id: 'dashboard', lbl: 'Dashboard',  icon: 'fas fa-gauge-high',    path: '/dashboard' },
  { id: 'pos',       lbl: 'Venta',      icon: 'fas fa-cash-register', path: '/pos' },
  { id: 'ingresos',  lbl: 'Ingresos',   icon: 'fas fa-arrow-up',      path: '/ingresos' },
  { id: 'egresos',   lbl: 'Egresos',    icon: 'fas fa-arrow-down',    path: '/egresos' },
  { id: 'graficas',  lbl: 'Gráficas',   icon: 'fas fa-chart-pie',     path: '/graficas' },
  { id: 'depositos', lbl: 'Depósitos',  icon: 'fas fa-university',    path: '/depositos' },
  { id: 'historial', lbl: 'Historial',  icon: 'fas fa-history',       path: '/historial' },
  { id: 'config',    lbl: 'Config',     icon: 'fas fa-sliders',       path: '/configuracion' },
];

export default function Sidebar({ user, mobileOnly = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = useApp();
  const [showCierre, setShowCierre] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const navItems = ALL_NAV.filter(n => can(n.id));
  const mobileMain = navItems.slice(0, 4);
  const mobileMore = navItems.slice(4);

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    router.push('/login');
    router.refresh();
  };

  if (mobileOnly) {
    return (
      <>
        <nav className="bottom-nav">
          {mobileMain.map(item => (
            <Link key={item.id} href={item.path} className={`bnav-item ${pathname === item.path ? 'act' : ''}`}>
              <i className={item.icon}></i>{item.lbl}
            </Link>
          ))}
          <button onClick={() => setShowCierre(true)} className="bnav-item">
            <i className="fas fa-cash-register" style={{ color: 'var(--mg)' }}></i>
            <span style={{ color: 'var(--mg)' }}>Cierre</span>
          </button>
          {mobileMore.length > 0 && (
            <button onClick={() => setShowMore(true)} className="bnav-item">
              <i className="fas fa-ellipsis-h"></i>Más
            </button>
          )}
        </nav>

        {showMore && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(14,26,43,.45)', backdropFilter: 'blur(4px)' }} onClick={() => setShowMore(false)}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--wh)', borderRadius: '18px 18px 0 0', padding: '16px 12px 32px' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 36, height: 4, background: 'var(--brd2)', borderRadius: 2, margin: '0 auto 16px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,var(--mg),var(--cy))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 800 }}>
                    {user.nombre.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{user.nombre}</div>
                    <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>{user.rol}</div>
                  </div>
                </div>
                <button onClick={handleLogout} style={{ background: 'var(--bg)', border: '1.5px solid var(--brd)', borderRadius: 8, padding: '6px 11px', fontSize: 11, fontWeight: 700, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
                  <i className="fas fa-sign-out-alt" style={{ marginRight: 5 }}></i>Salir
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {mobileMore.map(item => (
                  <Link key={item.id} href={item.path} onClick={() => setShowMore(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '12px 6px', borderRadius: 12, border: `1.5px solid ${pathname === item.path ? 'var(--cy)' : 'var(--brd)'}`, background: pathname === item.path ? 'var(--cyl)' : 'var(--bg)', textDecoration: 'none', color: pathname === item.path ? 'var(--cyd)' : 'var(--t2)' }}>
                    <i className={item.icon} style={{ fontSize: 19 }}></i>
                    <span style={{ fontSize: 9.5, fontWeight: 800, textAlign: 'center', lineHeight: 1.3 }}>{item.lbl}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
        {showCierre && <CierreModal onClose={() => setShowCierre(false)} />}
      </>
    );
  }

  return (
    <>
      <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 10px', overflowY: 'auto', background: 'var(--wh)', borderRight: '1px solid var(--brd)', boxShadow: '2px 0 10px rgba(0,0,0,.05)', zIndex: 10 }}>
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

        <nav style={{ flex: 1 }}>
          {navItems.map(item => {
            const active = pathname === item.path;
            return (
              <Link key={item.id} href={item.path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, marginBottom: 2, color: active ? '#fff' : 'var(--t3)', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: active ? 'var(--cy)' : 'transparent', boxShadow: active ? '0 3px 10px rgba(0,193,212,.26)' : 'none', transition: 'all .15s' }}>
                <i className={item.icon} style={{ width: 14, textAlign: 'center', fontSize: 11 }}></i>
                <span>{item.lbl}</span>
              </Link>
            );
          })}
        </nav>

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