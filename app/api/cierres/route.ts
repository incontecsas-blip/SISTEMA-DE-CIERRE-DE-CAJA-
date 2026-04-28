import { NextRequest } from 'next/server';
import { pool, query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { apiError, authError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  let q = 'SELECT * FROM cierres WHERE 1=1';
  const params: string[] = [];
  if (desde) { params.push(desde); q += ` AND fecha_iso >= $${params.length}`; }
  if (hasta) { params.push(hasta); q += ` AND fecha_iso <= $${params.length}`; }
  q += ' ORDER BY fecha DESC';

  try {
    const rows = await query(q, params);
    return Response.json(rows);
  } catch {
    return apiError('Error al obtener cierres');
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();

  const h = await req.json();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO cierres(id,fecha,fecha_iso,cajero,ventas,egresos,utilidad,contado,dif,
        fondo_vuelto,a_depositar,total_depositado,saldo_pendiente,depositos_parciales,obs)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [h.id, h.fecha, h.fechaISO, h.cajero, h.ventas, h.egresos, h.utilidad,
       h.contado, h.dif, h.fondoVuelto, h.aDepositar, 0, h.aDepositar, '[]', h.obs || null]
    );
    await client.query('UPDATE ventas SET cierre_id=$1 WHERE cierre_id IS NULL', [h.id]);
    await client.query('UPDATE gastos SET cierre_id=$1 WHERE cierre_id IS NULL', [h.id]);
    await client.query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [h.cajero, 'cierre', `$${h.ventas} | Dep $${h.aDepositar}`]);
    await client.query('COMMIT');
    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return apiError('Error al crear cierre');
  } finally {
    client.release();
  }
}
