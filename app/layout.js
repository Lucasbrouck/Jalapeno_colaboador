import './globals.css';
import { AuthProvider } from './context/AuthContext';
import GlobalErrorLogger from './components/GlobalErrorLogger';

export const metadata = {
  title: 'Jalapeño Colaborador — Carteira de Prêmios & Benefícios',
  description: 'Portal do Colaborador Jalapeño: Prêmio Semanal, Turnos, Carteira Plata, Ponto e PDI',
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
