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
  let q = 'SELECT * FROM depositos WHERE 1=1';
  const params: string[] = [];
  if (desde) { params.push(desde); q += ` AND fecha_dep >= $${params.length}`; }
  if (hasta) { params.push(hasta); q += ` AND fecha_dep <= $${params.length}`; }
  q += ' ORDER BY created_at DESC';
  try {
    return Response.json(await query(q, params));
  } catch {
    return apiError('Error al obtener depósitos');
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();

  const d = await req.json();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO depositos(id,fecha_dep,banco,ref,monto,cierre_ids,cajero,periodo)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [d.id || Date.now(), d.fechaDep, d.banco, d.ref, d.monto,
       JSON.stringify(d.cierreIds), d.cajero, d.periodo || null]
    );

    const dist: Record<string, number> = d.distribucion || {};
    for (const cierreId of (d.cierreIds as number[])) {
      const montoCierre = dist[cierreId] || 0;
      if (montoCierre <= 0) continue;
      const cRes = await client.query('SELECT * FROM cierres WHERE id=$1', [cierreId]);
      const c = cRes.rows[0];
      if (!c) continue;
      const parciales = Array.isArray(c.depositos_parciales) ? c.depositos_parciales : [];
      parciales.push({ id: Date.now(), depId: rows[0].id, fecha: d.fechaDep,
        banco: d.banco, ref: d.ref, monto: montoCierre, cajero: d.cajero });
      const totalDep = parciales.reduce((a: number, p: { monto: number }) => a + p.monto, 0);
      const saldo = Math.max(0, parseFloat(c.a_depositar) - totalDep);
      await client.query(
        'UPDATE cierres SET depositos_parciales=$1,total_depositado=$2,saldo_pendiente=$3 WHERE id=$4',
        [JSON.stringify(parciales), totalDep, saldo, cierreId]
      );
    }

    await client.query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [d.cajero, 'deposito', `${d.banco} Ref:${d.ref} $${d.monto}`]);
    await client.query('COMMIT');
    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return apiError('Error al registrar depósito');
  } finally {
    client.release();
  }
}
