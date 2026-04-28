export interface Usuario {
  id: number;
  nombre: string;
  pin: string;
  rol: 'admin' | 'cajero';
  modulos: string[];
  activo: boolean;
}

export interface Venta {
  id: number;
  numero: string;
  fecha: string;
  hora: string;
  fecha_iso: string;
  cajero: string;
  cliente?: string;
  metodo: string;
  total: number;
  utilidad: number;
  pago_servicio: number;
  recibido?: number;
  vuelto?: number;
  items: ItemVenta[];
  cierre_id?: number;
}

export interface ItemVenta {
  nombre: string;
  cant: number;
  pUnit: number;
  total: number;
  utilidad: number;
  cat: string;
}

export interface Gasto {
  id: number;
  cat: string;
  descripcion?: string;
  monto: number;
  cajero: string;
  fecha: string;
  fecha_iso: string;
  cierre_id?: number;
}

export interface Cierre {
  id: number;
  fecha: string;
  fecha_iso: string;
  cajero: string;
  ventas: number;
  egresos: number;
  utilidad: number;
  contado: number;
  dif: number;
  fondo_vuelto: number;
  a_depositar: number;
  total_depositado: number;
  saldo_pendiente: number;
  depositos_parciales: DepositoParcial[];
  obs?: string;
}

export interface DepositoParcial {
  id: number;
  depId?: number;
  fecha: string;
  banco: string;
  ref: string;
  monto: number;
  cajero: string;
}

export interface Deposito {
  id: number;
  fecha_dep: string;
  banco: string;
  ref: string;
  monto: number;
  cierre_ids: number[];
  cajero: string;
  periodo?: string;
}

export interface Config {
  negocio: string;
  ruc: string;
  dir: string;
  tel: string;
  logo?: string;
  fondo: number;
  fondoVuelto: number;
  precioBN: number;
  precioColor: number;
  metodos: string[];
  catsGasto: string[];
  servicios: Servicio[];
}

export interface Servicio {
  id: number;
  emoji: string;
  nombre: string;
  categoria: string;
  tipo: 'monto_variable' | 'cantidad';
  ganancia?: number;
  precioFijo?: number;
  gananciaMod?: boolean;
}

export interface AuditLog {
  id: number;
  usuario: string;
  tipo: string;
  detalle?: string;
  created_at: string;
}

export interface AuthUser {
  id: number;
  nombre: string;
  rol: 'admin' | 'cajero';
  modulos: string[];
}

export type FilterMode = 'todo' | 'hoy' | 'ayer' | 'semana' | 'mes' | 'rango';

export interface DateFilter {
  modo: FilterMode;
  desde?: string;
  hasta?: string;
}
