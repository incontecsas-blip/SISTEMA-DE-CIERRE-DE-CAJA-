'use client';
import { useState, useEffect } from 'react';
import { ventasAPI, configAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { D } from '@/components/ui';
import type { Servicio, Config } from '@/types';
import { useModalClose } from '@/hooks/useModalClose';

const METODOS_DEF = ['Efectivo', 'Transferencia', 'Zelle', 'Tarjeta'];

interface CartItem { nombre: string; cant: number; pUnit: number; total: number; utilidad: number; cat: string; }

export default function POSPage() {
  const { user, notify } = useApp();
  const [cfg, setCfg] = useState<Partial<Config>>({ precioBN: 0.05, precioColor: 0.15, servicios: [], metodos: METODOS_DEF });
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [pos, setPos] = useState({ cliente: '', metodo: 'Efectivo', recibido: '', cTipo: 'bn', cQty: 1, cPrecio: 0.05, filtro: 'Todos' });
  const [mSvc, setMSvc] = useState(false);
  const [svcA, setSvcA] = useState<Servicio | null>(null);
  const [svcIn, setSvcIn] = useState({ base: '', qty: 1, desc: '', gananciaCustom: '' });
  const [mOK, setMOK] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastVuelto, setLastVuelto] = useState(0);
  const [lastMetodo, setLastMetodo] = useState('');
  const [tab, setTab] = useState<'catalogo' | 'carrito' | 'pago'>('catalogo');

  useEffect(() => {
    configAPI.get().then(r => {
      const c = r.data;
      setCfg({ precioBN: +c.precio_bn || 0.05, precioColor: +c.precio_color || 0.15, servicios: c.servicios || [], metodos: c.metodos_pago || METODOS_DEF });
      setPos(p => ({ ...p, cPrecio: +c.precio_bn || 0.05 }));
    }).catch(() => {});
  }, []);

  const syncPrecio = (tipo: string) => setPos(p => ({ ...p, cTipo: tipo, cPrecio: tipo === 'bn' ? (cfg.precioBN ?? 0.05) : (cfg.precioColor ?? 0.15) }));
  const total = carrito.reduce((a, i) => a + i.total, 0);
  const svcFilt = pos.filtro === 'Todos' ? (cfg.servicios ?? []) : (cfg.servicios ?? []).filter(s => s.categoria === pos.filtro);

  const addCopy = () => {
    const qty = pos.cQty || 1, pU = pos.cPrecio, t = pos.cTipo === 'bn' ? 'B/N' : 'Color';
    setCarrito(p => [...p, { nombre: `Copia ${t}`, cant: qty, pUnit: pU, total: +(qty * pU).toFixed(2), utilidad: +(qty * pU).toFixed(2), cat: 'Copias' }]);
    setPos(p => ({ ...p, cQty: 1 }));
    notify(`${qty} copia${qty > 1 ? 's' : ''} agregada${qty > 1 ? 's' : ''}`);
  };

  // Actualizar cantidad en carrito directamente
  const updateQty = (i: number, newQty: number) => {
    if (newQty < 1) return;
    setCarrito(p => p.map((it, j) => {
      if (j !== i) return it;
      const newTotal = +(it.pUnit * newQty).toFixed(2);
      const ratio = it.cant > 0 ? it.utilidad / it.total : 1;
      return { ...it, cant: newQty, total: newTotal, utilidad: +(newTotal * ratio).toFixed(2) };
    }));
  };

  const confirmSvc = () => {
    if (!svcA) return;
    const s = svcA;
    let nombre = s.nombre, cant = +svcIn.qty || 1, total, utilidad, pUnit: number;
    if (s.tipo === 'monto_variable') {
      const base = +svcIn.base || 0;
      const gan = s.gananciaMod ? (+svcIn.gananciaCustom || s.ganancia || 0) : (s.ganancia || 0);
      total = +(base + gan).toFixed(2); utilidad = gan; pUnit = total; cant = 1;
      if (svcIn.desc) nombre += ` (${svcIn.desc})`;
    } else {
      pUnit = s.precioFijo || 0;
      const gan = s.gananciaMod ? (+svcIn.gananciaCustom || pUnit) : pUnit;
      total = +(pUnit * cant).toFixed(2); utilidad = +(gan * cant).toFixed(2);
    }
    setCarrito(p => [...p, { nombre, cant, pUnit, total, utilidad, cat: s.categoria }]);
    setMSvc(false);
    // ✅ NO cambiamos de pestaña — el usuario se queda en el catálogo
    notify(`${nombre} agregado ✓`);
  };

  const procesarVenta = async () => {
    if (!carrito.length) return;
    const ctr = parseInt(localStorage.getItem('cc_ctr') ?? '1000') + 1;
    localStorage.setItem('cc_ctr', String(ctr));
    const utilidad = carrito.reduce((a, i) => a + i.utilidad, 0);
    const vuelto = pos.metodo === 'Efectivo' && +pos.recibido > total ? +((+pos.recibido) - total).toFixed(2) : 0;
    try {
      await ventasAPI.create({
        id: Date.now(), numero: String(ctr).padStart(6, '0'),
        fecha: new Date().toLocaleDateString('es-EC'),
        hora: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        fechaISO: new Date().toISOString().slice(0, 10),
        cajero: user?.nombre, cliente: pos.cliente,
        items: carrito, metodo: pos.metodo,
        total: +total.toFixed(2), utilidad: +utilidad.toFixed(2),
        pagoServicio: +(total - utilidad).toFixed(2),
        recibido: +(pos.recibido || total), vuelto,
      });
      setLastTotal(total); setLastVuelto(vuelto); setLastMetodo(pos.metodo);
      setCarrito([]); setPos(p => ({ ...p, cliente: '', recibido: '' }));
      setMOK(true); setTab('catalogo');
    } catch { notify('Error al procesar venta', 'error'); }
  };

  const overlayPropsSvc = useModalClose(() => setMSvc(false));
  const overlayPropsOK  = useModalClose(() => setMOK(false));

  // ── Bloque copias ──
  const CopiasCatalogo = () => (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyd)', textTransform: 'uppercase', marginBottom: 10 }}>
        <i className="fas fa-print" style={{ marginRight: 5 }}></i>Copias e Impresiones
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
        <select value={pos.cTipo} onChange={e => syncPrecio(e.target.value)} className="inp" style={{ flex: 1, minWidth: 120, padding: '7px 8px', fontSize: 11.5 }}>
          <option value="bn">B/N — ${D(cfg.precioBN)}</option>
          <option value="color">Color — ${D(cfg.precioColor)}</option>
        </select>
        <input type="number" min="1" value={pos.cQty} onChange={e => setPos(p => ({ ...p, cQty: +e.target.value || 1 }))} className="inp" style={{ width: 70, padding: 7, fontSize: 13, fontWeight: 700 }} />
        <input type="number" step="0.01" value={pos.cPrecio} onChange={e => setPos(p => ({ ...p, cPrecio: +e.target.value || 0 }))} className="inp mono" style={{ width: 70, padding: 7, fontSize: 12 }} />
        <button onClick={addCopy} className="btn btn-cy" style={{ padding: '7px 12px' }}>
          <i className="fas fa-plus"></i> ${D(pos.cQty * pos.cPrecio)}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {[1, 5, 10, 20, 50, 100, 200, 500].map(q => (
          <button key={q} onClick={() => setPos(p => ({ ...p, cQty: q }))}
            style={{ padding: '3px 8px', borderRadius: 6, border: `1.5px solid ${pos.cQty === q ? 'var(--cy)' : 'var(--brd)'}`, background: pos.cQty === q ? 'var(--cyl)' : 'var(--bg)', color: pos.cQty === q ? 'var(--cyd)' : 'var(--t3)', fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Catálogo servicios ──
  const ServiciosCatalogo = () => (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 6, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyd)', textTransform: 'uppercase' }}>
          <i className="fas fa-bolt" style={{ marginRight: 5 }}></i>Servicios y Productos
        </p>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['Todos', 'Recargas', 'Pagos', 'Trámites', 'Fotos', 'Otros'].map(cat => (
            <button key={cat} onClick={() => setPos(p => ({ ...p, filtro: cat }))}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1.5px solid var(--brd)', background: pos.filtro === cat ? 'var(--cy)' : 'var(--bg)', color: pos.filtro === cat ? '#fff' : 'var(--t3)', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 6 }}>
        {svcFilt.map(s => (
          <button key={s.id}
            onClick={e => { e.stopPropagation(); setSvcA(s); setSvcIn({ base: '', qty: 1, desc: '', gananciaCustom: '' }); setMSvc(true); }}
            style={{ padding: '10px 5px', borderRadius: 10, border: '1.5px solid var(--brd)', background: 'var(--wh)', cursor: 'pointer', textAlign: 'center', fontFamily: 'Nunito,sans-serif', transition: 'all .15s' }}>
            <span style={{ fontSize: 20, display: 'block', marginBottom: 2 }}>{s.emoji}</span>
            <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3, display: 'block' }}>{s.nombre}</span>
            {s.esProducto && s.stock != null && (
              <span style={{ display: 'inline-block', padding: '1px 5px', background: 'var(--cyl)', borderRadius: 4, fontSize: 8, fontWeight: 700, color: 'var(--cyd)', marginTop: 2 }}>
                Stock: {s.stock}
              </span>
            )}
            {s.precioFijo ? <span className="mono" style={{ fontSize: 8.5, color: 'var(--cyd)', display: 'block' }}>${D(s.precioFijo)}</span> : null}
            {s.gananciaMod ? <span style={{ display: 'inline-block', padding: '1px 4px', background: 'var(--mgl)', borderRadius: 4, fontSize: 7.5, fontWeight: 700, color: 'var(--mgd)', marginTop: 2 }}>Libre</span> : null}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Carrito con edición de cantidad ──
  const CarritoContent = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--t2)' }}>
          <i className="fas fa-shopping-basket" style={{ color: 'var(--cy)', marginRight: 5 }}></i>Carrito
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          <span className="badge" style={{ background: 'var(--cyl)', color: 'var(--cyd)' }}>{carrito.length}</span>
          {carrito.length > 0 && <button onClick={() => setCarrito([])} className="btn btn-ghost btn-sm" style={{ padding: '3px 6px', fontSize: 10 }}><i className="fas fa-trash"></i></button>}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 9, minHeight: 0 }}>
        {carrito.map((it, i) => (
          <div key={i} style={{ background: 'var(--bg)', border: '1.5px solid var(--brd)', borderRadius: 9, padding: '8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>{it.nombre}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--cyd)' }}>${D(it.total)}</span>
                <button onClick={() => setCarrito(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 13 }}>
                  <i className="fas fa-times-circle"></i>
                </button>
              </div>
            </div>
            {/* Controles de cantidad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => updateQty(i, it.cant - 1)} disabled={it.cant <= 1}
                style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid var(--brd)', background: 'var(--wh)', color: 'var(--t2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                −
              </button>
              <input
                type="number" min="1"
                value={it.cant}
                onChange={e => updateQty(i, parseInt(e.target.value) || 1)}
                onClick={e => (e.target as HTMLInputElement).select()}
                style={{ width: 44, textAlign: 'center', border: '1.5px solid var(--cy)', borderRadius: 7, padding: '3px 4px', fontSize: 13, fontWeight: 800, fontFamily: 'JetBrains Mono,monospace', background: 'var(--cyl)', color: 'var(--cyd)', outline: 'none' }}
              />
              <button onClick={() => updateQty(i, it.cant + 1)}
                style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid var(--cy)', background: 'var(--cyl)', color: 'var(--cyd)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                +
              </button>
              <span style={{ fontSize: 9.5, color: 'var(--t3)', marginLeft: 2 }}>× ${D(it.pUnit)}</span>
            </div>
          </div>
        ))}
        {!carrito.length && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 7, color: 'var(--t4)' }}>
            <i className="fas fa-shopping-basket" style={{ fontSize: 24, opacity: .3 }}></i>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: .5 }}>Carrito vacío</span>
          </div>
        )}
      </div>
      <div style={{ background: 'linear-gradient(135deg,var(--cyl),#d5f6fb)', border: '2px solid var(--cy)', borderRadius: 11, padding: '10px 13px', flexShrink: 0, textAlign: 'center' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyd)', textTransform: 'uppercase', marginBottom: 2 }}>Total a Cobrar</p>
        <p className="mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--cyd)' }}>${D(total)}</p>
      </div>
    </>
  );

  // ── Pago ──
  const PagoContent = () => (
    <>
      <div style={{ marginBottom: 9, flexShrink: 0 }}>
        <input value={pos.cliente} onChange={e => setPos(p => ({ ...p, cliente: e.target.value }))} className="inp" placeholder="👤 Cliente (opcional)" style={{ fontSize: 12 }} />
      </div>
      <p className="lbl" style={{ marginBottom: 8 }}>Método de Pago</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 9, flexShrink: 0 }}>
        {(cfg.metodos ?? METODOS_DEF).map(m => (
          <button key={m} onClick={() => setPos(p => ({ ...p, metodo: m }))}
            style={{ padding: '8px 4px', borderRadius: 8, border: '1.5px solid var(--brd)', background: pos.metodo === m ? 'var(--cy)' : 'var(--bg)', color: pos.metodo === m ? '#fff' : 'var(--t2)', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
            {m}
          </button>
        ))}
      </div>
      {pos.metodo === 'Efectivo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 9, flexShrink: 0 }}>
          <div>
            <label className="lbl">Recibido $</label>
            <input type="number" value={pos.recibido} onChange={e => setPos(p => ({ ...p, recibido: e.target.value }))} className="inp mono" placeholder="0.00" style={{ fontSize: 13 }} />
          </div>
          <div>
            <label className="lbl">Vuelto</label>
            <div className="inp mono" style={{ fontSize: 13, fontWeight: 700, color: +pos.recibido > total ? 'var(--grn)' : 'var(--red)', cursor: 'default', display: 'flex', alignItems: 'center' }}>
              ${D(+pos.recibido > total ? +pos.recibido - total : 0)}
            </div>
          </div>
        </div>
      )}
      <button onClick={procesarVenta} disabled={!carrito.length} className="btn btn-gr"
        style={{ width: '100%', padding: 13, fontSize: 13, borderRadius: 10, marginTop: 'auto' }}>
        <i className="fas fa-check-circle"></i> COBRAR ${D(total)}
      </button>
    </>
  );

  return (
    <div className="fade-in">
      {/* ── DESKTOP: 3 columnas ── */}
      <div className="pos-desktop" style={{ display: 'grid', gridTemplateColumns: '1fr 300px 240px', gap: 12, height: 'calc(100vh - 44px)', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minHeight: 0 }}>
          <CopiasCatalogo />
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}><ServiciosCatalogo /></div>
        </div>
        <div className="card" style={{ padding: 13, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <CarritoContent />
        </div>
        <div className="card" style={{ padding: 13, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <PagoContent />
        </div>
      </div>

      {/* ── MOBILE: tabs ── */}
      <style>{`
        @media (max-width: 768px) { .pos-desktop { display: none !important; } .pos-mobile { display: flex !important; } }
        @media (min-width: 769px) { .pos-mobile { display: none !important; } }
      `}</style>
      <div className="pos-mobile" style={{ flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: 0, display: 'none' }}>
        {/* Tab bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 10, flexShrink: 0 }}>
          {([['catalogo', 'Catálogo', 'fas fa-th'], ['carrito', 'Carrito', 'fas fa-shopping-basket'], ['pago', 'Pago', 'fas fa-credit-card']] as const).map(([t, l, ic]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '8px 4px', borderRadius: 9, border: `2px solid ${tab === t ? 'var(--cy)' : 'var(--brd)'}`, background: tab === t ? 'var(--cy)' : 'var(--wh)', color: tab === t ? '#fff' : 'var(--t3)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <i className={ic}></i>{l}
              {t === 'carrito' && carrito.length > 0 && (
                <span style={{ background: tab === t ? 'rgba(255,255,255,.3)' : 'var(--cy)', color: '#fff', borderRadius: 100, width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900 }}>{carrito.length}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {tab === 'catalogo' && <><CopiasCatalogo /><ServiciosCatalogo /></>}

          {tab === 'carrito' && (
            <div className="card" style={{ padding: 13, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <CarritoContent />
              {carrito.length > 0 && (
                <button onClick={() => setTab('pago')} className="btn btn-cy" style={{ width: '100%', padding: 13, fontSize: 13, marginTop: 10, flexShrink: 0 }}>
                  <i className="fas fa-arrow-right"></i> Ir a Cobrar
                </button>
              )}
            </div>
          )}

          {tab === 'pago' && (
            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ background: 'var(--cyl)', border: '2px solid var(--cy)', borderRadius: 12, padding: '10px 16px', textAlign: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyd)', textTransform: 'uppercase', marginBottom: 3 }}>Total</p>
                <p className="mono" style={{ fontSize: 34, fontWeight: 800, color: 'var(--cyd)' }}>${D(total)}</p>
              </div>
              <PagoContent />
            </div>
          )}
        </div>
      </div>

      {/* ── Modal servicio ── */}
      {mSvc && svcA && (
        <div className="modal-overlay" {...overlayPropsSvc}>
          <div className="modal-box" style={{ width: 390, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 38 }}>{svcA.emoji}</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 900 }}>{svcA.nombre}</p>
                <p style={{ fontSize: 11, color: 'var(--t3)' }}>{svcA.categoria}</p>
                {svcA.esProducto && svcA.stock != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--cyl)', borderRadius: 5, fontSize: 10, fontWeight: 700, color: 'var(--cyd)', marginTop: 3 }}>
                    <i className="fas fa-boxes-stacked" style={{ fontSize: 9 }}></i>Stock disponible: {svcA.stock}
                  </span>
                )}
                {svcA.gananciaMod && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--mgl)', borderRadius: 5, fontSize: 9.5, fontWeight: 700, color: 'var(--mgd)', marginTop: 3, marginLeft: 4 }}>
                    <i className="fas fa-pencil" style={{ fontSize: 9 }}></i>Ganancia libre
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {svcA.tipo === 'monto_variable' && (
                <div>
                  <label className="lbl">Monto del servicio ($)</label>
                  <input type="number" step="0.01" value={svcIn.base} onChange={e => setSvcIn(p => ({ ...p, base: e.target.value }))}
                    className="inp mono" placeholder="0.00" autoFocus style={{ fontSize: 16, fontWeight: 700 }} />
                  {svcA.ganancia != null && !svcA.gananciaMod && (
                    <div style={{ marginTop: 7, padding: '9px 11px', background: 'var(--cyl)', border: '1.5px solid var(--cy)', borderRadius: 9, fontSize: 12, color: 'var(--cyd)' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>Ganancia: <strong>${D(svcA.ganancia)}</strong>
                    </div>
                  )}
                  {svcA.gananciaMod && (
                    <div style={{ marginTop: 9 }}>
                      <label className="lbl" style={{ color: 'var(--mgd)' }}><i className="fas fa-pencil" style={{ marginRight: 4 }}></i>Tu ganancia ($)</label>
                      <input type="number" step="0.01" value={svcIn.gananciaCustom} onChange={e => setSvcIn(p => ({ ...p, gananciaCustom: e.target.value }))}
                        className="inp mono" placeholder={D(svcA.ganancia ?? 0)} style={{ fontSize: 15, fontWeight: 700 }} />
                    </div>
                  )}
                </div>
              )}

              {svcA.tipo === 'cantidad' && (
                <div>
                  <label className="lbl">Cantidad{svcA.esProducto ? ' (producto)' : ''}</label>
                  <input
                    type="number" min="1"
                    max={svcA.esProducto && svcA.stock != null ? svcA.stock : undefined}
                    value={svcIn.qty}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 1;
                      const max = svcA.esProducto && svcA.stock != null ? svcA.stock : 9999;
                      setSvcIn(p => ({ ...p, qty: Math.min(v, max) }));
                    }}
                    className="inp"
                    autoFocus
                    style={{ fontSize: 16, fontWeight: 700, marginBottom: 7 }}
                  />
                  <div style={{ padding: '8px 11px', background: 'var(--bg)', borderRadius: 9, border: '1px solid var(--brd)', fontSize: 12 }}>
                    <span style={{ color: 'var(--t3)' }}>Precio unitario: </span>
                    <strong className="mono">${D(svcA.precioFijo)}</strong>
                    <span style={{ color: 'var(--t3)', marginLeft: 10 }}>Total: </span>
                    <strong className="mono" style={{ color: 'var(--cyd)', fontSize: 14 }}>${D((svcIn.qty || 1) * (svcA.precioFijo ?? 0))}</strong>
                  </div>
                  {svcA.gananciaMod && (
                    <div style={{ marginTop: 9 }}>
                      <label className="lbl" style={{ color: 'var(--mgd)' }}>Tu ganancia ($)</label>
                      <input type="number" step="0.01" value={svcIn.gananciaCustom} onChange={e => setSvcIn(p => ({ ...p, gananciaCustom: e.target.value }))} className="inp mono" style={{ fontSize: 14 }} />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="lbl">Referencia (opcional)</label>
                <input value={svcIn.desc} onChange={e => setSvcIn(p => ({ ...p, desc: e.target.value }))} className="inp" placeholder="N° cuenta, cédula, contrato..." style={{ fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <button onClick={() => setMSvc(false)} className="btn btn-ghost" style={{ padding: 12 }}>Cancelar</button>
              <button onClick={confirmSvc} className="btn btn-cy" style={{ padding: 12 }}>
                <i className="fas fa-plus"></i> Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal cobro exitoso ── */}
      {mOK && (
        <div className="modal-overlay" {...overlayPropsOK}>
          <div className="modal-box" style={{ width: 320, padding: 26 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,var(--grn),#059669)', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-check" style={{ fontSize: 26, color: '#fff' }}></i>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>¡Cobro Exitoso!</h3>
              <p className="mono" style={{ fontSize: 30, fontWeight: 800, color: 'var(--grn)', margin: '7px 0' }}>${D(lastTotal)}</p>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 7 }}>{lastMetodo}</p>
              {lastVuelto > 0 && (
                <div style={{ background: 'var(--ambl)', border: '1.5px solid var(--amb)', borderRadius: 9, padding: '8px 13px', marginBottom: 14 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#92400e' }}>Vuelto: <span className="mono">${D(lastVuelto)}</span></span>
                </div>
              )}
              <button onClick={() => setMOK(false)} className="btn btn-cy" style={{ width: '100%', padding: 13, marginTop: 10 }}>
                <i className="fas fa-check"></i> Listo — Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}