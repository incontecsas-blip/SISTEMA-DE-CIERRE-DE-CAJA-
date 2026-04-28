import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [dep] } = await client.query('SELECT * FROM depositos WHERE id=$1', [params.id]);
    if (dep) {
      for (const cierreId of (dep.cierre_ids as number[])) {
        const { rows: [c] } = await client.query('SELECT * FROM cierres WHERE id=$1', [cierreId]);
        if (!c) continue;
        const parciales = (Array.isArray(c.depositos_parciales) ? c.depositos_parciales : [])
          .filter((p: { depId: number }) => String(p.depId) !== params.id);
        const totalDep = parciales.reduce((a: number, p: { monto: number }) => a + p.monto, 0);
        const saldo = Math.max(0, parseFloat(c.a_depositar) - totalDep);
        await client.query(
          'UPDATE cierres SET depositos_parciales=$1,total_depositado=$2,saldo_pendiente=$3 WHERE id=$4',
          [JSON.stringify(parciales), totalDep, saldo, cierreId]
        );
      }
    }
    await client.query('DELETE FROM depositos WHERE id=$1', [params.id]);
    await client.query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'eliminar', `Depósito id:${params.id}`]);
    await client.query('COMMIT');
    return Response.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return apiError('Error al eliminar depósito');
  } finally {
    client.release();
  }
}
