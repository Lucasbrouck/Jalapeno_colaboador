import './globals.css';
import { AuthProvider } from './context/AuthContext';
import GlobalErrorLogger from './components/GlobalErrorLogger';

export const metadata = {
  title: 'Jalapeño Colaborador — Carteira de Prêmios & Benefícios',
  description: 'Portal do Colaborador Jalapeño: Prêmio Semanal, Turnos, Carteira Plata, Ponto e PDI',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: '#f1f5f9', color: '#0f172a', minHeight: '100vh', margin: 0 }}>
        <GlobalErrorLogger />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
