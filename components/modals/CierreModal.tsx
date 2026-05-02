'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { cierresAPI, ventasAPI, gastosAPI } from '@/lib/api';
import api from '@/lib/api';
import { D } from '@/lib/utils';
import type { Cierre } from '@/types';

interface CierreModalProps {
  onClose: () => void;
  editCierre?: Cierre;        // Si viene, modo edición
  onSaved?: (c: Cierre) => void;
}

const DENS = [100, 50, 20, 10, 5, 1, 0.50, 0.25, 0.10, 0.05, 0.01];

export default function CierreModal({ onClose, editCierre, onSaved }: CierreModalProps) {
  const { user, notify } = useApp();
  const isEdit = !!editCierre;

  const [dens, setDens] = useState(DENS.map(v => ({ v, q: 0 })));
  const [fondoV, setFondoV] = useState(editCierre ? +editCierre.fondo_vuelto : 35);
  const [obs, setObs] = useState(editCierre?.obs ?? '');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    ventas:   editCierre ? +editCierre.ventas   : 0,
    utilidad: editCierre ? +editCierre.utilidad : 0,
    egresos:  editCierre ? +editCierre.egresos  : 0,
    ventasEf: 0,
  });

  useEffect(() => {
    if (isEdit) {
      // En modo edición: si el contado original era > 0, distribuirlo en billetes de 100
      // para que el usuario vea algo. Puede ajustarlo.
      if (+editCierre!.contado > 0) {
        const contado = +editCierre!.contado;
        setDens(DENS.map(v => {
          if (v === 100) return { v, q: Math.floor(contado / 100) };
          if (v === 50)  return { v, q: Math.floor((contado % 100) / 50) };
          if (v === 20)  return { v, q: Math.floor((contado % 50) / 20) };
          if (v === 10)  return { v, q: Math.floor((contado % 20) / 10) };
          if (v === 5)   return { v, q: Math.floor((contado % 10) / 5) };
          if (v === 1)   return { v, q: Math.floor(contado % 5) };
          return { v, q: 0 };
        }));
      }
      return;
    }
    // Modo crear: cargar ventas/gastos sin cierre
    Promise.all([ventasAPI.getAll(), gastosAPI.getAll()]).then(([vR, gR]) => {
      const vT = vR.data.filter((v: { cierre_id: number }) => !v.cierre_id);
      const gT = gR.data.filter((g: { cierre_id: number }) => !g.cierre_id);
      setStats({
        ventas:   vT.reduce((a: number, v: { total: string }) => a + parseFloat(v.total), 0),
        utilidad: vT.reduce((a: number, v: { utilidad: string }) => a + parseFloat(v.utilidad), 0),
        egresos:  gT.reduce((a: number, g: { monto: string }) => a + parseFloat(g.monto), 0),
        ventasEf: vT.filter((v: { metodo: string }) => v.metodo === 'Efectivo')
                    .reduce((a: number, v: { total: string }) => a + parseFloat(v.total), 0),
      });
    }).catch(() => {});
  }, []);

  const totalContado = dens.reduce((a, d) => a + d.v * (d.q || 0), 0);
  const enCaja = isEdit ? +editCierre!.contado : 20 + stats.ventasEf;
  const dif = parseFloat((totalContado - (isEdit ? +editCierre!.contado : enCaja)).toFixed(2));
  const aDepositar = Math.max(0, parseFloat((totalContado - fondoV).toFixed(2)));

  const updDen = (idx: number, q: number) =>
    setDens(p => p.map((d, j) => j === idx ? { ...d, q: q || 0 } : d));

  const confirmar = async () => {
    setLoading(true);
    try {
      if (isEdit) {
        // EDITAR cierre existente
        const { data } = await api.put(`/cierres/${editCierre!.id}`, {
          ventas:      stats.ventas,
          egresos:     stats.egresos,
          utilidad:    stats.utilidad,
          contado:     totalContado,
          dif:         parseFloat((totalContado - +editCierre!.contado).toFixed(2)),
          fondoVuelto: fondoV,
          aDepositar,
          obs,
        });
        onSaved?.(data);
        notify('Cierre actualizado ✓');
      } else {
        // CREAR cierre nuevo
        await cierresAPI.create({
          id: Date.now(),
          fecha: new Date().toISOString(),
          fechaISO: new Date().toISOString().slice(0, 10),
          cajero: user?.nombre,
          ...stats,
          contado: totalContado,
          dif: parseFloat((totalContado - enCaja).toFixed(2)),
          fondoVuelto: fondoV,
          aDepositar,
          obs,
        });
        notify('Cierre registrado ✓');
      }
      onClose();
    } catch {
      notify('Error al confirmar cierre', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mouseDownOnOverlay = useRef(false);

  return (
    <div className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (mouseDownOnOverlay.current && e.target === e.currentTarget) onClose(); }}
      onClick={e => e.stopPropagation()}
    >
      <div className="modal-box" style={{ width: 720, padding: 26 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>
              {isEdit
                ? <><i className="fas fa-pencil" style={{ color: 'var(--amb)', marginRight: 8 }}></i>Corregir Cierre</>
                : <>Arqueo <span style={{ color: 'var(--cy)' }}>de Caja</span></>
              }
            </h2>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
              {isEdit
                ? `${editCierre!.cajero} · ${new Date(editCierre!.fecha).toLocaleDateString('es-EC')}`
                : user?.nombre
              }
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><i className="fas fa-times"></i></button>
        </div>

        {isEdit && (
          <div style={{ background: 'var(--ambl)', border: '1.5px solid var(--amb)', borderRadius: 10, padding: '9px 13px', marginBottom: 14, fontSize: 11.5, color: '#92400e', fontWeight: 700 }}>
            <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
            Estás corrigiendo un cierre existente. El nuevo conteo reemplazará el anterior.
          </div>
        )}

        {/* Resumen del turno */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { lbl: 'Ventas', val: stats.ventas, color: 'var(--grn)' },
            { lbl: 'Egresos', val: stats.egresos, color: 'var(--red)' },
            { lbl: 'Utilidad', val: stats.utilidad, color: 'var(--cyd)' },
          ].map(r => (
            <div key={r.lbl} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 9, border: '1px solid var(--brd)', textAlign: 'center' }}>
              <p style={{ fontSize: 8.5, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 3 }}>{r.lbl}</p>
              <p className="mono" style={{ fontSize: 16, fontWeight: 800, color: r.color }}>${D(r.val)}</p>
            </div>
          ))}
        </div>

        <div className="cierre-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>

          {/* Conteo físico */}
          <div>
            <p className="lbl" style={{ marginBottom: 9 }}>Conteo Físico de Efectivo</p>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--amb)', textTransform: 'uppercase', marginBottom: 6 }}>Billetes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 11 }}>
              {dens.filter(d => d.v >= 1).map((d, i) => (
                <div key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ width: 44, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>${d.v}</span>
                  <input
                    type="number" min="0"
                    value={d.q || ''}
                    onChange={e => updDen(dens.indexOf(d), parseInt(e.target.value) || 0)}
                    className="inp"
                    style={{ width: 66, fontSize: 12.5, fontWeight: 700, textAlign: 'center', padding: '6px 3px' }}
                    placeholder="0"
                  />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--cyd)', width: 60 }}>= ${D(d.v * (d.q || 0))}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 6 }}>Monedas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dens.filter(d => d.v < 1).map(d => (
                <div key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ width: 44, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>${d.v.toFixed(2)}</span>
                  <input
                    type="number" min="0"
                    value={d.q || ''}
                    onChange={e => updDen(dens.indexOf(d), parseInt(e.target.value) || 0)}
                    className="inp"
                    style={{ width: 66, fontSize: 12.5, fontWeight: 700, textAlign: 'center', padding: '6px 3px' }}
                    placeholder="0"
                  />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--cyd)', width: 60 }}>= ${D(d.v * (d.q || 0))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ background: 'var(--cyl)', border: '2px solid var(--cy)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <p className="lbl" style={{ marginBottom: 4, color: 'var(--cyd)' }}>Total Contado</p>
              <p className="mono" style={{ fontSize: 36, fontWeight: 800, color: 'var(--cyd)' }}>${D(totalContado)}</p>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 13, border: '1px solid var(--brd)', fontSize: 12 }}>
              {!isEdit && (
                <div style={{ background: 'var(--ambl)', borderRadius: 7, padding: '6px 10px', marginBottom: 8, fontSize: 10, fontWeight: 700, color: '#92400e' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>Solo Efectivo afecta el conteo.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--brd)', paddingTop: 7 }}>
                <span style={{ fontWeight: 800 }}>{isEdit ? 'Contado anterior:' : 'Esperado en caja:'}</span>
                <span className="mono">${D(enCaja)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontWeight: 800 }}>Diferencia:</span>
                <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: dif === 0 ? 'var(--grn)' : dif > 0 ? 'var(--amb)' : 'var(--red)' }}>
                  {dif >= 0 ? '+' : ''}${D(dif)}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--ambl)', border: '1.5px solid var(--amb)', borderRadius: 10, padding: 11 }}>
              <p style={{ fontSize: 9.5, fontWeight: 800, color: '#92400e', marginBottom: 7 }}>Fondo en caja (para vuelto)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" step="0.01"
                  value={fondoV}
                  onChange={e => setFondoV(parseFloat(e.target.value) || 0)}
                  className="inp mono"
                  style={{ fontSize: 14, fontWeight: 700, flex: 1 }}
                />
                <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700 }}>USD</span>
              </div>
            </div>

            <div style={{ background: 'var(--mgl)', border: '1.5px solid var(--mg)', borderRadius: 10, padding: 11, textAlign: 'center' }}>
              <p className="lbl" style={{ marginBottom: 3, color: 'var(--mgd)' }}>A Depositar en Banco</p>
              <p className="mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--mgd)' }}>${D(aDepositar)}</p>
            </div>

            <div>
              <label className="lbl">Observaciones {isEdit && '/ Motivo de corrección'}</label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                className="inp"
                rows={2}
                style={{ resize: 'vertical' }}
                placeholder={isEdit ? 'Explica el motivo de la corrección...' : 'Notas del cierre...'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ padding: 11 }}>Cancelar</button>
              <button onClick={confirmar} disabled={loading} className="btn btn-mg" style={{ padding: 11 }}>
                <i className="fas fa-check"></i>{' '}
                {loading ? 'Procesando...' : isEdit ? 'Guardar Corrección' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}