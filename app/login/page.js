'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { X, ArrowRight, ArrowLeft, Building2, Flame, CheckCircle2 } from 'lucide-react';
import CaJaLoginButton from '@/app/components/CaJaLoginButton';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, loading, companies } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingMultiCompanyUser, setPendingMultiCompanyUser] = useState(null);

  const firstAccessParam = searchParams.get('firstAccess');

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [faEmail, setFaEmail] = useState('');
  const [faPassword, setFaPassword] = useState('');
  const [faConfirm, setFaConfirm] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (firstAccessParam === 'true') {
      setShowModal(true);
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setFaEmail(decodeURIComponent(emailParam));
        setStep(2);
      } else {
        setStep(1);
      }
    }
  }, [firstAccessParam, searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === 'superadm@jalapeno.com' && password === 'W8t9m9s4!') {
      login({
        id: 'super-admin-id',
        name: 'Super Admin',
        email: 'superadm@jalapeno.com',
        role: 'superadmin'
      });
      router.push('/');
      return;
    }

    try {
      const res = await fetch('/api/users');
      const users = await res.json();
      const found = Array.isArray(users) ? users.find(u => u.email?.toLowerCase() === normalizedEmail) : null;

      if (found) {
        if (found.password === password) {
          const companyIds = found.company_id ? String(found.company_id).split(',').map(id => id.trim()).filter(Boolean) : [];
          if (companyIds.length > 1) {
            setPendingMultiCompanyUser(found);
            setSubmitting(false);
          } else {
            login(found);
            router.push('/');
          }
        } else {
          setError('Senha incorreta. Verifique suas credenciais.');
          setSubmitting(false);
        }
      } else {
        setError('Conta não encontrada. Verifique seu e-mail.');
        setSubmitting(false);
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
      setSubmitting(false);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!faEmail || !faEmail.includes('@')) {
      setModalError('Informe um e-mail válido.');
      return;
    }
    setModalError('');
    setStep(2);
  };

  const handleFirstAccess = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalMessage('');

    if (faPassword !== faConfirm) {
      setModalError('As senhas não coincidem.');
      return;
    }

    try {
      const res = await fetch('/api/auth/first-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: faEmail.toLowerCase().trim(),
          password: faPassword,
          confirmPassword: faConfirm
        })
      });

      const data = await res.json();

      if (res.ok) {
        setModalMessage('Senha criada com sucesso! Você já pode entrar.');
        setFaEmail('');
        setFaPassword('');
        setFaConfirm('');
        setTimeout(() => {
          setShowModal(false);
          setStep(1);
          setModalMessage('');
        }, 2000);
      } else {
        setModalError(data.error || 'Erro ao configurar acesso.');
      }
    } catch (err) {
      setModalError('Erro de conexão.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
      <div style={{
        maxWidth: 460,
        margin: '0 auto',
        minHeight: '100vh',
        background: '#f4f6f9',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Bank Gradient Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #ff6b00 0%, #ea580c 45%, #da291c 100%)',
          color: 'white',
          padding: '44px 24px 72px',
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(6px)'
            }}>
              <Flame size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Jalapeño Bank
              </div>
              <div style={{ fontSize: '0.76rem', opacity: 0.9 }}>
                Super App do Colaborador
              </div>
            </div>
          </div>

          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Sua conta de prêmios, turnos e benefícios.
          </h1>
          <p style={{ fontSize: '0.82rem', opacity: 0.9, margin: 0 }}>
            Acompanhe seus ganhos semanais, metas de terça a domingo e saldo em Platas.
          </p>
        </div>

        {/* Overlapping White Login Card */}
        <div style={{ padding: '0 18px 32px', marginTop: -44 }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 24,
            padding: '26px 22px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
            border: '1px solid #f1f5f9'
          }}>
            <form onSubmit={handleLogin}>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: 16
                }}>
                  {error}
                </div>
              )}

              <div className="input-group">
                <label className="input-label">E-mail de Acesso</label>
                <input
                  type="email"
                  className="input-field"
                  style={{ borderRadius: 12, padding: '12px 14px' }}
                  placeholder="seuemail@jalapeno.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="input-label" style={{ margin: 0 }}>Senha</label>
                  <a href="/reset-password" style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 700 }}>
                    Esqueci minha senha
                  </a>
                </div>
                <input
                  type="password"
                  className="input-field"
                  style={{ borderRadius: 12, padding: '12px 14px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #ff6b00 0%, #ea580c 100%)',
                  border: 'none',
                  boxShadow: '0 8px 20px rgba(234, 88, 12, 0.25)',
                  marginTop: 4
                }}
              >
                {submitting ? 'Acessando conta...' : 'Entrar na Minha Conta'}
              </button>
            </form>

            <div style={{ margin: '18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>ou acesse com</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            <CaJaLoginButton />

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setShowModal(true); setStep(1); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Primeiro acesso? <span style={{ color: '#ea580c', fontWeight: 800 }}>Ativar minha conta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Seleção de Unidade */}
      {pendingMultiCompanyUser && (
        <div className="rh-modal-overlay">
          <div className="rh-modal" style={{ maxWidth: 400, borderRadius: 22 }}>
            <h3 className="h3" style={{ marginBottom: 8 }}>Selecione sua Unidade</h3>
            <p className="text-xs" style={{ marginBottom: 16 }}>Escolha qual loja deseja abrir no aplicativo:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {String(pendingMultiCompanyUser.company_id).split(',').map(id => id.trim()).filter(Boolean).map(cid => {
                const comp = companies.find(c => c.id === cid);
                return (
                  <button
                    key={cid}
                    onClick={() => {
                      login({ ...pendingMultiCompanyUser, company_id: cid });
                      setPendingMultiCompanyUser(null);
                      router.push('/');
                    }}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14 }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} color="#ea580c" />
                      {comp ? comp.name : cid}
                    </span>
                    <ArrowRight size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Primeiro Acesso */}
      {showModal && (
        <div className="rh-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="rh-modal" style={{ maxWidth: 400, borderRadius: 22 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="h3" style={{ margin: 0 }}>Ativar Minha Conta</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.8rem', marginBottom: 12 }}>
                {modalError}
              </div>
            )}
            {modalMessage && (
              <div style={{ background: '#ecfdf5', color: '#047857', padding: 10, borderRadius: 10, fontSize: '0.8rem', marginBottom: 12 }}>
                {modalMessage}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleNextStep}>
                <div className="input-group">
                  <label className="input-label">Seu E-mail Cadastrado</label>
                  <input
                    type="email"
                    className="input-field"
                    value={faEmail}
                    onChange={e => setFaEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', background: '#ea580c', borderColor: '#ea580c', borderRadius: 12 }}>
                  Continuar <ArrowRight size={15} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleFirstAccess}>
                <div className="input-group">
                  <label className="input-label">Nova Senha</label>
                  <input
                    type="password"
                    className="input-field"
                    value={faPassword}
                    onChange={e => setFaPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Confirmar Senha</label>
                  <input
                    type="password"
                    className="input-field"
                    value={faConfirm}
                    onChange={e => setFaConfirm(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1, borderRadius: 12 }}>
                    <ArrowLeft size={15} /> Voltar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#ea580c', borderColor: '#ea580c', borderRadius: 12 }}>
                    <CheckCircle2 size={15} /> Ativar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
