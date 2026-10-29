'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ArrowLeft, UserPlus, Link2, AlertCircle, Flame } from 'lucide-react';

export default function LinkAccountPage() {
  const [mode, setMode] = useState('choose'); // 'choose' | 'link'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateNew = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/caja-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-new' }),
      });

      const data = await res.json();
      if (res.ok) {
        // Redireciona para o painel apropriado
        router.push(data.redirect || '/dashboard');
        // Pequeno atraso para recarregar o estado de sessão do cliente
        setTimeout(() => window.location.reload(), 150);
      } else {
        setError(data.error || 'Erro ao criar conta');
        setLoading(false);
      }
    } catch (err) {
      setError('Erro ao se conectar ao servidor.');
      setLoading(false);
    }
  };

  const handleLinkExisting = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/caja-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link-existing', email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(data.redirect || '/dashboard');
        setTimeout(() => window.location.reload(), 150);
      } else {
        setError(data.error || 'Credenciais inválidas');
        setLoading(false);
      }
    } catch (err) {
      setError('Erro ao se conectar ao servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <img
          src="/logo.svg"
          alt="JalaBank"
          style={{
            width: '100%',
            maxWidth: '220px',
            height: 'auto',
            margin: '0 auto 1.5rem auto',
            display: 'block'
          }}
        />
        <p style={{ color: 'var(--text-secondary)' }}>Vinculação de Login CaJa</p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px', textAlign: 'center', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          Vincular conta CaJa <Flame size={20} color="#ef4444" />
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '24px', lineHeight: '1.4' }}>
          Você realizou login pelo CaJa SSO, mas este e-mail ainda não está associado a nenhuma conta do JalaBank.
        </p>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent-red)',
            marginBottom: '18px',
            fontSize: '0.9rem',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={handleCreateNew}
              disabled={loading}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px'
              }}
            >
              <UserPlus size={18} />
              Criar Conta Nova
            </button>

            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '8px 0' }}>
              ou
            </div>

            <button
              onClick={() => setMode('link')}
              disabled={loading}
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                width: '100%'
              }}
            >
              <Link2 size={18} />
              Vincular com Conta Existente
            </button>
          </div>
        )}

        {mode === 'link' && (
          <form onSubmit={handleLinkExisting}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.4' }}>
              Insira as credenciais (e-mail corporativo + senha) da sua conta JalaBank atual para vinculá-la ao login do CaJa:
            </p>

            <div className="input-group">
              <label className="input-label">E-mail Corporativo</label>
              <input
                type="email"
                className="input-field"
                placeholder="ex: joao@jalapeno.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Senha Atual</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => { setMode('choose'); setError(''); }}
                className="btn"
                disabled={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '12px'
                }}
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 2, padding: '12px' }}
              >
                {loading ? 'Vinculando...' : 'Vincular Conta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
