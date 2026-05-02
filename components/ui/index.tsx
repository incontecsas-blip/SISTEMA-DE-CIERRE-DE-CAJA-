'use client';

import { ReactNode, MouseEvent, useRef } from 'react';
import type { DateFilter, FilterMode } from '@/types';
import { D } from '@/lib/utils';

// ── DateBar ──────────────────────────────────────────────────
const MODOS: { k: FilterMode; l: string }[] = [
  { k: 'todo', l: 'Todo' }, { k: 'hoy', l: 'Hoy' }, { k: 'ayer', l: 'Ayer' },
  { k: 'semana', l: 'Semana' }, { k: 'mes', l: 'Este mes' }, { k: 'rango', l: 'Rango' },
];

export function DateBar({ f, setF, children }: { f: DateFilter; setF: (f: DateFilter) => void; children?: ReactNode }) {
  return (
    <div className="dbar">
      <i className="fas fa-calendar" style={{ color: 'var(--cy)', fontSize: 11 }}></i>
      {MODOS.map(m => (
        <button key={m.k} className={`dmod ${f.modo === m.k ? 'act' : ''}`} onClick={() => setF({ ...f, modo: m.k })}>{m.l}</button>
      ))}
      {f.modo === 'rango' && <>
        <input type="date" className="inp" value={f.desde ?? ''} onChange={e => setF({ ...f, desde: e.target.value })} style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }} />
        <span style={{ color: 'var(--t3)' }}>→</span>
        <input type="date" className="inp" value={f.hasta ?? ''} onChange={e => setF({ ...f, hasta: e.target.value })} style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }} />
      </>}
      {children && <span style={{ marginLeft: 'auto' }}>{children}</span>}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────
export function StatCard({ label, value, icon, color, sub, accent }: {
  label: string; value: string; icon: string; color: string; sub?: string; accent?: string;
}) {
  return (
    <div className="card" style={{ padding: 17, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent ?? color, borderRadius: '14px 14px 0 0' }}></div>
      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
        <i className={icon} style={{ color, marginRight: 4 }}></i>{label}
      </p>
      <p className="mono" style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ children, onClose, width = 420 }: { children: ReactNode; onClose: () => void; width?: number }) {
  const mouseDownOnOverlay = useRef(false);

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (mouseDownOnOverlay.current && e.target === e.currentTarget) onClose(); }}
      onClick={e => e.stopPropagation()}
    >
      <div className="modal-box" style={{ width, padding: 26 }}>
        {children}
      </div>
    </div>
  );
}

// ── Empty ─────────────────────────────────────────────────────
export function Empty({ msg = 'Sin registros', icon = 'fa-inbox' }: { msg?: string; icon?: string }) {
  return (
    <tr>
      <td colSpan={20} style={{ textAlign: 'center', padding: 44, color: 'var(--t4)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' }}>
        <i className={`fas ${icon}`} style={{ fontSize: 20, display: 'block', marginBottom: 7, opacity: .4 }}></i>
        {msg}
      </td>
    </tr>
  );
}

// ── MetodoBadge ───────────────────────────────────────────────
const METODO_STYLES: Record<string, string> = {
  Efectivo:      'background:#ECFDF5;color:#059669',
  Transferencia: 'background:#EEF2FF;color:#4338CA',
  Zelle:         'background:#F5F3FF;color:#7C3AED',
  Tarjeta:       'background:#FFFBEB;color:#D97706',
};

export function MetodoBadge({ metodo }: { metodo: string }) {
  const style = METODO_STYLES[metodo] ?? 'background:#F1F5F9;color:var(--t3)';
  const obj = Object.fromEntries(style.split(';').map(s => s.split(':')));
  return <span className="badge" style={obj}>{metodo}</span>;
}

export { D };