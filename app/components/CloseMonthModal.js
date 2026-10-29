
'use client';

import { useState, useEffect } from 'react';
import { X, Lock, CheckCircle, AlertTriangle, Coins, Target, ClipboardList } from 'lucide-react';

export default function CloseMonthModal({ month, companyId, onClose, onConfirm }) {
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const res = await fetch(`/api/admin/close-month/preview?month=${month}&companyId=${companyId || ''}`);
                if (res.ok) {
                    const data = await res.json();
                    setPreviewData(data);
                }
            } catch (error) {
                console.error('Error fetching close month preview:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPreview();
    }, [month, companyId]);

    const handleConfirm = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/admin/close-month/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, companyId, rewards: previewData })
            });

            if (res.ok) {
                onConfirm();
            } else {
                alert('Erro ao processar fechamento');
            }
        } catch (error) {
            console.error('Error processing close month:', error);
            alert('Erro de conexão');
        } finally {
            setProcessing(false);
        }
    };

    const totalPlatas = previewData?.reduce((acc, u) => acc + u.totalPlatas, 0) || 0;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: 600,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                position: 'relative',
                border: '1px solid #e2e8f0',
                padding: 24
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12 }}>
                        <Lock size={24} color="#f87171" />
                    </div>
                    <div>
                        <h2 className="h2" style={{ margin: 0 }}>Fechar Mês: {month}</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Revise os bônus de disciplina que serão creditados. Prêmios diários já foram entregues (tempo real).
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Calculando recompensas...
                    </div>
                ) : (
                    <>
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            background: '#f1f5f9',
                            borderRadius: 12,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }}>
                            {previewData && previewData.map(user => (
                                <div key={user.userId} style={{
                                    background: '#f8fafc',
                                    padding: 12,
                                    borderRadius: 8,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid #f8fafc'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: 8, marginTop: 4 }}>
                                            {user.premioPlatas > 0 && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Target size={12} /> Prêmio por Dias: {Number(user.premioPlatas).toFixed(2)}
                                                </span>
                                            )}
                                            {user.disciplineDetails.length > 0 && (
                                                <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle size={12} /> Bônus: {user.disciplineDetails.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {Number(user.totalPlatas).toFixed(2)} <Coins size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            background: 'rgba(249, 115, 22, 0.05)',
                            border: '1px solid rgba(249, 115, 22, 0.2)',
                            padding: 16,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <AlertTriangle color="#f97316" size={20} />
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#fdba74' }}>
                                <strong>Atenção:</strong> Ao confirmar, o mês será trancado e {Number(totalPlatas).toFixed(2)} Platas serão distribuídas. Esta ação não pode ser desfeita automaticamente.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={onClose} className="btn" style={{ flex: 1, background: '#f8fafc', color: 'var(--text-primary)' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={processing}
                                className="btn btn-primary"
                                style={{ flex: 2, background: 'var(--accent-red)', color: 'var(--text-primary)' }}
                            >
                                {processing ? 'Processando...' : 'Confirmar e Fechar Mês'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
