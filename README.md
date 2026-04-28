# CierreCaja Pro — IMPRIMEYA

Sistema de punto de venta y cierre de caja para IMPRIMEYA Copias & Servicios.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · PostgreSQL · JWT

---

## Instalación Local

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
```
Edita `.env.local` con tu cadena de conexión PostgreSQL y un JWT secret seguro:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/cierrecaja
JWT_SECRET=una_frase_secreta_larga_de_al_menos_32_chars
```

### 3. Crear la base de datos
En tu cliente PostgreSQL (psql, DBeaver, etc.):
```bash
psql -U postgres -d cierrecaja -f schema.sql
```
O copia y pega el contenido de `schema.sql` directamente.

### 4. Iniciar en desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

---

## Usuarios por defecto

| Usuario       | PIN   | Rol   |
|---------------|-------|-------|
| Administrador | 1234  | Admin |
| Cajero 1      | 0001  | Cajero|
| Cajero 2      | 0002  | Cajero|

---

## Deploy en Render.com

### Paso 1 — Base de datos
1. En Render, crea un **PostgreSQL** (plan Free o Starter)
2. Copia la **Internal Database URL**
3. Conéctate y ejecuta `schema.sql`

### Paso 2 — Web Service
1. Conecta tu repositorio de GitHub
2. Render detecta `render.yaml` automáticamente
3. En **Environment Variables**, pega `DATABASE_URL` con la URL del paso anterior
4. Deploy ✓

---

## Estructura del Proyecto

```
imprimeya-next/
├── app/
│   ├── (auth)/login/         → Pantalla de PIN
│   ├── (dashboard)/
│   │   ├── dashboard/        → Panel principal
│   │   ├── pos/              → Punto de venta
│   │   ├── ingresos/         → Libro de ventas
│   │   ├── egresos/          → Registro de gastos
│   │   ├── graficas/         → Análisis P&L
│   │   ├── depositos/        → Conciliación bancaria
│   │   ├── historial/        → Historial de cierres
│   │   └── configuracion/    → Config + usuarios + catálogo
│   └── api/                  → API Routes (backend)
├── components/
│   ├── layout/Sidebar.tsx
│   ├── ui/index.tsx
│   └── modals/CierreModal.tsx
├── context/AppContext.tsx
├── lib/
│   ├── db.ts       → Pool PostgreSQL
│   ├── auth.ts     → JWT con jose
│   ├── utils.ts    → Helpers
│   └── api.ts      → Cliente Axios
├── types/index.ts
├── schema.sql
└── render.yaml
```

---

## Módulos del Sistema

| Módulo        | Descripción                                    |
|---------------|------------------------------------------------|
| Dashboard     | Stats del día, gráfica por hora, últimas ventas|
| POS           | Copias B/N+Color, catálogo servicios, cobro     |
| Ingresos      | Historial de ventas filtrado por fecha/método   |
| Egresos       | Registro de gastos por categoría                |
| Gráficas P&L  | Análisis de ganancia, egresos y utilidad neta   |
| Depósitos     | Conciliación de cierres con banco               |
| Historial     | Cierres anteriores con reimpresión 80mm          |
| Configuración | Negocio, usuarios, precios, catálogo, auditoría |

---

## Notas de Negocio

- **Solo el Efectivo** afecta el arqueo físico. Transferencia/Zelle/Tarjeta se excluyen del conteo.
- **Ganancia libre**: servicios con esta opción permiten que el cajero ingrese la ganancia manualmente en cada venta.
- **Depósitos parciales**: un cierre puede recibir múltiples depósitos; el saldo pendiente se actualiza automáticamente.
- **Utilidad Neta** = Ganancia bruta − Egresos del período.
