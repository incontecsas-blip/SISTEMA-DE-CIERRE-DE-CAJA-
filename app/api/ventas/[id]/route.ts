import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

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
