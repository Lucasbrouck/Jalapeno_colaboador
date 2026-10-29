'use client';

import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, User, DollarSign, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function TransferModal({ isOpen, onClose, users, balance, userId, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        toUserId: '',
        amount: '',
        description: '',
        password: ''
    });

    if (!isOpen) return null;

    const selectedUser = users.find(u => u.id === formData.toUserId);

    const handleNext = () => {
        setError('');
        if (step === 1 && !formData.toUserId) {
            setError('Selecione um destinatário');
            return;
        }
        if (step === 2) {
            if (!formData.amount || parseInt(formData.amount) <= 0) {
                setError('Digite um valor válido');
                return;
            }
            if (parseInt(formData.amount) > balance) {
                setError('Saldo insuficiente');
                return;
            }
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        setError('');
        setStep(step - 1);
    };

    const handleSubmit = async () => {
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/plata/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromUserId: userId,
                    toUserId: formData.toUserId,
                    amount: parseInt(formData.amount),
                    description: formData.description,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error);
                setLoading(false);
                return;
            }

            // Success!
            onSuccess();
            handleClose();

        } catch (err) {
            setError('Erro ao processar transferência');
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setFormData({ toUserId: '', amount: '', description: '', password: '' });
        setError('');
        setLoading(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            animation: 'fadeIn 0.2s ease'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto',
                animation: 'slideUp 0.3s ease'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
                        Transferir Platas
                    </h2>
                    <button
                        onClick={handleClose}
                        style={{
                            background: '#e2e8f0',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div style={{
                    padding: '20px',
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center'
                }}>
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            style={{
                                flex: 1,
                                height: '4px',
                                background: s <= step ? 'var(--accent-orange)' : '#e2e8f0',
                                borderRadius: '2px',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                    {/* Step 1: Select User */}
                    {step === 1 && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <User size={20} color="var(--accent-orange)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Selecione o Destinatário</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setFormData({ ...formData, toUserId: user.id })}
                                        style={{
                                            padding: '16px',
                                            background: formData.toUserId === user.id ? 'rgba(249, 115, 22, 0.2)' : '#f8fafc',
                                            border: formData.toUserId === user.id ? '2px solid var(--accent-orange)' : '2px solid transparent',
                                            borderRadius: '12px',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{user.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {user.role === 'admin' ? 'Administrador' : 'Funcionário'}
                                            </div>
                                        </div>
                                        {formData.toUserId === user.id && (
                                            <CheckCircle size={20} color="var(--accent-orange)" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Amount & Description */}
                    {step === 2 && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <DollarSign size={20} color="var(--accent-orange)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Valor e Descrição</h3>
                            </div>

                            {/* Selected User Info */}
                            <div style={{
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Transferindo para:
                                </div>
                                <div style={{ fontWeight: 600 }}>{selectedUser?.name}</div>
                            </div>

                            {/* Amount Input */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                                    Quantidade de Platas
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={balance}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0"
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: '#f8fafc',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        textAlign: 'center'
                                    }}
                                />
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
                                    Saldo disponível: {Number(balance).toFixed(2)} Platas
                                </div>
                            </div>

                            {/* Description Input */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                                    Descrição (opcional)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Motivo da transferência..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        resize: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Password Confirmation */}
                    {step === 3 && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Lock size={20} color="var(--accent-orange)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Confirmar Transferência</h3>
                            </div>

                            {/* Transfer Summary */}
                            <div style={{
                                padding: '16px',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        Destinatário
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedUser?.name}</div>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        Valor
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '1.5rem', color: '#C0C0C0' }}>
                                        {Number(formData.amount || 0).toFixed(2)} Platas
                                    </div>
                                </div>

                                {formData.description && (
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            Descrição
                                        </div>
                                        <div style={{ fontSize: '0.95rem' }}>{formData.description}</div>
                                    </div>
                                )}
                            </div>

                            {/* Password Input */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                                    Digite sua senha para confirmar
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Senha"
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: '#f8fafc',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--accent-red)',
                            marginTop: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '12px'
                }}>
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: '#e2e8f0',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                opacity: loading ? 0.5 : 1
                            }}
                        >
                            <ArrowLeft size={18} />
                            Voltar
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: 'var(--accent-orange)',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            Próximo
                            <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.password}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: loading || !formData.password ? '#e2e8f0' : 'var(--accent-green)',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: loading || !formData.password ? 'not-allowed' : 'pointer',
                                opacity: loading || !formData.password ? 0.5 : 1
                            }}
                        >
                            {loading ? 'Processando...' : 'Confirmar Transferência'}
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
