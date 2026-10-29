import { NextResponse } from 'next/server';
import { getUserByEmail, createUser, updateUser, getCompanies } from '@/lib/db';
import { cookies } from 'next/headers';

function mapCaJaRoleToLocalRole(cajaRole) {
  if (cajaRole === 'superadm' || cajaRole === 'admin') {
    return 'admin';
  }
  return 'worker';
}

export async function POST(request) {
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get('caja-pending')?.value;

  if (!pendingCookie) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente pelo CaJa.' }, { status: 400 });
  }

  let cajaUser;
  try {
    cajaUser = JSON.parse(pendingCookie);
  } catch (e) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente pelo CaJa.' }, { status: 400 });
  }

  const { action, email, password } = await request.json();

  try {
    let localUser;

    if (action === 'create-new') {
      // 1. Verificar se o e-mail do CaJa já foi criado no banco local nesse meio tempo
      const existing = await getUserByEmail(cajaUser.email);
      if (existing) {
        const mappedRole = mapCaJaRoleToLocalRole(cajaUser.role);
        const updates = {
          cajaUserId: cajaUser.id,
          cajaRole: cajaUser.role
        };
        if (mappedRole === 'admin') {
          updates.role = 'admin';
        }
        // Se existir, apenas vincula (não sobrescreve a role local por worker se o CaJa vier mais baixo)
        localUser = await updateUser(existing.id, updates);
      } else {
        // Obter uma empresa padrão para o usuário pertencer
        const companies = await getCompanies();
        const defaultCompanyId = companies.length > 0 ? companies[0].id : null;

        // Cria conta local com dados do CaJa
        localUser = await createUser({
          name: cajaUser.name,
          email: cajaUser.email,
          password: Math.random().toString(36).substring(2, 12), // Senha aleatória segura
          role: mapCaJaRoleToLocalRole(cajaUser.role),
          cajaUserId: cajaUser.id,
          cajaRole: cajaUser.role,
          company_id: defaultCompanyId,
          isFirstAccess: 0 // Login direto via CaJa, sem primeiro acesso
        });
      }

    } else if (action === 'link-existing') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
      }

      // Valida credenciais da conta local existente
      const existingUser = await getUserByEmail(email.toLowerCase().trim());

      if (!existingUser) {
        return NextResponse.json({ error: 'Conta não encontrada com este email.' }, { status: 404 });
      }

      // Comparação direta de senha em texto plano (JalaBank padrão)
      if (existingUser.password !== password) {
        return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
      }

      const mappedRole = mapCaJaRoleToLocalRole(cajaUser.role);
      const updates = {
        cajaUserId: cajaUser.id,
        cajaRole: cajaUser.role
      };
      if (mappedRole === 'admin') {
        updates.role = 'admin';
      }
      // Vincula a conta existente ao CaJa (não sobrescreve a role local se o CaJa for inferior)
      localUser = await updateUser(existingUser.id, updates);

    } else {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    // Cria sessão local
    const companyIds = localUser.company_id ? String(localUser.company_id).split(',').map(id => id.trim()).filter(Boolean) : [];
    const essentialData = {
      id: localUser.id,
      name: localUser.name,
      email: localUser.email,
      role: localUser.role,
      company_id: localUser.company_id || (companyIds.length > 0 ? companyIds[0] : null),
      company_ids: companyIds,
    };

    cookieStore.set('session', JSON.stringify(essentialData), {
      path: '/',
      maxAge: 172800, // 2 dias
      sameSite: 'lax',
    });

    cookieStore.delete('caja-pending');

    const redirectTarget = localUser.role === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.json({ success: true, redirect: redirectTarget });

  } catch (error) {
    console.error('Erro na vinculação da conta:', error);
    return NextResponse.json({ error: 'Erro interno ao processar vinculação: ' + error.message }, { status: 500 });
  }
}
