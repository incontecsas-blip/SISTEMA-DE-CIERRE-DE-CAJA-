'use client';
import { useState, useEffect, useCallback } from 'react';
import { cierresAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { DateBar, Empty, D } from '@/components/ui';
import { inRango } from '@/lib/utils';
import type { Cierre, DateFilter } from '@/types';
import CierreModal from '@/components/modals/CierreModal';
export default function HistorialPage() {
  const { isAdmin, notify } = useApp();
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [f, setF] = useState<DateFilter>({ modo: 'mes' });
  const [editCierre, setEditCierre] = useState<Cierre | null>(null);

  const load = useCallback(async () => {
    const { data } = await cierresAPI.getAll();
    setCierres(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filt = cierres.filter(h => inRango(h.fecha_iso, f));

  const reimprimir = (h: Cierre) => {
    const w = window.open('', '_blank', 'width=440,height=720');
    if (!w) return notify('Habilita popups', 'warn');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:9pt;width:80mm;padding:3mm 4mm}div{line-height:1.8}</style></head><body>
    <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:5px"><b>CIERRE DE CAJA — REIMP.</b></div>
    <div><b>Fecha:</b> ${new Date(h.fecha).toLocaleDateString('es-EC')}</div>
    <div><b>Cajero:</b> ${h.cajero}</div>
    <div style="border-top:1px dashed #000;margin:5px 0;padding-top:4px">
      <div style="display:flex;justify-content:space-between"><span>Ventas:</span><span>$${D(h.ventas)}</span></div>
      <div style="display:flex;justify-content:space-between"><span>Utilidad:</span><span>$${D(h.utilidad)}</span></div>
      <div style="display:flex;justify-content:space-between"><span>Egresos:</span><span>-$${D(h.egresos)}</span></div>
    </div>
    <div style="border-top:1px dashed #000;margin:5px 0;padding-top:4px">
      <div style="display:flex;justify-content:space-between"><span>Contado:</span><span>$${D(h.contado)}</span></div>
      <div style="display:flex;justify-content:space-between"><span>Diferencia:</span><span>${+h.dif >= 0 ? '+' : ''}$${D(h.dif)}</span></div>
      <div style="display:flex;justify-content:space-between"><span>Fondo vuelto:</span><span>$${D(h.fondo_vuelto)}</span></div>
      <div style="display:flex;justify-content:space-between"><b>A DEPOSITAR:</b><b>$${D(h.a_depositar)}</b></div>
      <div style="display:flex;justify-content:space-between"><span>Depositado:</span><span>$${D(h.total_depositado)}</span></div>
      <div style="display:flex;justify-content:space-between"><b>SALDO PEND.:</b><b>$${D(h.saldo_pendiente)}</b></div>
    </div>
    ${h.obs ? `<div style="border-top:1px dashed #000;margin-top:5px;padding-top:4px;font-size:8pt">Obs: ${h.obs}</div>` : ''}
    <div style="text-align:center;border-top:1px dashed #000;margin-top:5px;font-size:7.5pt">REIMP. · ${new Date().toLocaleString('es-EC')}</div>
    </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  const del = async (id: number) => {
    if (!confirm('¿Eliminar este cierre?')) return;
    await cierresAPI.delete(id);
    setCierres(p => p.filter(h => h.id !== id));
    notify('Cierre eliminado');
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Historial de <span style={{ color: 'var(--amb)' }}>Cierres</span></h1>
      </div>
      <DateBar f={f} setF={setF} />

      <div className="card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th><th>Cajero</th><th>Ventas</th><th>Egresos</th>
                <th>Utilidad</th><th>Contado</th><th>F.Vuelto</th>
                <th>A Dep.</th><th>Depositado</th><th>Saldo</th><th>Dif.</th>
                <th></th>{isAdmin && <th></th>}{isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filt.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 700, fontSize: 12 }}>{new Date(h.fecha).toLocaleDateString('es-EC')}</td>
                  <td>{h.cajero}</td>
                  <td className="mono" style={{ color: 'var(--grn)' }}>+${D(h.ventas)}</td>
                  <td className="mono" style={{ color: 'var(--red)' }}>-${D(h.egresos)}</td>
                  <td className="mono" style={{ color: 'var(--cyd)' }}>${D(h.utilidad)}</td>
                  <td className="mono">${D(h.contado)}</td>
                  <td className="mono" style={{ color: 'var(--amb)' }}>${D(h.fondo_vuelto)}</td>
                  <td className="mono" style={{ color: 'var(--mg)', fontWeight: 800 }}>${D(h.a_depositar)}</td>
                  <td className="mono" style={{ color: 'var(--grn)' }}>${D(h.total_depositado)}</td>
                  <td>
                    <span className="mono" style={{ fontWeight: 800, color: +h.saldo_pendiente > 0.005 ? 'var(--red)' : 'var(--grn)' }}>
                      ${D(h.saldo_pendiente)}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ background: +h.dif === 0 ? 'var(--grnl)' : +h.dif > 0 ? 'var(--ambl)' : 'var(--redl)', color: +h.dif === 0 ? 'var(--grn)' : +h.dif > 0 ? '#92400e' : 'var(--red)' }}>
                      {+h.dif >= 0 ? '+' : ''}${D(h.dif)}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => reimprimir(h)} style={{ background: 'var(--cyl)', border: '1px solid var(--cy)', color: 'var(--cyd)', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 7, fontFamily: 'Nunito,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      <i className="fas fa-print"></i> Imprimir
                    </button>
                  </td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => setEditCierre(h)} style={{ background: 'var(--ambl)', border: '1px solid var(--amb)', color: '#92400e', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 7, fontFamily: 'Nunito,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <i className="fas fa-pencil"></i> Corregir
                      </button>
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      <button onClick={() => del(h.id)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 12 }}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!filt.length && <Empty msg="No hay cierres" icon="fa-calendar-xmark" />}
            </tbody>
          </table>
        </div>
      </div>

      {/* Abre el mismo CierreModal pero en modo edición */}
      {editCierre && (
        <CierreModal
          editCierre={editCierre}
          onClose={() => setEditCierre(null)}
          onSaved={updated => {
            setCierres(p => p.map(h => h.id === updated.id ? updated : h));
            setEditCierre(null);
          }}
        />
      )}
    </div>
  );
}