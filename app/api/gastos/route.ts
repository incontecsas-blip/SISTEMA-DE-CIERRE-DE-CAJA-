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

  let q = 'SELECT * FROM gastos WHERE 1=1';
  const params: string[] = [];
  if (desde) { params.push(desde); q += ` AND fecha_iso >= $${params.length}`; }
  if (hasta) { params.push(hasta); q += ` AND fecha_iso <= $${params.length}`; }
  q += ' ORDER BY created_at DESC';

  try {
    const rows = await query(q, params);
    return Response.json(rows);
  } catch {
    return apiError('Error al obtener gastos');
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();

  try {
    const g = await req.json();
    const rows = await query(
      `INSERT INTO gastos(id,cat,descripcion,monto,cajero,fecha,fecha_iso,cierre_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [g.id || Date.now(), g.cat, g.desc || null, g.monto,
       g.cajero, g.fecha, g.fechaISO, g.cierreId || null]
    );
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [g.cajero, 'gasto', `${g.cat} $${g.monto}`]);
    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return apiError('Error al crear gasto');
  }
}
