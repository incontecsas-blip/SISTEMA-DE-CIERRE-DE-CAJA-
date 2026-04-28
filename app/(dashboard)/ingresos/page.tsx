'use client';
import { useState, useEffect, useCallback } from 'react';
import { ventasAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { DateBar, Empty, MetodoBadge, D } from '@/components/ui';
import { inRango } from '@/lib/utils';
import type { Venta, DateFilter } from '@/types';

export default function IngresosPage() {
  const { isAdmin, notify } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [f, setF] = useState<DateFilter>({ modo: 'hoy' });
  const [metodo, setMetodo] = useState('');
  const load = useCallback(async () => { const { data } = await ventasAPI.getAll(); setVentas(data); }, []);
  useEffect(() => { load(); }, [load]);
  const filt = ventas.filter(v => inRango(v.fecha_iso, f) && (!metodo || v.metodo === metodo));
  const tot = filt.reduce((a, v) => ({ total: a.total + +v.total, utilidad: a.utilidad + +v.utilidad, pagado: a.pagado + +(v.pago_servicio ?? 0) }), { total: 0, utilidad: 0, pagado: 0 });
  const resM: Record<string, { total: number; count: number }> = {};
  filt.forEach(v => { if (!resM[v.metodo]) resM[v.metodo] = { total: 0, count: 0 }; resM[v.metodo].total += +v.total; resM[v.metodo].count++; });
  const del = async (id: number) => { if (!confirm('¿Eliminar?')) return; await ventasAPI.delete(id); setVentas(p => p.filter(v => v.id !== id)); notify('Eliminado'); };
  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:900 }}>Libro de <span style={{ color:'var(--grn)' }}>Ingresos</span></h1>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <select value={metodo} onChange={e => setMetodo(e.target.value)} className="inp" style={{ width:'auto', fontSize:12, padding:'7px 11px' }}>
            <option value="">Todos los métodos</option>
            {['Efectivo','Transferencia','Zelle','Tarjeta'].map(m => <option key={m}>{m}</option>)}
          </select>
          <div className="badge" style={{ background:'var(--grnl)', color:'var(--grn)', padding:'6px 12px', fontSize:11.5 }}>${D(tot.total)}</div>
        </div>
      </div>
      <DateBar f={f} setF={setF}><span style={{ fontSize:11, color:'var(--t3)', fontWeight:600 }}>{filt.length} registros</span></DateBar>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:13 }}>
        {Object.entries(resM).map(([m, r]) => (
          <div key={m} className="card" style={{ padding:13 }}>
            <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', marginBottom:4 }}>{m}</p>
            <p className="mono" style={{ fontSize:20, fontWeight:800, color:'var(--cyd)' }}>${D(r.total)}</p>
            <p style={{ fontSize:9.5, color:'var(--t3)', marginTop:2 }}>{r.count} transacciones</p>
          </div>
        ))}
      </div>
      <div className="card" style={{ borderRadius:14, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table className="tbl">
            <thead><tr><th>#</th><th>Fecha/Hora</th><th>Cliente</th><th>Método</th><th>Cajero</th><th style={{ textAlign:'right' }}>Pagado</th><th style={{ textAlign:'right' }}>Utilidad</th><th style={{ textAlign:'right' }}>Total</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {filt.map(v => (
                <tr key={v.id}>
                  <td className="mono" style={{ color:'var(--t4)', fontSize:10 }}>{v.numero}</td>
                  <td style={{ fontSize:11 }}><div style={{ fontWeight:700 }}>{v.fecha}</div><div className="mono" style={{ color:'var(--t3)' }}>{v.hora}</div></td>
                  <td style={{ fontWeight:700 }}>{v.cliente ?? '—'}</td>
                  <td><MetodoBadge metodo={v.metodo} /></td>
                  <td style={{ color:'var(--t3)', fontSize:11 }}>{v.cajero}</td>
                  <td style={{ textAlign:'right' }}><span className="mono" style={{ fontSize:11.5 }}>${D(v.pago_servicio)}</span></td>
                  <td style={{ textAlign:'right' }}><span className="mono" style={{ color:'var(--grn)', fontSize:11.5 }}>+${D(v.utilidad)}</span></td>
                  <td style={{ textAlign:'right' }}><span className="mono" style={{ fontWeight:800, fontSize:13.5, color:'var(--cyd)' }}>${D(v.total)}</span></td>
                  {isAdmin && <td><button onClick={() => del(v.id)} style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer', fontSize:12 }}><i className="fas fa-trash-alt"></i></button></td>}
                </tr>
              ))}
              {filt.length > 0 && (
                <tr style={{ background:'var(--cyl)' }}>
                  <td colSpan={5} style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', color:'var(--t2)', padding:'12px 13px' }}>TOTALES ({filt.length})</td>
                  <td style={{ textAlign:'right' }}><span className="mono" style={{ fontWeight:800 }}>${D(tot.pagado)}</span></td>
                  <td style={{ textAlign:'right' }}><span className="mono" style={{ fontWeight:800, color:'var(--grn)' }}>${D(tot.utilidad)}</span></td>
                  <td style={{ textAlign:'right' }}><span className="mono" style={{ fontWeight:900, fontSize:15, color:'var(--cyd)' }}>${D(tot.total)}</span></td>
                  {isAdmin && <td></td>}
                </tr>
              )}
              {!filt.length && <Empty />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
