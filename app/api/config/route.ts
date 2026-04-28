import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { apiError, authError, adminError } from '@/lib/utils';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return authError();
  try {
    const rows = await query('SELECT * FROM configuracion WHERE id=1');
    if (!rows.length) return apiError('Configuración no encontrada', 404);
    return Response.json(rows[0]);
  } catch {
    return apiError('Error al obtener configuración');
  }
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return authError();
  if (!isAdmin(user)) return adminError();

  try {
    const c = await req.json();
    const rows = await query(
      `INSERT INTO configuracion(id,negocio,ruc,direccion,telefono,fondo_inicial,fondo_vuelto,
        precio_bn,precio_color,metodos_pago,cats_gasto,servicios,logo,updated_at)
       VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
       ON CONFLICT(id) DO UPDATE SET
        negocio=$1,ruc=$2,direccion=$3,telefono=$4,fondo_inicial=$5,fondo_vuelto=$6,
        precio_bn=$7,precio_color=$8,metodos_pago=$9,cats_gasto=$10,servicios=$11,
        logo=$12,updated_at=now()
       RETURNING *`,
      [c.negocio, c.ruc, c.dir, c.tel, c.fondo, c.fondoVuelto, c.precioBN, c.precioColor,
       JSON.stringify(c.metodos), JSON.stringify(c.catsGasto), JSON.stringify(c.servicios),
       c.logo || null]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error(err);
    return apiError('Error al guardar configuración');
  }
}
