'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

interface UsuarioSelector { id: number; nombre: string; rol: string; }

export default function LoginPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioSelector[]>([]);
  const [sel, setSel] = useState<UsuarioSelector | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/login').then(r => r.json()).then(setUsuarios).catch(() => {});
  }, []);

  const tapPin = async (d: string) => {
    if (pin.length >= 4 || loading) return;
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 4) {
      setLoading(true);
      try {
        await authAPI.login(newPin);
        router.push('/dashboard');
        router.refresh();
      } catch {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); setLoading(false); }, 700);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--bg)' }}>
      <div className="card" style={{ width: 340, padding: 30, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,var(--cy),var(--mg))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-print" style={{ color: '#fff', fontSize: 14 }}></i>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 19, fontWeight: 900 }}>
                <span style={{ color: 'var(--cy)' }}>IMPRI</span>
                <span style={{ color: 'var(--mg)' }}>ME</span>
                <span style={{ color: '#C9A300' }}>YA</span>
              </div>
              <div style={{ fontSize: 8, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase' }}>CierreCaja Pro</div>
            </div>
          </div>
        </div>

        {!sel ? (
          <div className="fade-in">
            <p className="lbl" style={{ textAlign: 'center', marginBottom: 9 }}>Selecciona usuario</p>
            {!usuarios.length && (
              <div style={{ padding: 20, color: 'var(--t4)', fontSize: 12 }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Cargando...
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {usuarios.map(u => (
                <button key={u.id} onClick={() => { setSel(u); setPin(''); }} className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '9px 12px', gap: 9, borderRadius: 10 }}>
                  <div style={{ width: 29, height: 29, borderRadius: 8, background: 'linear-gradient(135deg,var(--mg),var(--cy))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                    {u.nombre.charAt(0)}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800 }}>{u.nombre}</div>
                    <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {u.rol === 'admin' ? '★ Administrador' : 'Cajero'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <button onClick={() => { setSel(null); setPin(''); }} className="btn btn-ghost btn-sm">
                <i className="fas fa-chevron-left" style={{ fontSize: 10 }}></i>
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{sel.nombre}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase' }}>Ingresa tu PIN</div>
              </div>
              <div style={{ width: 36 }}></div>
            </div>

            {/* PIN dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className={`pin-dot ${pin.length >= i ? 'on' : ''}`}></div>
              ))}
            </div>

            {/* Teclado */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 6 }}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => tapPin(String(n))} disabled={loading}
                  style={{ padding: 12, borderRadius: 9, border: '1.5px solid var(--brd)', background: 'var(--bg)', color: 'var(--t1)', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace', transition: 'all .13s' }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <div></div>
              <button onClick={() => tapPin('0')} disabled={loading}
                style={{ padding: 12, borderRadius: 9, border: '1.5px solid var(--brd)', background: 'var(--bg)', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace' }}>
                0
              </button>
              <button onClick={() => setPin(p => p.slice(0, -1))}
                style={{ padding: 12, borderRadius: 9, border: '1.5px solid var(--brd)', background: 'var(--bg)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}>
                <i className="fas fa-delete-left"></i>
              </button>
            </div>

            {error && (
              <p className="fade-in" style={{ color: 'var(--red)', fontSize: 12, fontWeight: 700, marginTop: 10 }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i>PIN incorrecto
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}