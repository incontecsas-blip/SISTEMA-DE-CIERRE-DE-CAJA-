import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    const v = await req.json();
    const rows = await query(
      `UPDATE ventas SET
        cliente=$1, metodo=$2, total=$3, utilidad=$4,
        pago_servicio=$5, recibido=$6, vuelto=$7, fecha=$8, hora=$9
       WHERE id=$10 RETURNING *`,
      [v.cliente || null, v.metodo, v.total, v.utilidad,
       v.pago_servicio, v.recibido, v.vuelto, v.fecha, v.hora, params.id]
    );
    if (!rows.length) return apiError('Venta no encontrada', 404);
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'editar', `Venta id:${params.id} $${v.total} ${v.metodo}`]);
    return Response.json(rows[0]);
  } catch (err) {
    console.error(err);
    return apiError('Error al editar venta');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    await query('DELETE FROM ventas WHERE id = $1', [params.id]);
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'eliminar', `Venta id:${params.id}`]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return apiError('Error al eliminar venta');
  }
}