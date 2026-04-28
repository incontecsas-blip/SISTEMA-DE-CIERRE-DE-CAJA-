import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    const rows = await query('SELECT * FROM auditoria ORDER BY created_at DESC LIMIT 200');
    return Response.json(rows);
  } catch {
    return apiError('Error al obtener auditoría');
  }
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    await query('DELETE FROM auditoria');
    return Response.json({ ok: true });
  } catch {
    return apiError('Error al limpiar auditoría');
  }
}
