'use client';
import { useState, useEffect, useCallback } from 'react';
import { gastosAPI, configAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { DateBar, Empty, D } from '@/components/ui';
import { inRango, isoHoy } from '@/lib/utils';
import type { Gasto, DateFilter } from '@/types';

export default function EgresosPage() {
  const { user, isAdmin, notify } = useApp();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cats, setCats] = useState(['Papel/Suministros', 'Toner/Tinta', 'Internet', 'Comida', 'Transporte', 'Otros']);
  const [f, setF] = useState<DateFilter>({ modo: 'todo' });
  const [fg, setFg] = useState({ cat: cats[0], desc: '', monto: '', fechaGasto: isoHoy() });

  const load = useCallback(async () => {
    const [gR, cR] = await Promise.all([gastosAPI.getAll(), configAPI.get()]);
    setGastos(gR.data);
    if (cR.data.cats_gasto) setCats(cR.data.cats_gasto);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filt = gastos.filter(g => inRango(g.fecha_iso, f));
  const totalE = filt.reduce((a, g) => a + +g.monto, 0);

  const reg = async () => {
    if (!fg.monto || +fg.monto <= 0) return notify('Monto inválido', 'error');
    try {
      const { data } = await gastosAPI.create({
        id: Date.now(), cat: fg.cat, desc: fg.desc, monto: +fg.monto,
        cajero: user?.nombre,
        fecha: new Date(fg.fechaGasto + 'T12:00:00').toLocaleDateString('es-EC'),
        fechaISO: fg.fechaGasto,
      });
      setGastos(p => [data, ...p]);
      setFg(p => ({ ...p, desc: '', monto: '', fechaGasto: isoHoy() }));
      notify('Egreso registrado');
    } catch { notify('Error', 'error'); }
  };

  const del = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    await gastosAPI.delete(id);
    setGastos(p => p.filter(g => g.id !== id));
    notify('Eliminado');
  };

  return (
    <div className="fade-in">
      {/* egresos-grid colapsa a 1 col en mobile */}
      <div className="egresos-grid" style={{ display: 'grid', gridTemplateColumns: '285px 1fr', gap: 15, alignItems: 'start' }}>

        {/* Formulario */}
        <div className="card" style={{ padding: 17 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 12 }}>
            <i className="fas fa-minus-circle" style={{ marginRight: 5 }}></i>Registrar Egreso
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="lbl">Fecha</label>
              <input type="date" value={fg.fechaGasto} onChange={e => setFg(p => ({ ...p, fechaGasto: e.target.value }))} className="inp mono" />
            </div>
            <div>
              <label className="lbl">Categoría</label>
              <select value={fg.cat} onChange={e => setFg(p => ({ ...p, cat: e.target.value }))} className="inp">
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Descripción</label>
              <input value={fg.desc} onChange={e => setFg(p => ({ ...p, desc: e.target.value }))} className="inp" placeholder="Detalle..." />
            </div>
            <div>
              <label className="lbl">Monto ($)</label>
              <input type="number" step="0.01" value={fg.monto} onChange={e => setFg(p => ({ ...p, monto: e.target.value }))} className="inp mono" placeholder="0.00" />
            </div>
            <button onClick={reg} className="btn btn-rd" style={{ width: '100%', padding: 11 }}>
              <i className="fas fa-save"></i> Registrar Salida
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div>
          <DateBar f={f} setF={setF} />
          <div className="card" style={{ borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--brd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="lbl" style={{ margin: 0 }}>Historial de Egresos</p>
              <span className="badge" style={{ background: 'var(--redl)', color: 'var(--red)' }}>-${D(totalE)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Cajero</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filt.map(g => (
                    <tr key={g.id}>
                      <td className="mono" style={{ fontSize: 10.5, color: 'var(--t3)' }}>{g.fecha}</td>
                      <td><span className="badge" style={{ background: 'var(--redl)', color: 'var(--red)' }}>{g.cat}</span></td>
                      <td>{g.descripcion ?? '—'}</td>
                      <td style={{ color: 'var(--t3)', fontSize: 11 }}>{g.cajero}</td>
                      <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--red)', fontWeight: 800 }}>-${D(g.monto)}</span></td>
                      {isAdmin && (
                        <td>
                          <button onClick={() => del(g.id)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 12 }}>
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!filt.length && <Empty />}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}