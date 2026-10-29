'use client';

import { Flame } from 'lucide-react';

export default function CaJaLoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/caja-redirect';
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: 'var(--accent-red)',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      <Flame size={16} /> Entrar com CaJa
    </button>
  );
}
