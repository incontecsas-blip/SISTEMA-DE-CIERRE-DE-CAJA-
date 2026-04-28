'use client';
import { useState, useEffect } from 'react';
import { configAPI, usuariosAPI, auditoriaAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { Modal, D } from '@/components/ui';
import type { Servicio, Usuario, AuditLog } from '@/types';

const ALL_MODS = [
  { id:'dashboard',lbl:'Dashboard',icon:'fas fa-gauge-high' },
  { id:'pos',lbl:'Punto de Venta',icon:'fas fa-cash-register' },
  { id:'ingresos',lbl:'Ingresos',icon:'fas fa-arrow-up' },
  { id:'egresos',lbl:'Egresos',icon:'fas fa-arrow-down' },
  { id:'graficas',lbl:'Gráficas P&L',icon:'fas fa-chart-pie' },
  { id:'depositos',lbl:'Depósitos Banco',icon:'fas fa-university' },
  { id:'historial',lbl:'Historial Cierres',icon:'fas fa-history' },
];

export default function ConfiguracionPage() {
  const { notify } = useApp();
  const [cfg, setCfg] = useState({ negocio:'', ruc:'', dir:'', tel:'', logo:'', fondo:20, fondoVuelto:35, precioBN:0.05, precioColor:0.15, metodos:['Efectivo','Transferencia','Zelle','Tarjeta'], catsGasto:['Papel/Suministros','Toner/Tinta','Internet','Otros'], servicios:[] as Servicio[] });
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [auditoria, setAuditoria] = useState<AuditLog[]>([]);
  const [nuCat, setNuCat] = useState('');
  const [nu, setNu] = useState({ nombre:'', pin:'', rol:'cajero', modulos:['dashboard','pos'] });
  const [mPermisos, setMPermisos] = useState(false);
  const [uEdit, setUEdit] = useState<Usuario | null>(null);
  const [mAddSvc, setMAddSvc] = useState(false);
  const [mEditSvc, setMEditSvc] = useState(false);
  const [ns, setNs] = useState<Partial<Servicio>>({ emoji:'📋', nombre:'', categoria:'Otros', tipo:'monto_variable', ganancia:.50, precioFijo:.50, gananciaMod:false });
  const [eS, setES] = useState<Partial<Servicio>>({});

  useEffect(() => {
    configAPI.get().then(r => {
      const c = r.data;
      setCfg({ negocio:c.negocio??'', ruc:c.ruc??'', dir:c.direccion??'', tel:c.telefono??'', logo:c.logo??'', fondo:+c.fondo_inicial||20, fondoVuelto:+c.fondo_vuelto||35, precioBN:+c.precio_bn||0.05, precioColor:+c.precio_color||0.15, metodos:c.metodos_pago||['Efectivo'], catsGasto:c.cats_gasto||[], servicios:c.servicios||[] });
    }).catch(()=>{});
    usuariosAPI.getAll().then(r => setUsuarios(r.data)).catch(()=>{});
    auditoriaAPI.getAll().then(r => setAuditoria(r.data)).catch(()=>{});
  }, []);

  const saveCfg = async () => { try { await configAPI.save(cfg); notify('Guardado ✓'); } catch { notify('Error','error'); } };
  const addUser = async () => {
    if (!nu.nombre.trim()) return notify('Nombre requerido','error');
    if (!/^\d{4}$/.test(nu.pin)) return notify('PIN: 4 dígitos','error');
    try { const { data } = await usuariosAPI.create(nu); setUsuarios(p=>[...p,data]); setNu({nombre:'',pin:'',rol:'cajero',modulos:['dashboard','pos']}); notify('Usuario agregado'); }
    catch(e:unknown) { notify((e as {response?:{data?:{error?:string}}})?.response?.data?.error??'Error','error'); }
  };
  const guardarPermisos = async () => {
    if (!uEdit) return;
    try { const { data } = await usuariosAPI.update(uEdit.id, { modulos: uEdit.modulos }); setUsuarios(p=>p.map(u=>u.id===data.id?data:u)); setMPermisos(false); notify('Permisos actualizados'); }
    catch { notify('Error','error'); }
  };
  const toggleMod = (id: string) => setUEdit(p => p ? { ...p, modulos: p.modulos.includes(id) ? p.modulos.filter(m=>m!==id) : [...p.modulos,id] } : p);
  const addSvc = () => {
    if (!ns.nombre?.trim()) return notify('Nombre requerido','error');
    setCfg(p=>({...p,servicios:[...p.servicios,{id:Date.now(),...ns} as Servicio]}));
    setMAddSvc(false); setNs({emoji:'📋',nombre:'',categoria:'Otros',tipo:'monto_variable',ganancia:.50,precioFijo:.50,gananciaMod:false}); notify('Servicio agregado');
  };
  const saveEdit = () => {
    if (!eS.nombre?.trim()) return notify('Nombre requerido','error');
    setCfg(p=>({...p,servicios:p.servicios.map(s=>s.id===eS.id?{...eS} as Servicio:s)}));
    setMEditSvc(false); notify('Servicio actualizado');
  };
  const uploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 500000) return notify('Imagen muy grande (max 500KB)','warn');
    const r = new FileReader(); r.onload = ev => setCfg(p=>({...p,logo:ev.target?.result as string})); r.readAsDataURL(f);
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontSize:20, fontWeight:900, marginBottom:18 }}>Configuración</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Datos negocio */}
        <div className="card" style={{ padding:17 }}>
          <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}><i className="fas fa-store" style={{ marginRight:6, color:'var(--cy)' }}></i>Datos del Negocio</p>
          <div style={{ marginBottom:12, padding:12, background:'var(--bg)', borderRadius:10, border:'1.5px dashed var(--brd2)', textAlign:'center' }}>
            {cfg.logo ? <img src={cfg.logo} style={{ maxHeight:44, maxWidth:170, objectFit:'contain', marginBottom:7, display:'block', margin:'0 auto 7px' }} alt="logo" /> : <div style={{ color:'var(--t4)', fontSize:11.5, fontWeight:700, marginBottom:7 }}><i className="fas fa-image" style={{ fontSize:18, display:'block', marginBottom:4 }}></i>Logo del negocio</div>}
            <label className="btn btn-ghost btn-sm" style={{ cursor:'pointer' }}><i className="fas fa-upload" style={{ fontSize:10 }}></i> {cfg.logo?'Cambiar':'Subir Logo'}<input type="file" accept="image/*" onChange={uploadLogo} style={{ display:'none' }} /></label>
            {cfg.logo && <button onClick={()=>setCfg(p=>({...p,logo:''}))} className="btn btn-ghost btn-sm" style={{ marginLeft:5 }}><i className="fas fa-trash" style={{ fontSize:10 }}></i></button>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {([['Nombre','negocio'],['RUC / CI','ruc'],['Dirección','dir'],['Teléfono','tel']] as [string, keyof typeof cfg][]).map(([lbl,k])=>(
              <div key={k}><label className="lbl">{lbl}</label><input value={String(cfg[k])} onChange={e=>setCfg(p=>({...p,[k]:e.target.value}))} className="inp" /></div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div><label className="lbl">Fondo Inicial ($)</label><input type="number" step="0.01" value={cfg.fondo} onChange={e=>setCfg(p=>({...p,fondo:+e.target.value}))} className="inp mono" /></div>
              <div><label className="lbl">Fondo Vuelto ($)</label><input type="number" step="0.01" value={cfg.fondoVuelto} onChange={e=>setCfg(p=>({...p,fondoVuelto:+e.target.value}))} className="inp mono" /></div>
            </div>
            <button onClick={saveCfg} className="btn btn-cy" style={{ padding:11, marginTop:3 }}><i className="fas fa-save"></i> Guardar</button>
          </div>
        </div>

        {/* Usuarios */}
        <div className="card" style={{ padding:17 }}>
          <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}><i className="fas fa-users" style={{ marginRight:6, color:'var(--cy)' }}></i>Usuarios</p>
          <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:200, overflowY:'auto', marginBottom:12 }}>
            {usuarios.map(u=>(
              <div key={u.id} style={{ padding:'8px 11px', background:'var(--bg)', borderRadius:9, border:'1.5px solid var(--brd)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,var(--mg),var(--cy))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff', fontWeight:800, flexShrink:0 }}>{u.nombre.charAt(0)}</div>
                    <div><div style={{ fontSize:12, fontWeight:800 }}>{u.nombre}</div><div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase', fontWeight:700 }}>PIN: {u.pin} · {u.rol}</div></div>
                  </div>
                  {u.rol!=='admin' && (
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={()=>{setUEdit({...u,modulos:[...(u.modulos??[])]});setMPermisos(true);}} style={{ background:'var(--cyl)', border:'1px solid var(--cy)', color:'var(--cyd)', cursor:'pointer', fontSize:10, padding:'3px 8px', borderRadius:6, fontFamily:'Nunito,sans-serif', fontWeight:700 }}><i className="fas fa-shield-halved" style={{ fontSize:9, marginRight:3 }}></i>Módulos</button>
                      <button onClick={async()=>{if(!confirm('¿Desactivar?'))return;await usuariosAPI.delete(u.id);setUsuarios(p=>p.filter(x=>x.id!==u.id));}} style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer', fontSize:12 }}><i className="fas fa-trash-alt"></i></button>
                    </div>
                  )}
                </div>
                {u.rol!=='admin' && <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:6 }}>{ALL_MODS.filter(m=>(u.modulos??[]).includes(m.id)).map(m=><span key={m.id} className="badge" style={{ background:'var(--cyl)', color:'var(--cyd)', fontSize:8.5, padding:'2px 6px' }}>{m.lbl}</span>)}</div>}
              </div>
            ))}
          </div>
          <hr className="sep" />
          <p className="lbl" style={{ marginBottom:8 }}>Agregar Usuario</p>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            <input value={nu.nombre} onChange={e=>setNu(p=>({...p,nombre:e.target.value}))} className="inp" placeholder="Nombre completo" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
              <input value={nu.pin} onChange={e=>setNu(p=>({...p,pin:e.target.value}))} className="inp mono" placeholder="PIN 4 dígitos" maxLength={4} />
              <select value={nu.rol} onChange={e=>setNu(p=>({...p,rol:e.target.value,modulos:e.target.value==='admin'?[]:['dashboard','pos']}))} className="inp"><option value="cajero">Cajero</option><option value="admin">Admin</option></select>
            </div>
            {nu.rol==='cajero' && (
              <div style={{ padding:11, background:'var(--bg)', borderRadius:9, border:'1.5px solid var(--brd)' }}>
                <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', marginBottom:8 }}><i className="fas fa-shield-halved" style={{ color:'var(--cy)', marginRight:5 }}></i>Módulos habilitados</p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {ALL_MODS.map(m=>(
                    <label key={m.id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'5px 7px', borderRadius:7 }}>
                      <input type="checkbox" className="chk" checked={nu.modulos.includes(m.id)} onChange={e=>setNu(p=>({...p,modulos:e.target.checked?[...p.modulos,m.id]:p.modulos.filter(x=>x!==m.id)}))} />
                      <span style={{ fontSize:11, fontWeight:700 }}><i className={m.icon} style={{ width:14, color:'var(--cyd)', marginRight:3 }}></i>{m.lbl}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <button onClick={addUser} className="btn btn-cy" style={{ padding:9 }}><i className="fas fa-user-plus"></i> Agregar</button>
          </div>
        </div>
      </div>

      {/* Precios + Cats gasto */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card" style={{ padding:17 }}>
          <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', marginBottom:12 }}><i className="fas fa-print" style={{ marginRight:6, color:'var(--cy)' }}></i>Precios de Copias</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label className="lbl">B/N (USD)</label><input type="number" step="0.01" value={cfg.precioBN} onChange={e=>setCfg(p=>({...p,precioBN:+e.target.value}))} className="inp mono" /></div>
            <div><label className="lbl">Color (USD)</label><input type="number" step="0.01" value={cfg.precioColor} onChange={e=>setCfg(p=>({...p,precioColor:+e.target.value}))} className="inp mono" /></div>
          </div>
          <button onClick={saveCfg} className="btn btn-cy" style={{ width:'100%', padding:10 }}><i className="fas fa-save"></i> Guardar Precios</button>
        </div>
        <div className="card" style={{ padding:17 }}>
          <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', marginBottom:12 }}><i className="fas fa-tags" style={{ marginRight:6, color:'var(--red)' }}></i>Categorías de Egreso</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10, padding:8, background:'var(--bg)', borderRadius:9, border:'1px solid var(--brd)', minHeight:44 }}>
            {cfg.catsGasto.map((c,i)=>(<span key={c} className="badge" style={{ background:'var(--redl)', color:'var(--red)', padding:'5px 9px', gap:5, fontSize:10 }}>{c}<button onClick={()=>setCfg(p=>({...p,catsGasto:p.catsGasto.filter((_,j)=>j!==i)}))} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:11, padding:0, lineHeight:1 }}>×</button></span>))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input value={nuCat} onChange={e=>setNuCat(e.target.value)} className="inp" placeholder="Nueva categoría..." onKeyDown={e=>{if(e.key==='Enter'&&nuCat.trim()){setCfg(p=>({...p,catsGasto:[...p.catsGasto,nuCat.trim()]}));setNuCat('');}}} />
            <button onClick={()=>{if(nuCat.trim()){setCfg(p=>({...p,catsGasto:[...p.catsGasto,nuCat.trim()]}));setNuCat('');}}} className="btn btn-rd" style={{ padding:'8px 12px', flexShrink:0 }}><i className="fas fa-plus"></i></button>
          </div>
        </div>
      </div>

      {/* Servicios */}
      <div className="card" style={{ padding:17, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase' }}><i className="fas fa-th" style={{ marginRight:6, color:'var(--cy)' }}></i>Catálogo de Servicios</p>
          <button onClick={()=>setMAddSvc(true)} className="btn btn-cy btn-sm"><i className="fas fa-plus"></i> Agregar</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
          {cfg.servicios.map(s=>(
            <div key={s.id} style={{ padding:11, background:'var(--bg)', borderRadius:10, border:'1.5px solid var(--brd)', position:'relative', textAlign:'center', transition:'border-color .14s' }} onMouseOver={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--cy)'} onMouseOut={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--brd)'}>
              <div style={{ fontSize:22, marginBottom:3 }}>{s.emoji}</div>
              <div style={{ fontSize:11, fontWeight:800, lineHeight:1.3 }}>{s.nombre}</div>
              <div style={{ fontSize:9.5, color:'var(--t3)' }}>{s.categoria}</div>
              {s.precioFijo && <div className="mono" style={{ fontSize:9.5, color:'var(--cyd)', marginTop:2 }}>${D(s.precioFijo)}</div>}
              {s.ganancia && <div className="mono" style={{ fontSize:9, color:'var(--grn)' }}>+${D(s.ganancia)}</div>}
              {s.gananciaMod && <div style={{ marginTop:4, display:'inline-flex', alignItems:'center', gap:3, padding:'2px 6px', background:'var(--mgl)', borderRadius:4, fontSize:9, fontWeight:700, color:'var(--mgd)' }}><i className="fas fa-pencil" style={{ fontSize:8 }}></i>Libre</div>}
              <div style={{ position:'absolute', top:5, right:5, display:'flex', gap:3 }}>
                <button onClick={()=>{setES({...s});setMEditSvc(true);}} style={{ background:'var(--wh)', border:'1px solid var(--brd)', color:'var(--cyd)', cursor:'pointer', fontSize:9.5, padding:'3px 5px', borderRadius:5 }}><i className="fas fa-pencil"></i></button>
                <button onClick={()=>setCfg(p=>({...p,servicios:p.servicios.filter(x=>x.id!==s.id)}))} style={{ background:'var(--wh)', border:'1px solid var(--brd)', color:'var(--red)', cursor:'pointer', fontSize:9.5, padding:'3px 5px', borderRadius:5 }}><i className="fas fa-times"></i></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auditoría */}
      <div className="card" style={{ borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'11px 16px', borderBottom:'1px solid var(--brd)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p className="lbl" style={{ margin:0 }}><i className="fas fa-shield-halved" style={{ marginRight:6, color:'var(--grn)' }}></i>Auditoría del Sistema</p>
          <button onClick={async()=>{await auditoriaAPI.clear();setAuditoria([]);}} className="btn btn-ghost btn-sm"><i className="fas fa-trash"></i> Limpiar</button>
        </div>
        <div style={{ overflowX:'auto', maxHeight:240, overflowY:'auto' }}>
          <table className="tbl"><thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Tipo</th><th>Detalle</th></tr></thead>
            <tbody>{auditoria.slice(0,60).map((a,i)=>(
              <tr key={i}>
                <td className="mono" style={{ fontSize:10.5, color:'var(--t3)' }}>{new Date(a.created_at).toLocaleString('es-EC')}</td>
                <td style={{ fontWeight:700, fontSize:11.5 }}>{a.usuario}</td>
                <td><span className="badge" style={{ background:a.tipo==='venta'?'var(--grnl)':a.tipo==='cierre'?'var(--mgl)':a.tipo==='deposito'?'var(--cyl)':a.tipo==='error'?'var(--redl)':'#F1F5F9', color:a.tipo==='venta'?'var(--grn)':a.tipo==='cierre'?'var(--mgd)':a.tipo==='deposito'?'var(--cyd)':a.tipo==='error'?'var(--red)':'var(--t3)' }}>{a.tipo}</span></td>
                <td style={{ fontSize:11 }}>{a.detalle}</td>
              </tr>
            ))}{!auditoria.length&&<tr><td colSpan={4} style={{ textAlign:'center', padding:24, color:'var(--t4)', fontWeight:700 }}>Sin registros</td></tr>}</tbody>
          </table>
        </div>
      </div>

      {/* Modal permisos */}
      {mPermisos && uEdit && (
        <Modal onClose={()=>setMPermisos(false)} width={400}>
          <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:18 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:'linear-gradient(135deg,var(--mg),var(--cy))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'#fff', fontWeight:800, flexShrink:0 }}>{uEdit.nombre?.charAt(0)}</div>
            <div><p style={{ fontSize:15, fontWeight:900 }}>{uEdit.nombre}</p><p style={{ fontSize:10, color:'var(--t3)' }}>PIN: {uEdit.pin} · {uEdit.rol}</p></div>
          </div>
          <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', marginBottom:11 }}><i className="fas fa-shield-halved" style={{ color:'var(--cy)', marginRight:6 }}></i>Módulos accesibles</p>
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:18 }}>
            {ALL_MODS.map(m=>(
              <label key={m.id} onClick={()=>toggleMod(m.id)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${(uEdit.modulos??[]).includes(m.id)?'var(--cy)':'var(--brd)'}`, cursor:'pointer', background:(uEdit.modulos??[]).includes(m.id)?'var(--cyl)':'var(--bg)', transition:'all .14s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <i className={m.icon} style={{ width:16, textAlign:'center', fontSize:13, color:(uEdit.modulos??[]).includes(m.id)?'var(--cy)':'var(--t4)' }}></i>
                  <span style={{ fontSize:12.5, fontWeight:700, color:(uEdit.modulos??[]).includes(m.id)?'var(--cyd)':'var(--t2)' }}>{m.lbl}</span>
                </div>
                <div style={{ position:'relative', width:38, height:21, borderRadius:100, background:(uEdit.modulos??[]).includes(m.id)?'var(--cy)':'var(--brd2)', transition:'all .2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2.5, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'all .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)', left:(uEdit.modulos??[]).includes(m.id)?19:2.5 }}></div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
            <button onClick={()=>setMPermisos(false)} className="btn btn-ghost" style={{ padding:11 }}>Cancelar</button>
            <button onClick={guardarPermisos} className="btn btn-cy" style={{ padding:11 }}><i className="fas fa-save"></i> Guardar</button>
          </div>
        </Modal>
      )}

      {/* Modal agregar servicio */}
      {mAddSvc && (
        <Modal onClose={()=>setMAddSvc(false)} width={420}>
          <p style={{ fontSize:15, fontWeight:900, marginBottom:18 }}>Nuevo Servicio</p>
          <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'56px 1fr', gap:8 }}>
              <div><label className="lbl">Emoji</label><input value={ns.emoji??''} onChange={e=>setNs(p=>({...p,emoji:e.target.value}))} className="inp" style={{ textAlign:'center', fontSize:19, padding:'6px 3px' }} /></div>
              <div><label className="lbl">Nombre</label><input value={ns.nombre??''} onChange={e=>setNs(p=>({...p,nombre:e.target.value}))} className="inp" placeholder="Nombre del servicio" /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div><label className="lbl">Categoría</label><select value={ns.categoria??'Otros'} onChange={e=>setNs(p=>({...p,categoria:e.target.value}))} className="inp">{['Recargas','Pagos','Trámites','Fotos','Copias','Otros'].map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label className="lbl">Tipo</label><select value={ns.tipo??'monto_variable'} onChange={e=>setNs(p=>({...p,tipo:e.target.value as 'monto_variable'|'cantidad'}))} className="inp"><option value="monto_variable">Monto variable</option><option value="cantidad">Precio fijo</option></select></div>
            </div>
            {ns.tipo==='monto_variable' && <div><label className="lbl">Ganancia por transacción ($)</label><input type="number" step="0.01" min="0" value={ns.ganancia??''} onChange={e=>setNs(p=>({...p,ganancia:+e.target.value}))} className="inp mono" /></div>}
            {ns.tipo==='cantidad' && <div><label className="lbl">Precio fijo ($)</label><input type="number" step="0.01" min="0" value={ns.precioFijo??''} onChange={e=>setNs(p=>({...p,precioFijo:+e.target.value}))} className="inp mono" /></div>}
            <div style={{ padding:'11px 13px', background:'var(--mgl)', border:'1.5px solid var(--mg)', borderRadius:10, display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }} onClick={()=>setNs(p=>({...p,gananciaMod:!p.gananciaMod}))}>
              <input type="checkbox" checked={ns.gananciaMod??false} onChange={e=>setNs(p=>({...p,gananciaMod:e.target.checked}))} className="chk" style={{ marginTop:1 }} onClick={e=>e.stopPropagation()} />
              <div><p style={{ fontSize:12, fontWeight:800, color:'var(--mgd)' }}><i className="fas fa-pencil" style={{ marginRight:5 }}></i>Permitir ganancia libre en POS</p><p style={{ fontSize:10, color:'var(--mgd)', marginTop:2 }}>El cajero podrá modificar la ganancia en cada venta.</p></div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
            <button onClick={()=>setMAddSvc(false)} className="btn btn-ghost" style={{ padding:11 }}>Cancelar</button>
            <button onClick={addSvc} className="btn btn-cy" style={{ padding:11 }}><i className="fas fa-save"></i> Guardar</button>
          </div>
        </Modal>
      )}

      {/* Modal editar servicio */}
      {mEditSvc && (
        <Modal onClose={()=>setMEditSvc(false)} width={400}>
          <p style={{ fontSize:15, fontWeight:900, marginBottom:16 }}><i className="fas fa-pencil" style={{ color:'var(--cy)', marginRight:7 }}></i>Editar Servicio</p>
          <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'56px 1fr', gap:8 }}>
              <div><label className="lbl">Emoji</label><input value={eS.emoji??''} onChange={e=>setES(p=>({...p,emoji:e.target.value}))} className="inp" style={{ textAlign:'center', fontSize:19, padding:'6px 3px' }} /></div>
              <div><label className="lbl">Nombre</label><input value={eS.nombre??''} onChange={e=>setES(p=>({...p,nombre:e.target.value}))} className="inp" /></div>
            </div>
            <div><label className="lbl">Categoría</label><select value={eS.categoria??'Otros'} onChange={e=>setES(p=>({...p,categoria:e.target.value}))} className="inp">{['Recargas','Pagos','Trámites','Fotos','Copias','Otros'].map(c=><option key={c}>{c}</option>)}</select></div>
            {eS.tipo==='monto_variable' && <div><label className="lbl">Ganancia ($)</label><input type="number" step="0.01" min="0" value={eS.ganancia??0} onChange={e=>setES(p=>({...p,ganancia:+e.target.value}))} className="inp mono" /></div>}
            {eS.tipo==='cantidad' && <div><label className="lbl">Precio fijo ($)</label><input type="number" step="0.01" min="0" value={eS.precioFijo??0} onChange={e=>setES(p=>({...p,precioFijo:+e.target.value}))} className="inp mono" /></div>}
            <div style={{ padding:'11px 13px', background:'var(--mgl)', border:'1.5px solid var(--mg)', borderRadius:10, display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }} onClick={()=>setES(p=>({...p,gananciaMod:!p.gananciaMod}))}>
              <input type="checkbox" checked={eS.gananciaMod??false} onChange={e=>setES(p=>({...p,gananciaMod:e.target.checked}))} className="chk" style={{ marginTop:1 }} onClick={e=>e.stopPropagation()} />
              <div><p style={{ fontSize:12, fontWeight:800, color:'var(--mgd)' }}><i className="fas fa-pencil" style={{ marginRight:5 }}></i>Permitir ganancia libre en POS</p></div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
            <button onClick={()=>setMEditSvc(false)} className="btn btn-ghost" style={{ padding:11 }}>Cancelar</button>
            <button onClick={saveEdit} className="btn btn-cy" style={{ padding:11 }}><i className="fas fa-save"></i> Guardar Cambios</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
