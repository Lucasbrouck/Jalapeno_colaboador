const CAJA_URL = process.env.CAJA_URL || 'https://caja-production-991b.up.railway.app';
const CLIENT_ID = process.env.CAJA_CLIENT_ID;
const CLIENT_SECRET = process.env.CAJA_CLIENT_SECRET;

/**
 * Retorna a URL para redirecionar o usuário ao CaJa para login.
 */
export function getCaJaAuthorizationUrl(redirectUri, state) {
  const url = new URL(`${CAJA_URL}/authorize`);
  url.searchParams.append('client_id', CLIENT_ID);
  url.searchParams.append('redirect_uri', redirectUri);
  if (state) url.searchParams.append('state', state);
  return url.toString();
}

/**
 * Troca o código recebido na URL de retorno pelo Token de Acesso e os dados do usuário.
 */
export async function exchangeCaJaToken(code) {
  const response = await fetch(`${CAJA_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`CaJa SSO Error: ${errorData.error || 'Unknown error'}`);
  }

  return response.json();
}
