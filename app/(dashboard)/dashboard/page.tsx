'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { ventasAPI, gastosAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { DateBar, StatCard, Empty, D } from '@/components/ui';
import { inRango } from '@/lib/utils';
import type { Venta, Gasto, DateFilter } from '@/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
const PAL = ['#00C1D4','#E8198B','#F5C800','#10B981','#7C3AED','#F59E0B','#EF4444'];

export default function DashboardPage() {
  const router = useRouter();
  const { isAdmin } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [f, setF] = useState<DateFilter>({ modo: 'hoy' });

  const load = useCallback(async () => {
    const [vR, gR] = await Promise.all([ventasAPI.getAll(), gastosAPI.getAll()]);
    setVentas(vR.data); setGastos(gR.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const vF = ventas.filter(v => inRango(v.fecha_iso, f));
  const gF = gastos.filter(g => inRango(g.fecha_iso, f));
  const totalV = vF.reduce((a, v) => a + parseFloat(String(v.total)), 0);
  const totalU = vF.reduce((a, v) => a + parseFloat(String(v.utilidad)), 0);
  const totalE = gF.reduce((a, g) => a + parseFloat(String(g.monto)), 0);
  const uNeta  = totalU - totalE;

  const hrs = ['08','09','10','11','12','13','14','15','16','17','18'];
  const byHr = hrs.map(h => vF.filter(v => v.hora?.startsWith(h)).reduce((a,v) => a + parseFloat(String(v.total)), 0));
  const cats: Record<string, number> = {};
  vF.forEach(v => (v.items ?? []).forEach(it => { cats[it.cat] = (cats[it.cat] ?? 0) + it.total; }));

  const barOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { color: '#7B93AE', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { color: '#7B93AE', font: { size: 10 } } } } } as const;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:10 }}>
        <h1 style={{ fontSize:18, fontWeight:900 }}>Panel <span style={{ color:'var(--cy)' }}>Principal</span></h1>
        <button className="btn btn-cy btn-sm" onClick={() => router.push('/pos')}><i className="fas fa-plus"></i> Nueva Venta</button>
      </div>

      <DateBar f={f} setF={setF}><span style={{ fontSize:10, color:'var(--t3)', fontWeight:600 }}>{vF.length} ventas</span></DateBar>

      <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
        <StatCard label="Ventas"   icon="fas fa-receipt"    color="var(--cy)"  value={`$${D(totalV)}`} sub={`${vF.length} trans.`} />
        <StatCard label="Ganancia" icon="fas fa-coins"      color="var(--grn)" value={`$${D(totalU)}`} sub="Bruta" />
        <StatCard label="Egresos"  icon="fas fa-arrow-down" color="var(--red)" value={`$${D(totalE)}`} sub={`${gF.length} reg.`} />
        <div className="card" style={{ padding:14, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:uNeta>=0?'var(--amb)':'var(--red)', borderRadius:'14px 14px 0 0' }}></div>
          <p style={{ fontSize:9, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
            <i className="fas fa-chart-line" style={{ color:uNeta>=0?'var(--amb)':'var(--red)', marginRight:4 }}></i>Neta
          </p>
          <p className="mono" style={{ fontSize:22, fontWeight:700, color:uNeta>=0?'var(--amb)':'var(--red)' }}>${D(uNeta)}</p>
        </div>
      </div>

      <div className="charts-grid" style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:12, marginBottom:12 }}>
        <div className="card" style={{ padding:15 }}>
          <p className="lbl" style={{ marginBottom:9 }}>Ventas por Hora</p>
          <Bar data={{ labels: hrs.map(h => h+':00'), datasets: [{ data: byHr, backgroundColor:'rgba(0,193,212,.55)', borderColor:'#00C1D4', borderWidth:1.5, borderRadius:5 }] }} options={barOpts} style={{ maxHeight:160 }} />
        </div>
        <div className="card" style={{ padding:15 }}>
          <p className="lbl" style={{ marginBottom:9 }}>Por Categoría</p>
          <Doughnut data={{ labels: Object.keys(cats).length?Object.keys(cats):['Sin datos'], datasets: [{ data:Object.keys(cats).length?Object.values(cats):[1], backgroundColor:Object.keys(cats).length?PAL:['rgba(0,0,0,.06)'], borderWidth:0 }] }} options={{ responsive:true, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{ color:'#7B93AE', font:{ size:9 as number }, padding:6 } } } }} style={{ maxHeight:160 }} />
        </div>
      </div>

      <div className="card" style={{ borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--brd)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p className="lbl" style={{ margin:0 }}>Últimas Transacciones</p>
          <button onClick={() => router.push('/ingresos')} style={{ fontSize:11, color:'var(--cyd)', fontWeight:800, background:'none', border:'none', cursor:'pointer' }}>Ver todas →</button>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="tbl">
            <thead><tr><th>Hora</th><th>Cliente</th><th>Método</th><th style={{ textAlign:'right' }}>Total</th>{isAdmin&&<th></th>}</tr></thead>
            <tbody>
              {vF.slice(0,6).map(v=>(
                <tr key={v.id}>
                  <td className="mono" style={{ color:'var(--t3)', fontSize:11 }}>{v.hora}</td>
                  <td style={{ fontWeight:700 }}>{v.cliente??'Público'}</td>
                  <td><span className="badge" style={{ background:'#ECFDF5', color:'#059669' }}>{v.metodo}</span></td>
                  <td style={{ textAlign:'right' }}><span className="mono" style={{ fontWeight:800, color:'var(--cyd)' }}>${D(v.total)}</span></td>
                  {isAdmin&&<td><button onClick={async()=>{await ventasAPI.delete(v.id);load();}} style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer', fontSize:12 }}><i className="fas fa-trash-alt"></i></button></td>}
                </tr>
              ))}
              {!vF.length&&<Empty msg="Sin transacciones" />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
