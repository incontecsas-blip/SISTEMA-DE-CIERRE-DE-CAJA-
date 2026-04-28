import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import type { Usuario } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (!pin) return apiError('PIN requerido', 400);

    const rows = await query<Usuario>(
      'SELECT * FROM usuarios WHERE pin = $1 AND activo = true',
      [pin]
    );
    if (!rows.length) return apiError('PIN incorrecto', 401);

    const user = rows[0];
    const token = await signToken({
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      modulos: user.modulos,
    });

    await query(
      'INSERT INTO auditoria (usuario, tipo, detalle) VALUES ($1,$2,$3)',
      [user.nombre, 'login', 'Inicio de sesión']
    );

    const res = Response.json({
      user: { id: user.id, nombre: user.nombre, rol: user.rol, modulos: user.modulos },
    });

    // Guardar token en cookie httpOnly
    const response = new Response(res.body, res);
    response.headers.set(
      'Set-Cookie',
      `cc_token=${token}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
    return response;
  } catch (err) {
    console.error(err);
    return apiError('Error del servidor');
  }
}

export async function DELETE() {
  const res = Response.json({ ok: true });
  const response = new Response(res.body, res);
  response.headers.set('Set-Cookie', 'cc_token=; HttpOnly; Path=/; Max-Age=0');
  return response;
}
