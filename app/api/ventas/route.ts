import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { apiError, authError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  const metodo = searchParams.get('metodo');

  let q = 'SELECT * FROM ventas WHERE 1=1';
  const params: string[] = [];

  if (desde) { params.push(desde); q += ` AND fecha_iso >= $${params.length}`; }
  if (hasta) { params.push(hasta); q += ` AND fecha_iso <= $${params.length}`; }
  if (metodo) { params.push(metodo); q += ` AND metodo = $${params.length}`; }
  q += ' ORDER BY created_at DESC';

  try {
    const rows = await query(q, params);
    return Response.json(rows);
  } catch (err) {
    console.error(err);
    return apiError('Error al obtener ventas');
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();

  try {
    const v = await req.json();
    const rows = await query(
      `INSERT INTO ventas (id,numero,fecha,hora,fecha_iso,cajero,cliente,metodo,total,utilidad,
        pago_servicio,recibido,vuelto,items,cierre_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [v.id, v.numero, v.fecha, v.hora, v.fechaISO, v.cajero, v.cliente || null,
       v.metodo, v.total, v.utilidad, v.pagoServicio || 0,
       v.recibido || v.total, v.vuelto || 0, JSON.stringify(v.items), v.cierreId || null]
    );
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [v.cajero, 'venta', `#${v.numero} $${v.total} ${v.metodo}`]);
    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return apiError('Error al crear venta');
  }
}
