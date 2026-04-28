import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();

  try {
    const body = await req.json();
    const rows = await query(
      `UPDATE usuarios SET
        nombre  = COALESCE($1, nombre),
        pin     = COALESCE($2, pin),
        rol     = COALESCE($3, rol),
        modulos = COALESCE($4, modulos),
        activo  = COALESCE($5, activo)
       WHERE id = $6
       RETURNING id,nombre,pin,rol,modulos,activo`,
      [body.nombre ?? null, body.pin ?? null, body.rol ?? null,
       body.modulos ? JSON.stringify(body.modulos) : null,
       body.activo ?? null, params.id]
    );
    if (!rows.length) return apiError('Usuario no encontrado', 404);
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'config', `Permisos editados: ${(rows[0] as { nombre: string }).nombre}`]);
    return Response.json(rows[0]);
  } catch (err) {
    console.error(err);
    return apiError('Error al actualizar usuario');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();

  try {
    const rows = await query('SELECT rol FROM usuarios WHERE id=$1', [params.id]);
    if ((rows[0] as { rol: string })?.rol === 'admin')
      return apiError('No puedes eliminar al administrador', 400);
    await query('UPDATE usuarios SET activo=false WHERE id=$1', [params.id]);
    return Response.json({ ok: true });
  } catch {
    return apiError('Error al eliminar usuario');
  }
}
