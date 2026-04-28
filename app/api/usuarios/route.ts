import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

const MODS_ADMIN = ['dashboard','pos','ingresos','egresos','graficas','depositos','historial','config'];
const MODS_DEF   = ['dashboard','pos'];

export async function GET() {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();
  try {
    const rows = await query('SELECT id,nombre,pin,rol,modulos,activo FROM usuarios ORDER BY id');
    return Response.json(rows);
  } catch {
    return apiError('Error al obtener usuarios');
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();

  try {
    const { nombre, pin, rol, modulos } = await req.json();
    if (!nombre?.trim()) return apiError('Nombre requerido', 400);
    if (!/^\d{4}$/.test(pin)) return apiError('PIN debe ser 4 dígitos', 400);

    const existe = await query('SELECT id FROM usuarios WHERE pin=$1', [pin]);
    if (existe.length) return apiError('PIN ya existe', 400);

    const mods = rol === 'admin' ? MODS_ADMIN : (modulos ?? MODS_DEF);
    const rows = await query(
      'INSERT INTO usuarios(id,nombre,pin,rol,modulos) VALUES($1,$2,$3,$4,$5) RETURNING id,nombre,pin,rol,modulos,activo',
      [Date.now(), nombre.trim(), pin, rol ?? 'cajero', JSON.stringify(mods)]
    );
    await query('INSERT INTO auditoria(usuario,tipo,detalle) VALUES($1,$2,$3)',
      [user.nombre, 'config', `Nuevo usuario: ${nombre}`]);
    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return apiError('Error al crear usuario');
  }
}
