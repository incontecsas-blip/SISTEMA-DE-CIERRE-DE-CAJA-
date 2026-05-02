import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    const h = await req.json();
    const rows = await query(
      `UPDATE cierres SET
        ventas=$1, egresos=$2, utilidad=$3, contado=$4,
        dif=$5, fondo_vuelto=$6, a_depositar=$7, obs=$8
       WHERE id=$9 RETURNING *`,
      [h.ventas, h.egresos, h.utilidad, h.contado,
       h.dif, h.fondoVuelto, h.aDepositar, h.obs ?? null, params.id]
    );
    if (!rows.length) return apiError('Cierre no encontrado', 404);
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'editar', `Cierre id:${params.id}`]);
    return Response.json(rows[0]);
  } catch (err) {
    console.error(err);
    return apiError('Error al editar cierre');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    await query('DELETE FROM cierres WHERE id=$1', [params.id]);
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'eliminar', `Cierre id:${params.id}`]);
    return Response.json({ ok: true });
  } catch {
    return apiError('Error al eliminar cierre');
  }
}