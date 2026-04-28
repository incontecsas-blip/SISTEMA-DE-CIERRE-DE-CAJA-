import type { DateFilter } from '@/types';

export const D = (n: number | string | null | undefined): string =>
  parseFloat(String(n ?? 0)).toFixed(2);

export const isoHoy = (): string => new Date().toISOString().slice(0, 10);

export function inRango(iso: string | undefined | null, f: DateFilter): boolean {
  if (!iso) return f.modo === 'todo';
  const d = iso.slice(0, 10);
  const hoy = isoHoy();
  if (f.modo === 'hoy') return d === hoy;
  if (f.modo === 'ayer') {
    const ay = new Date();
    ay.setDate(ay.getDate() - 1);
    return d === ay.toISOString().slice(0, 10);
  }
  if (f.modo === 'semana') {
    const ini = new Date();
    ini.setDate(ini.getDate() - ini.getDay() + 1);
    return d >= ini.toISOString().slice(0, 10) && d <= hoy;
  }
  if (f.modo === 'mes') return d.slice(0, 7) === hoy.slice(0, 7);
  if (f.modo === 'rango') {
    if (f.desde && f.hasta) return d >= f.desde && d <= f.hasta;
    if (f.desde) return d >= f.desde;
    if (f.hasta) return d <= f.hasta;
  }
  return true;
}

export function apiError(message: string, status = 500): Response {
  return Response.json({ error: message }, { status });
}

export function authError(): Response {
  return Response.json({ error: 'No autorizado' }, { status: 401 });
}

export function adminError(): Response {
  return Response.json({ error: 'Solo el administrador puede hacer esto' }, { status: 403 });
}
