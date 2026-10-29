import { NextResponse } from 'next/server';
import { getCaJaAuthorizationUrl } from '@/lib/caja-client';

export async function GET(request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'bank.jalapeno.app.br';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  
  // Reconstruir a URL pública voltada para o usuário (evita problemas de proxy local/produção)
  const callbackUrl = `${proto}://${host}/api/auth/caja-callback`;
  
  const cajaUrl = getCaJaAuthorizationUrl(callbackUrl);
  return NextResponse.redirect(cajaUrl);
}
