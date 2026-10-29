import { NextResponse } from 'next/server';
import { exchangeCaJaToken } from '@/lib/caja-client';
import { getUserByCajaUserId, getUserByEmail, updateUser } from '@/lib/db';
import { cookies } from 'next/headers';

function mapCaJaRoleToLocalRole(cajaRole) {
  if (cajaRole === 'superadm' || cajaRole === 'admin') {
    return 'admin';
  }
  return 'worker';
}

async function createSessionAndRedirect(user, publicBaseUrl) {
  const companyIds = user.company_id ? String(user.company_id).split(',').map(id => id.trim()).filter(Boolean) : [];
  const essentialData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.company_id || (companyIds.length > 0 ? companyIds[0] : null),
    company_ids: companyIds,
  };

  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(essentialData), {
    path: '/',
    maxAge: 172800, // 2 dias (mesmo padrão do AuthContext.js)
    sameSite: 'lax',
  });

  // Limpa o cookie pendente se existir
  cookieStore.delete('caja-pending');

  const redirectUrl = '/';
  return NextResponse.redirect(new URL(redirectUrl, publicBaseUrl));
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Código de autorização não fornecido.' }, { status: 400 });
  }

  // Obter host e proto públicos para evitar problemas com proxy reverso (como no Railway)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'bank.jalapeno.app.br';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const publicBaseUrl = `${proto}://${host}`;

  try {
    // 1. Troca o código no CaJa por token e dados do usuário
    const cajaData = await exchangeCaJaToken(code);
    const cajaUser = cajaData.user;

    // CENÁRIO 1: Já vinculado (login recorrente)
    const linkedUser = await getUserByCajaUserId(cajaUser.id);

    if (linkedUser) {
      const mappedRole = mapCaJaRoleToLocalRole(cajaUser.role);
      const updates = { cajaRole: cajaUser.role };
      
      // Se a role vinda do CaJa for de admin, garante que o usuário seja admin localmente
      if (mappedRole === 'admin') {
        updates.role = 'admin';
      }
      
      await updateUser(linkedUser.id, updates);
      const updatedUser = await getUserByCajaUserId(cajaUser.id);
      return await createSessionAndRedirect(updatedUser, publicBaseUrl);
    }

    // CENÁRIO 2: Mesmo e-mail encontrado → vincula automaticamente
    const sameEmailUser = await getUserByEmail(cajaUser.email);

    if (sameEmailUser) {
      const mappedRole = mapCaJaRoleToLocalRole(cajaUser.role);
      const updates = {
        cajaUserId: cajaUser.id,
        cajaRole: cajaUser.role
      };
      
      if (mappedRole === 'admin') {
        updates.role = 'admin';
      }
      
      await updateUser(sameEmailUser.id, updates);
      const updatedUser = await getUserByCajaUserId(cajaUser.id);
      return await createSessionAndRedirect(updatedUser, publicBaseUrl);
    }

    // CENÁRIO 3: E-mail não encontrado → redireciona para página de decisão
    // Salva os dados do CaJa temporariamente num cookie para a página de decisão usar
    const cookieStore = await cookies();
    cookieStore.set('caja-pending', JSON.stringify(cajaUser), {
      path: '/',
      maxAge: 600, // 10 minutos
      sameSite: 'lax',
    });

    return NextResponse.redirect(new URL('/auth/link-account', publicBaseUrl));

  } catch (error) {
    console.error('Erro de Autenticação CaJa:', error);
    return NextResponse.json({ error: 'Falha na autenticação com CaJa: ' + error.message }, { status: 401 });
  }
}
