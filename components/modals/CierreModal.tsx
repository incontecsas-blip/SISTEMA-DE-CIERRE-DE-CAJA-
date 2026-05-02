'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { cierresAPI, ventasAPI, gastosAPI } from '@/lib/api';
import api from '@/lib/api';
import { D, isoHoy } from '@/lib/utils';
import type { Cierre } from '@/types';

interface CierreModalProps {
  onClose: () => void;
  editCierre?: Cierre;
  onSaved?: (c: Cierre) => void;
}

const DENS = [100, 50, 20, 10, 5, 1, 0.50, 0.25, 0.10, 0.05, 0.01];

type FiltroMode = 'hoy' | 'ayer' | 'semana' | 'personalizado';

function getDesdeHasta(modo: FiltroMode, desde: string, hasta: string): { desde: string; hasta: string } {
  const hoy = isoHoy();
  if (modo === 'hoy') return { desde: hoy, hasta: hoy };
  if (modo === 'ayer') {
    const ay = new Date(); ay.setDate(ay.getDate() - 1);
    const ayISO = ay.toISOString().slice(0, 10);
    return { desde: ayISO, hasta: ayISO };
  }
  if (modo === 'semana') {
    const ini = new Date();
    ini.setDate(ini.getDate() - ini.getDay() + 1);
    return { desde: ini.toISOString().slice(0, 10), hasta: hoy };
  }
  return { desde, hasta };
}

export default function CierreModal({ onClose, editCierre, onSaved }: CierreModalProps) {
  const { user, notify } = useApp();
  const isEdit = !!editCierre;
  const mouseDownOnOverlay = useRef(false);

  const [filtroMode, setFiltroMode] = useState<FiltroMode>('hoy');
  const [desdeCustom, setDesdeCustom] = useState(isoHoy());
  const [hastaCustom, setHastaCustom] = useState(isoHoy());

  const [dens, setDens] = useState(DENS.map(v => ({ v, q: 0 })));
  const [fondoV, setFondoV] = useState(editCierre ? +editCierre.fondo_vuelto : 35);
  const [obs, setObs] = useState(editCierre?.obs ?? '');
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const [stats, setStats] = useState({
    ventas: editCierre ? +editCierre.ventas : 0,
    utilidad: editCierre ? +editCierre.utilidad : 0,
    egresos: editCierre ? +editCierre.egresos : 0,
    ventasEf: 0,
    numVentas: 0,
    numEgresos: 0,
  });

  const cargarStats = async (modo: FiltroMode, desde: string, hasta: string) => {
    if (isEdit) return;
    setLoadingStats(true);
    try {
      const { desde: d, hasta: h } = getDesdeHasta(modo, desde, hasta);
      const hoy = isoHoy();
      const esPasado = h < hoy; // Si el período es anterior a hoy, incluir ventas ya cerradas

      const [vR, gR] = await Promise.all([
        ventasAPI.getAll({ desde: d, hasta: h }),
        gastosAPI.getAll({ desde: d, hasta: h }),
      ]);

      // Para fechas pasadas: mostrar TODAS las ventas del período
      // Para hoy: solo las que no tienen cierre (pendientes)
      const vT = esPasado
        ? vR.data
        : vR.data.filter((v: { cierre_id: number }) => !v.cierre_id);
      const gT = esPasado
        ? gR.data
        : gR.data.filter((g: { cierre_id: number }) => !g.cierre_id);

      setStats({
        ventas:    vT.reduce((a: number, v: { total: string }) => a + parseFloat(v.total), 0),
        utilidad:  vT.reduce((a: number, v: { utilidad: string }) => a + parseFloat(v.utilidad), 0),
        egresos:   gT.reduce((a: number, g: { monto: string }) => a + parseFloat(g.monto), 0),
        ventasEf:  vT.filter((v: { metodo: string }) => v.metodo === 'Efectivo')
                     .reduce((a: number, v: { total: string }) => a + parseFloat(v.total), 0),
        numVentas:  vT.length,
        numEgresos: gT.length,
      });
    } catch {
      notify('Error al cargar datos', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      // Cargar denominaciones guardadas si existen
      const saved = editCierre!.denominaciones;
      if (saved && Array.isArray(saved) && saved.length > 0) {
        // Restaurar exactamente las denominaciones guardadas
        setDens(DENS.map(v => {
          const found = saved.find((d: { v: number; q: number }) => d.v === v);
          return { v, q: found ? found.q : 0 };
        }));
      } else if (+editCierre!.contado > 0) {
        // Fallback: distribuir el contado en billetes aproximadamente
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
    cargarStats('hoy', isoHoy(), isoHoy());
  }, []);

  const aplicarFiltro = () => cargarStats(filtroMode, desdeCustom, hastaCustom);

  const totalContado = dens.reduce((a, d) => a + d.v * (d.q || 0), 0);
  const enCaja = isEdit ? +editCierre!.contado : 20 + stats.ventasEf;
  const dif = parseFloat((totalContado - enCaja).toFixed(2));
  const aDepositar = Math.max(0, parseFloat((totalContado - fondoV).toFixed(2)));

  const updDen = (idx: number, q: number) =>
    setDens(p => p.map((d, j) => j === idx ? { ...d, q: q || 0 } : d));

  const periodLabel = () => {
    const { desde, hasta } = getDesdeHasta(filtroMode, desdeCustom, hastaCustom);
    if (desde === hasta) return new Date(desde + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    return `${new Date(desde + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })} al ${new Date(hasta + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })}`;
  };

  const confirmar = async () => {
    setLoading(true);
    try {
      const { desde, hasta } = getDesdeHasta(filtroMode, desdeCustom, hastaCustom);
      if (isEdit) {
        const { data } = await api.put(`/cierres/${editCierre!.id}`, {
          ventas: stats.ventas, egresos: stats.egresos, utilidad: stats.utilidad,
          contado: totalContado, dif: parseFloat((totalContado - +editCierre!.contado).toFixed(2)),
          fondoVuelto: fondoV, aDepositar, obs,
          denominaciones: dens,
        });
        onSaved?.(data);
        notify('Cierre actualizado ✓');
      } else {
        await cierresAPI.create({
          id: Date.now(),
          fecha: new Date().toISOString(),
          fechaISO: hasta,
          cajero: user?.nombre,
          ventas: stats.ventas, utilidad: stats.utilidad, egresos: stats.egresos,
          contado: totalContado,
          dif: parseFloat((totalContado - enCaja).toFixed(2)),
          fondoVuelto: fondoV, aDepositar,
          obs: obs || (filtroMode !== 'hoy' ? `Período: ${periodLabel()}` : undefined),
          denominaciones: dens,
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

  const FILTROS: { k: FiltroMode; l: string }[] = [
    { k: 'hoy',          l: 'Hoy' },
    { k: 'ayer',         l: 'Ayer' },
    { k: 'semana',       l: 'Esta semana' },
    { k: 'personalizado',l: 'Personalizado' },
  ];

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (mouseDownOnOverlay.current && e.target === e.currentTarget) onClose(); }}
      onClick={e => e.stopPropagation()}
    >
      <div className="modal-box" style={{ width: 740, padding: 26 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
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

        {/* ── Filtro de período (solo en modo crear) ── */}
        {!isEdit && (
          <div style={{ background: 'var(--bg)', border: '1.5px solid var(--brd)', borderRadius: 12, padding: '11px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>
              <i className="fas fa-calendar" style={{ color: 'var(--cy)', marginRight: 6 }}></i>Período del Cierre
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: filtroMode === 'personalizado' ? 9 : 0 }}>
              {FILTROS.map(f => (
                <button key={f.k} onClick={() => setFiltroMode(f.k)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${filtroMode === f.k ? 'var(--cy)' : 'var(--brd)'}`, background: filtroMode === f.k ? 'var(--cy)' : 'var(--wh)', color: filtroMode === f.k ? '#fff' : 'var(--t3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', transition: 'all .14s' }}>
                  {f.l}
                </button>
              ))}
            </div>
            {filtroMode === 'personalizado' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', whiteSpace: 'nowrap' }}>Desde</label>
                  <input type="date" value={desdeCustom} onChange={e => setDesdeCustom(e.target.value)} className="inp mono" style={{ width: 140, fontSize: 12, padding: '5px 8px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', whiteSpace: 'nowrap' }}>Hasta</label>
                  <input type="date" value={hastaCustom} onChange={e => setHastaCustom(e.target.value)} className="inp mono" style={{ width: 140, fontSize: 12, padding: '5px 8px' }} />
                </div>
                <button onClick={aplicarFiltro} className="btn btn-cy btn-sm" style={{ padding: '6px 14px' }}>
                  <i className="fas fa-search"></i> Cargar
                </button>
              </div>
            )}
            {filtroMode !== 'personalizado' && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyd)' }}>
                  <i className="fas fa-calendar-check" style={{ marginRight: 5 }}></i>{periodLabel()}
                </span>
                <button onClick={aplicarFiltro} className="btn btn-cy btn-sm" style={{ padding: '5px 12px' }} disabled={loadingStats}>
                  {loadingStats ? <><i className="fas fa-spinner fa-spin"></i> Cargando...</> : <><i className="fas fa-refresh"></i> Actualizar</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resumen del período */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { lbl: `Ventas${stats.numVentas ? ` (${stats.numVentas})` : ''}`, val: stats.ventas, color: 'var(--grn)' },
            { lbl: `Egresos${stats.numEgresos ? ` (${stats.numEgresos})` : ''}`, val: stats.egresos, color: 'var(--red)' },
            { lbl: 'Utilidad', val: stats.utilidad, color: 'var(--cyd)' },
          ].map(r => (
            <div key={r.lbl} style={{ padding: '9px 12px', background: loadingStats ? 'var(--bg)' : 'var(--bg)', borderRadius: 9, border: '1px solid var(--brd)', textAlign: 'center', opacity: loadingStats ? .5 : 1, transition: 'opacity .2s' }}>
              <p style={{ fontSize: 8.5, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 3 }}>{r.lbl}</p>
              <p className="mono" style={{ fontSize: 17, fontWeight: 800, color: r.color }}>{loadingStats ? '...' : `$${D(r.val)}`}</p>
            </div>
          ))}
        </div>

        {/* Conteo + Resumen */}
        <div className="cierre-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>

          {/* Conteo físico */}
          <div>
            <p className="lbl" style={{ marginBottom: 9 }}>Conteo Físico de Efectivo</p>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--amb)', textTransform: 'uppercase', marginBottom: 6 }}>Billetes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 11 }}>
              {dens.filter(d => d.v >= 1).map(d => (
                <div key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ width: 44, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>${d.v}</span>
                  <input type="number" min="0" value={d.q || ''}
                    onChange={e => updDen(dens.indexOf(d), parseInt(e.target.value) || 0)}
                    className="inp" style={{ width: 66, fontSize: 12.5, fontWeight: 700, textAlign: 'center', padding: '6px 3px' }} placeholder="0" />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--cyd)', width: 60 }}>= ${D(d.v * (d.q || 0))}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 6 }}>Monedas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dens.filter(d => d.v < 1).map(d => (
                <div key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ width: 44, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>${d.v.toFixed(2)}</span>
                  <input type="number" min="0" value={d.q || ''}
                    onChange={e => updDen(dens.indexOf(d), parseInt(e.target.value) || 0)}
                    className="inp" style={{ width: 66, fontSize: 12.5, fontWeight: 700, textAlign: 'center', padding: '6px 3px' }} placeholder="0" />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--cyd)', width: 60 }}>= ${D(d.v * (d.q || 0))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ background: 'var(--cyl)', border: '2px solid var(--cy)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <p className="lbl" style={{ marginBottom: 3, color: 'var(--cyd)' }}>Total Contado</p>
              <p className="mono" style={{ fontSize: 34, fontWeight: 800, color: 'var(--cyd)' }}>${D(totalContado)}</p>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, border: '1px solid var(--brd)', fontSize: 12 }}>
              {!isEdit && (
                <div style={{ background: 'var(--ambl)', borderRadius: 7, padding: '5px 9px', marginBottom: 7, fontSize: 10, fontWeight: 700, color: '#92400e' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>Solo Efectivo afecta el arqueo físico.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--brd)', paddingTop: 6 }}>
                <span style={{ fontWeight: 800 }}>{isEdit ? 'Contado anterior:' : 'Esperado en caja:'}</span>
                <span className="mono">${D(enCaja)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontWeight: 800 }}>Diferencia:</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: dif === 0 ? 'var(--grn)' : dif > 0 ? 'var(--amb)' : 'var(--red)' }}>
                  {dif >= 0 ? '+' : ''}${D(dif)}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--ambl)', border: '1.5px solid var(--amb)', borderRadius: 10, padding: 10 }}>
              <p style={{ fontSize: 9.5, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>Fondo en caja (para vuelto)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" step="0.01" value={fondoV} onChange={e => setFondoV(parseFloat(e.target.value) || 0)} className="inp mono" style={{ fontSize: 14, fontWeight: 700, flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700 }}>USD</span>
              </div>
            </div>

            <div style={{ background: 'var(--mgl)', border: '1.5px solid var(--mg)', borderRadius: 10, padding: 11, textAlign: 'center' }}>
              <p className="lbl" style={{ marginBottom: 3, color: 'var(--mgd)' }}>A Depositar en Banco</p>
              <p className="mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--mgd)' }}>${D(aDepositar)}</p>
            </div>

            <div>
              <label className="lbl">Observaciones{isEdit ? ' / Motivo de corrección' : ''}</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} className="inp" rows={2} style={{ resize: 'vertical' }}
                placeholder={isEdit ? 'Explica el motivo de la corrección...' : 'Notas del cierre...'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ padding: 11 }}>Cancelar</button>
              <button onClick={confirmar} disabled={loading || loadingStats} className="btn btn-mg" style={{ padding: 11 }}>
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