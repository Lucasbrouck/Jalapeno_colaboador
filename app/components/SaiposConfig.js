'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function SaiposConfig() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [config, setConfig] = useState({
        saipos_token: '',
        ignore_ficha_venda: false
    });
    const [message, setMessage] = useState({ text: '', type: 'success' });

    useEffect(() => {
        if (user?.company_id) {
            fetchConfig();
        }
    }, [user?.company_id]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/companies/config?companyId=${user.company_id}`);
            if (res.ok) {
                const data = await res.json();
                setConfig({
                    saipos_token: data.saipos_token || '',
                    ignore_ficha_venda: Boolean(data.ignore_ficha_venda)
                });
            }
        } catch (error) {
            console.error('Error fetching Saipos config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const res = await fetch('/api/companies/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: user.company_id,
                    ...config
                })
            });

            if (res.ok) {
                setMessage({ text: 'Configurações do Saipos salvas!', type: 'success' });
                setIsExpanded(false);
            } else {
                const data = await res.json();
                setMessage({ text: data.error || 'Erro ao salvar.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Erro de conexão.', type: 'error' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage({ text: '', type: '' }), 4000);
        }
    };

    if (loading) return null;

    return (
        <div className="card">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="config-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isExpanded ? 20 : 0 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        padding: 8,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Info size={20} color="#38bdf8" />
                    </div>
                    <div>
                        <h3 className="h3" style={{ margin: 0 }}>Integração Saipos</h3>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="config-header-right">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div style={{ animation: 'fadeIn 0.3s ease', marginTop: 20 }}>
                    <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                        Insira o Token da API Saipos para automatizar a puxada de faturamento. Se configurado, o sistema atualizará o turno a cada 15 minutos.
                    </p>

                    <form onSubmit={handleSave}>
                        <div className="input-group">
                            <label className="input-label">Token Saipos (Data API)</label>
                            <input
                                type="password"
                                className="input-field"
                                value={config.saipos_token || ''}
                                onChange={e => setConfig({ ...config, saipos_token: e.target.value })}
                                placeholder="Digite o token aqui..."
                            />
                        </div>

                        <div className="input-group" style={{ marginTop: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12 }}>
                                <div style={{
                                    width: 44,
                                    height: 24,
                                    background: config.ignore_ficha_venda ? 'var(--accent-green)' : '#e2e8f0',
                                    borderRadius: 12,
                                    position: 'relative',
                                    transition: 'all 0.3s'
                                }}>
                                    <div style={{
                                        width: 18,
                                        height: 18,
                                        background: config.ignore_ficha_venda ? 'black' : 'white',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: 3,
                                        left: config.ignore_ficha_venda ? 23 : 3,
                                        transition: 'all 0.3s'
                                    }}></div>
                                </div>
                                <input
                                    type="checkbox"
                                    style={{ display: 'none' }}
                                    checked={config.ignore_ficha_venda || false}
                                    onChange={e => setConfig({ ...config, ignore_ficha_venda: e.target.checked })}
                                />
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ignorar Ficha/Senha (Tipo 4)</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Se ativado, vendas tipo FICHA/SENHA não somarão no faturamento.</div>
                                </div>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} style={{ marginRight: 8 }} />}
                                {saving ? 'Salvando...' : 'Salvar Token'}
                            </button>
                        </div>

                        {message.text && (
                            <div style={{
                                marginTop: 16,
                                padding: '10px 15px',
                                borderRadius: 8,
                                fontSize: '0.85rem',
                                background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: message.type === 'success' ? '#4ade80' : '#f87171',
                                border: '1px solid currentColor'
                            }}>
                                {message.text}
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
}
