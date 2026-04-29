'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { ventasAPI, gastosAPI } from '@/lib/api';
import { DateBar, D } from '@/components/ui';
import { inRango } from '@/lib/utils';
import type { Venta, Gasto, DateFilter } from '@/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
const PAL = ['#00C1D4', '#E8198B', '#F5C800', '#10B981', '#7C3AED', '#F59E0B', '#EF4444'];

export default function GraficasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [f, setF] = useState<DateFilter>({ modo: 'mes' });

  const load = useCallback(async () => {
    const [vR, gR] = await Promise.all([ventasAPI.getAll(), gastosAPI.getAll()]);
    setVentas(vR.data); setGastos(gR.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const vF = ventas.filter(v => inRango(v.fecha_iso, f));
  const gF = gastos.filter(g => inRango(g.fecha_iso, f));
  const totalU = vF.reduce((a, v) => a + +v.utilidad, 0);
  const totalE = gF.reduce((a, g) => a + +g.monto, 0);
  const uNeta  = totalU - totalE;

  const sm: Record<string, number> = {};
  vF.forEach(v => (v.items ?? []).forEach(it => { sm[it.nombre] = (sm[it.nombre] ?? 0) + it.total; }));
  const mm: Record<string, number> = {};
  vF.forEach(v => { mm[v.metodo] = (mm[v.metodo] ?? 0) + +v.total; });

  const bO = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { color: '#7B93AE', font: { size: 10 as number } } },
      x: { grid: { display: false }, ticks: { color: '#7B93AE', font: { size: 10 as number } } },
    },
  } as const;

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 5 }}>
        Análisis <span style={{ color: '#7C3AED' }}>Financiero</span>
      </h1>

      <DateBar f={f} setF={setF}>
        <button onClick={load} className="btn btn-ghost btn-sm"><i className="fas fa-refresh"></i> Actualizar</button>
      </DateBar>

      {/* Resumen cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
        <div className="card" style={{ padding: 17 }}>
          <p className="lbl" style={{ marginBottom: 5 }}>Ganancia Bruta</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--grn)' }}>${D(totalU)}</p>
        </div>
        <div className="card" style={{ padding: 17 }}>
          <p className="lbl" style={{ marginBottom: 5 }}>Egresos</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>-${D(totalE)}</p>
        </div>
        <div className="card" style={{ padding: 17 }}>
          <p className="lbl" style={{ marginBottom: 5 }}>Utilidad Neta</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 800, color: uNeta >= 0 ? 'var(--cyd)' : 'var(--red)' }}>${D(uNeta)}</p>
        </div>
      </div>

      {/* charts-grid colapsa a 1 col en mobile */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="card" style={{ padding: 17 }}>
          <p className="lbl" style={{ marginBottom: 10 }}>Ganancia / Egresos / Utilidad Neta</p>
          <Bar
            data={{ labels: ['Ganancia', 'Egresos', 'Utilidad Neta'], datasets: [{ data: [totalU, totalE, uNeta], backgroundColor: ['rgba(16,185,129,.65)', 'rgba(239,68,68,.65)', 'rgba(0,193,212,.65)'], borderColor: ['#10B981', '#EF4444', '#00C1D4'], borderWidth: 1.5, borderRadius: 7 }] }}
            options={bO}
            style={{ maxHeight: 220 }}
          />
        </div>
        <div className="card" style={{ padding: 17 }}>
          <p className="lbl" style={{ marginBottom: 10 }}>Por Servicio</p>
          <Doughnut
            data={{ labels: Object.keys(sm).length ? Object.keys(sm) : ['Sin datos'], datasets: [{ data: Object.keys(sm).length ? Object.values(sm) : [1], backgroundColor: Object.keys(sm).length ? PAL : ['rgba(0,0,0,.06)'], borderWidth: 0 }] }}
            options={{ responsive: true, cutout: '55%', plugins: { legend: { position: 'right', labels: { color: '#7B93AE', font: { size: 9.5 as number }, padding: 7 } } } }}
            style={{ maxHeight: 220 }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 17 }}>
        <p className="lbl" style={{ marginBottom: 10 }}>Métodos de Pago</p>
        <Bar
          data={{ labels: Object.keys(mm).length ? Object.keys(mm) : ['Sin datos'], datasets: [{ data: Object.keys(mm).length ? Object.values(mm) : [0], backgroundColor: PAL, borderWidth: 0, borderRadius: 7 }] }}
          options={{ ...bO, indexAxis: 'y' as const }}
          style={{ maxHeight: 150 }}
        />
      </div>
    </div>
  );
}