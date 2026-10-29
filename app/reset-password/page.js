'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Link inválido ou ausente.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== confirm) {
            setError('As senhas não coincidem');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password,
                    confirmPassword: confirm
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setError(data.error || 'Erro ao redefinir senha');
            }
        } catch (err) {
            setError('Erro de conexão ao servidor');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div className="card" style={{ maxWidth: 400, textAlign: 'center', padding: 40 }}>
                    <div style={{ marginBottom: 20 }}>
                        <CheckCircle size={64} color="var(--accent-green)" style={{ margin: '0 auto' }} />
                    </div>
                    <h2 className="h2" style={{ marginBottom: 10 }}>Senha Redefinida!</h2>
                    <p className="text-secondary">Sua senha foi alterada com sucesso. Redirecionando para o login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ background: 'var(--accent-blue)', width: 60, height: 60, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
                    <Lock color="white" size={32} />
                </div>
                <h1 className="h1">Redefinir Senha</h1>
                <p className="text-secondary">Crie uma nova senha segura</p>
            </div>

            <div className="card" style={{ width: '100%', maxWidth: 400 }}>
                {error && (
                    <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <AlertTriangle size={20} />
                        <span style={{ fontSize: '0.9rem' }}>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Nova Senha</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={4}
                            disabled={!token || loading}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Confirmar Senha</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="••••••"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            required
                            disabled={!token || loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!token || loading}
                    >
                        {loading ? 'Processando...' : 'Alterar Senha'}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 10 }}
                    >
                        Voltar para Login
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Carregando...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
