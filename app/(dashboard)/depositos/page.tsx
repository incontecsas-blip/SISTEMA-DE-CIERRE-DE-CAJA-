'use client';
import { useState, useEffect, useCallback } from 'react';
import { depositosAPI, cierresAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { DateBar, Modal, Empty, D } from '@/components/ui';
import { inRango, isoHoy } from '@/lib/utils';
import type { Cierre, Deposito, DateFilter } from '@/types';

export default function DepositosPage() {
  const { user, isAdmin, notify } = useApp();
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [f, setF] = useState<DateFilter>({ modo: 'mes' });
  const [mDep, setMDep] = useState(false);
  const [depF, setDepF] = useState({ fecha: isoHoy(), banco: '', ref: '', monto: '' });

  const load = useCallback(async () => {
    const [cR, dR] = await Promise.all([cierresAPI.getAll(), depositosAPI.getAll()]);
    setCierres(cR.data); setDepositos(dR.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const cFilt = cierres.filter(h => inRango(h.fecha_iso, f));
  const dFilt = depositos.filter(d => inRango(d.fecha_dep, f));
  const pendientes = cFilt.filter(h => +h.saldo_pendiente > 0.005);
  const totalSel = cierres.filter(h => sel.includes(h.id)).reduce((a, h) => a + +h.saldo_pendiente, 0);

  const regDeposito = async () => {
    if (!depF.banco.trim() || !depF.ref.trim()) return notify('Completa banco y referencia', 'error');
    const ids = sel.length ? sel : pendientes.map(h => h.id);
    if (!ids.length) return notify('Sin cierres pendientes', 'error');
    const monto = parseFloat(depF.monto) || totalSel;
    if (!monto) return notify('Monto inválido', 'error');
    const cSel = cierres.filter(h => ids.includes(h.id) && +h.saldo_pendiente > 0.005);
    const sTot = cSel.reduce((a, h) => a + +h.saldo_pendiente, 0);
    const distribucion: Record<number, number> = {};
    let resto = monto;
    cSel.forEach((h, i) => {
      const prop = sTot > 0 ? +h.saldo_pendiente / sTot : 1 / cSel.length;
      const m = i === cSel.length - 1 ? +resto.toFixed(2) : +Math.min(+h.saldo_pendiente, monto * prop).toFixed(2);
      distribucion[h.id] = m; resto = +(resto - m).toFixed(2);
    });
    const fechas = cSel.map(h => new Date(h.fecha));
    const mn = fechas.reduce((a, b) => a < b ? a : b);
    const mx = fechas.reduce((a, b) => a > b ? a : b);
    const fmt = (d: Date) => d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' });
    const periodo = mn.toDateString() === mx.toDateString() ? fmt(mn) : `${fmt(mn)} al ${fmt(mx)}`;
    try {
      await depositosAPI.create({ id: Date.now(), fechaDep: depF.fecha, banco: depF.banco, ref: depF.ref, monto, cierreIds: ids, cajero: user?.nombre, periodo, distribucion });
      notify('Depósito registrado ✓'); setMDep(false); setSel([]); load();
    } catch { notify('Error', 'error'); }
  };

  const del = async (id: number) => {
    if (!confirm('¿Eliminar? Se revertirán los saldos.')) return;
    await depositosAPI.delete(id); notify('Eliminado'); load();
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Cruce con <span style={{ color: 'var(--mg)' }}>Banco</span></h1>
        <button className="btn btn-mg" onClick={() => setMDep(true)}><i className="fas fa-plus"></i> Nuevo Depósito</button>
      </div>
      <DateBar f={f} setF={setF} />
      <div className="card" style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--brd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="lbl" style={{ margin: 0 }}>Cierres — Estado de Conciliación</p>
          <span className="badge" style={{ background: 'var(--mgl)', color: 'var(--mgd)' }}>{pendientes.length} pendientes</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th style={{ width: 36 }}><input type="checkbox" className="chk" onChange={e => setSel(e.target.checked ? pendientes.map(h => h.id) : [])} /></th><th>Fecha</th><th>Cajero</th><th>A Depositar</th><th>Depositado</th><th>Saldo</th><th>Dif.</th></tr></thead>
            <tbody>
              {cFilt.map(h => (
                <tr key={h.id}>
                  <td><input type="checkbox" className="chk" checked={sel.includes(h.id)} onChange={e => setSel(p => e.target.checked ? [...p, h.id] : p.filter(x => x !== h.id))} disabled={+h.saldo_pendiente <= 0.005} /></td>
                  <td className="mono" style={{ fontWeight: 700 }}>{new Date(h.fecha).toLocaleDateString('es-EC')}</td>
                  <td>{h.cajero}</td>
                  <td className="mono" style={{ color: 'var(--mg)', fontWeight: 800 }}>${D(h.a_depositar)}</td>
                  <td className="mono" style={{ color: 'var(--grn)' }}>${D(h.total_depositado)}</td>
                  <td><span className="mono" style={{ fontWeight: 800, color: +h.saldo_pendiente > 0.005 ? 'var(--red)' : 'var(--grn)' }}>${D(h.saldo_pendiente)}</span></td>
                  <td><span className="badge" style={{ background: +h.dif === 0 ? 'var(--grnl)' : 'var(--ambl)', color: +h.dif === 0 ? 'var(--grn)' : '#92400e' }}>{+h.dif >= 0 ? '+' : ''}${D(h.dif)}</span></td>
                </tr>
              ))}
              {!cFilt.length && <Empty />}
            </tbody>
          </table>
        </div>
        {sel.length > 0 && (
          <div style={{ padding: '11px 16px', borderTop: '1px solid var(--brd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cyl)' }}>
            <div><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyd)' }}>{sel.length} cierre{sel.length > 1 ? 's' : ''} · Saldo:</span><span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--cyd)', marginLeft: 10 }}>${D(totalSel)}</span></div>
            <button className="btn btn-mg" style={{ padding: '8px 14px' }} onClick={() => setMDep(true)}><i className="fas fa-university"></i> Depositar</button>
          </div>
        )}
      </div>
      <div className="card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--brd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="lbl" style={{ margin: 0 }}>Historial de Depósitos</p>
          <span className="badge" style={{ background: 'var(--mgl)', color: 'var(--mgd)' }}>${D(dFilt.reduce((a, d) => a + +d.monto, 0))}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>Banco / Ref.</th><th>Cierres</th><th>Período</th><th style={{ textAlign: 'right' }}>Monto</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {dFilt.map(d => (
                <tr key={d.id}>
                  <td className="mono" style={{ fontSize: 11 }}>{d.fecha_dep}</td>
                  <td style={{ fontWeight: 700 }}>{d.banco}<div style={{ fontSize: 10.5, color: 'var(--t3)' }}>Ref: {d.ref}</div></td>
                  <td><span className="badge" style={{ background: 'var(--cyl)', color: 'var(--cyd)' }}>{(d.cierre_ids ?? []).length} cierre{(d.cierre_ids ?? []).length !== 1 ? 's' : ''}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--t3)' }}>{d.periodo}</td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontWeight: 800, color: 'var(--mg)', fontSize: 13.5 }}>${D(d.monto)}</span></td>
                  {isAdmin && <td><button onClick={() => del(d.id)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 12 }}><i className="fas fa-trash-alt"></i></button></td>}
                </tr>
              ))}
              {!dFilt.length && <Empty />}
            </tbody>
          </table>
        </div>
      </div>
      {mDep && (
        <Modal onClose={() => setMDep(false)} width={460}>
          <p style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}><i className="fas fa-university" style={{ color: 'var(--mg)', marginRight: 8 }}></i>Registrar Depósito Bancario</p>
          <div style={{ background: 'var(--mgl)', border: '1.5px solid var(--mg)', borderRadius: 11, padding: 12, marginBottom: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--mgd)', marginBottom: 3 }}>Saldo pendiente</p>
            <p className="mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--mgd)' }}>${D(totalSel)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {([['Fecha', 'fecha', 'date'], ['Banco', 'banco', 'text'], ['N° Referencia', 'ref', 'text']] as [string, keyof typeof depF, string][]).map(([lbl, k, t]) => (
              <div key={k}><label className="lbl">{lbl}</label><input type={t} value={depF[k]} onChange={e => setDepF(p => ({ ...p, [k]: e.target.value }))} className="inp mono" /></div>
            ))}
            <div>
              <label className="lbl">Monto a Depositar ($)</label>
              <input type="number" step="0.01" value={depF.monto} onChange={e => setDepF(p => ({ ...p, monto: e.target.value }))} className="inp mono" style={{ fontSize: 16, fontWeight: 700 }} placeholder={D(totalSel)} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={() => setDepF(p => ({ ...p, monto: String(+D(totalSel)) }))} className="btn btn-ghost btn-sm">Todo (${D(totalSel)})</button>
                <button onClick={() => setDepF(p => ({ ...p, monto: String(+D(totalSel / 2)) }))} className="btn btn-ghost btn-sm">Mitad (${D(totalSel / 2)})</button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <button onClick={() => setMDep(false)} className="btn btn-ghost" style={{ padding: 11 }}>Cancelar</button>
            <button onClick={regDeposito} className="btn btn-mg" style={{ padding: 11 }}><i className="fas fa-check"></i> Confirmar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
