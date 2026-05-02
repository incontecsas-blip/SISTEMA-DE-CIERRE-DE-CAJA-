'use client';
import { useState, useEffect, useCallback } from 'react';
import { ventasAPI } from '@/lib/api';
import api from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { DateBar, Empty, MetodoBadge, D } from '@/components/ui';
import { inRango } from '@/lib/utils';
import type { Venta, DateFilter } from '@/types';
import { useModalClose } from '@/hooks/useModalClose';

const METODOS = ['Efectivo', 'Transferencia', 'Zelle', 'Tarjeta'];

export default function IngresosPage() {
  const { isAdmin, notify } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [f, setF] = useState<DateFilter>({ modo: 'hoy' });
  const [metodo, setMetodo] = useState('');
  const [mEdit, setMEdit] = useState(false);
  const [eV, setEV] = useState<Partial<Venta>>({});

  const load = useCallback(async () => {
    const { data } = await ventasAPI.getAll();
    setVentas(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filt = ventas.filter(v => inRango(v.fecha_iso, f) && (!metodo || v.metodo === metodo));
  const tot = filt.reduce(
    (a, v) => ({ total: a.total + +v.total, utilidad: a.utilidad + +v.utilidad, pagado: a.pagado + +(v.pago_servicio ?? 0) }),
    { total: 0, utilidad: 0, pagado: 0 }
  );
  const resM: Record<string, { total: number; count: number }> = {};
  filt.forEach(v => {
    if (!resM[v.metodo]) resM[v.metodo] = { total: 0, count: 0 };
    resM[v.metodo].total += +v.total;
    resM[v.metodo].count++;
  });

  const guardarEdicion = async () => {
    if (!eV.id) return;
    try {
      const { data } = await api.put(`/ventas/${eV.id}`, {
        cliente: eV.cliente,
        metodo: eV.metodo,
        total: eV.total,
        utilidad: eV.utilidad,
        pago_servicio: eV.pago_servicio,
        recibido: eV.recibido,
        vuelto: eV.vuelto,
        fecha: eV.fecha,
        hora: eV.hora,
      });
      setVentas(p => p.map(v => v.id === data.id ? data : v));
      setMEdit(false);
      notify('Venta actualizada ✓');
    } catch { notify('Error al guardar', 'error'); }
  };

  const del = async (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    await ventasAPI.delete(id);
    setVentas(p => p.filter(v => v.id !== id));
    notify('Eliminado');
  };

  const overlayPropsEdit = useModalClose(() => setMEdit(false));

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Libro de <span style={{ color: 'var(--grn)' }}>Ingresos</span></h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={metodo} onChange={e => setMetodo(e.target.value)} className="inp" style={{ width: 'auto', fontSize: 12, padding: '7px 11px' }}>
            <option value="">Todos los métodos</option>
            {METODOS.map(m => <option key={m}>{m}</option>)}
          </select>
          <div className="badge" style={{ background: 'var(--grnl)', color: 'var(--grn)', padding: '6px 12px', fontSize: 11.5 }}>${D(tot.total)}</div>
        </div>
      </div>

      <DateBar f={f} setF={setF}>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>{filt.length} registros</span>
      </DateBar>

      {/* Cards por método */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 13 }}>
        {Object.entries(resM).map(([m, r]) => (
          <div key={m} className="card" style={{ padding: 13 }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 4 }}>{m}</p>
            <p className="mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyd)' }}>${D(r.total)}</p>
            <p style={{ fontSize: 9.5, color: 'var(--t3)', marginTop: 2 }}>{r.count} transacciones</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>Fecha/Hora</th><th>Cliente</th><th>Método</th><th>Cajero</th>
                <th style={{ textAlign: 'right' }}>Pagado</th>
                <th style={{ textAlign: 'right' }}>Utilidad</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                {isAdmin && <th colSpan={2}></th>}
              </tr>
            </thead>
            <tbody>
              {filt.map(v => (
                <tr key={v.id}>
                  <td className="mono" style={{ color: 'var(--t4)', fontSize: 10 }}>{v.numero}</td>
                  <td style={{ fontSize: 11 }}>
                    <div style={{ fontWeight: 700 }}>{v.fecha}</div>
                    <div className="mono" style={{ color: 'var(--t3)' }}>{v.hora}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{v.cliente ?? '—'}</td>
                  <td><MetodoBadge metodo={v.metodo} /></td>
                  <td style={{ color: 'var(--t3)', fontSize: 11 }}>{v.cajero}</td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontSize: 11.5 }}>${D(v.pago_servicio)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--grn)', fontSize: 11.5 }}>+${D(v.utilidad)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--cyd)' }}>${D(v.total)}</span></td>
                  {isAdmin && (
                    <>
                      <td>
                        <button
                          onClick={() => { setEV({ ...v }); setMEdit(true); }}
                          style={{ background: 'var(--ambl)', border: '1px solid var(--amb)', color: '#92400e', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 7, fontFamily: 'Nunito,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <i className="fas fa-pencil"></i> Editar
                        </button>
                      </td>
                      <td>
                        <button onClick={() => del(v.id)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 12 }}>
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filt.length > 0 && (
                <tr style={{ background: 'var(--cyl)' }}>
                  <td colSpan={5} style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--t2)', padding: '12px 13px' }}>
                    TOTALES ({filt.length})
                  </td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontWeight: 800 }}>${D(tot.pagado)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontWeight: 800, color: 'var(--grn)' }}>${D(tot.utilidad)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontWeight: 900, fontSize: 15, color: 'var(--cyd)' }}>${D(tot.total)}</span></td>
                  {isAdmin && <td colSpan={2}></td>}
                </tr>
              )}
              {!filt.length && <Empty />}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar venta */}
      {mEdit && (
        <div className="modal-overlay" {...overlayPropsEdit}>
          <div className="modal-box" style={{ width: 480, padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 900 }}>
                  <i className="fas fa-pencil" style={{ color: 'var(--amb)', marginRight: 8 }}></i>Editar Venta
                </h2>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>#{eV.numero} · {eV.cajero}</p>
              </div>
              <button onClick={() => setMEdit(false)} className="btn btn-ghost btn-sm">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ background: 'var(--ambl)', border: '1.5px solid var(--amb)', borderRadius: 10, padding: '9px 13px', marginBottom: 16, fontSize: 11.5, color: '#92400e', fontWeight: 700 }}>
              <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
              Solo Admin puede editar ventas. Los cambios quedan registrados en auditoría.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label className="lbl">Fecha</label>
                <input value={eV.fecha ?? ''} onChange={e => setEV(p => ({ ...p, fecha: e.target.value }))} className="inp" />
              </div>
              <div>
                <label className="lbl">Hora</label>
                <input value={eV.hora ?? ''} onChange={e => setEV(p => ({ ...p, hora: e.target.value }))} className="inp mono" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="lbl">Cliente</label>
                <input value={eV.cliente ?? ''} onChange={e => setEV(p => ({ ...p, cliente: e.target.value }))} className="inp" placeholder="Público general" />
              </div>
              <div>
                <label className="lbl">Método de Pago</label>
                <select value={eV.metodo ?? 'Efectivo'} onChange={e => setEV(p => ({ ...p, metodo: e.target.value }))} className="inp">
                  {METODOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Total ($)</label>
                <input type="number" step="0.01" value={eV.total ?? 0} onChange={e => setEV(p => ({ ...p, total: +e.target.value }))} className="inp mono" style={{ color: 'var(--cyd)', fontWeight: 700 }} />
              </div>
              <div>
                <label className="lbl">Utilidad ($)</label>
                <input type="number" step="0.01" value={eV.utilidad ?? 0} onChange={e => setEV(p => ({ ...p, utilidad: +e.target.value }))} className="inp mono" style={{ color: 'var(--grn)', fontWeight: 700 }} />
              </div>
              <div>
                <label className="lbl">Pagado al proveedor ($)</label>
                <input type="number" step="0.01" value={eV.pago_servicio ?? 0} onChange={e => setEV(p => ({ ...p, pago_servicio: +e.target.value }))} className="inp mono" />
              </div>
              <div>
                <label className="lbl">Recibido ($)</label>
                <input type="number" step="0.01" value={eV.recibido ?? 0} onChange={e => setEV(p => ({ ...p, recibido: +e.target.value }))} className="inp mono" />
              </div>
              <div>
                <label className="lbl">Vuelto ($)</label>
                <input type="number" step="0.01" value={eV.vuelto ?? 0} onChange={e => setEV(p => ({ ...p, vuelto: +e.target.value }))} className="inp mono" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <button onClick={() => setMEdit(false)} className="btn btn-ghost" style={{ padding: 11 }}>Cancelar</button>
              <button onClick={guardarEdicion} className="btn btn-cy" style={{ padding: 11 }}>
                <i className="fas fa-save"></i> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}