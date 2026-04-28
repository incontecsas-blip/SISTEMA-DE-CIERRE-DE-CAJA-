import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    await query('DELETE FROM gastos WHERE id=$1', [params.id]);
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'eliminar', `Gasto id:${params.id}`]);
    return Response.json({ ok: true });
  } catch {
    return apiError('Error al eliminar gasto');
  }
}
