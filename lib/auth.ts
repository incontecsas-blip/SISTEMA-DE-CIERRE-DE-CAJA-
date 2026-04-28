import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AuthUser } from '@/types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback_dev_secret_change_in_prod'
);

export async function signToken(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('cc_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.rol === 'admin';
}

export function canAccess(user: AuthUser | null, mod: string): boolean {
  if (!user) return false;
  if (user.rol === 'admin') return true;
  return user.modulos.includes(mod);
}
