
'use client';

import { useState, useEffect } from 'react';
import { Flame, Save, ChevronDown, ChevronRight } from 'lucide-react';

export default function StreaksConfig() {
    const [config, setConfig] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/streaks/config');
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (error) {
            console.error('Error fetching streaks config:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/streaks/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                alert('Configuração de Ofensivas salva!');
            } else {
                alert('Erro ao salvar configuração');
            }
        } catch (error) {
            console.error('Error saving streaks config:', error);
            alert('Erro de conexão');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !config) return null;

    return (
        <div className="card" style={{ border: 'var(--glass-border)' }}>
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="config-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        background: 'rgba(249, 115, 22, 0.1)',
                        padding: 8,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Flame size={20} color="#f97316" />
                    </div>
                    <div>
                        <h3 className="h3" style={{ margin: 0 }}>Configuração de Bônus</h3>
                    </div>
                </div>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>

            {isExpanded && (
                <form onSubmit={handleSave} style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Configure os bônus mensais concedidos por disciplina (zero faltas e zero atrasos). Estes valores são adicionados ao prêmio de desempenho do colaborador.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div className="input-group">
                            <label className="input-label">Bônus Zero Faltas (Platas)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={config.bonus_no_absences || ''}
                                onChange={e => setConfig({ ...config, bonus_no_absences: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                                min="0"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Bônus Zero Atrasos (Platas)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={config.bonus_no_lateness || ''}
                                onChange={e => setConfig({ ...config, bonus_no_lateness: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                                min="0"
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        <Save size={18} style={{ marginRight: 8 }} />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </form>
            )}
        </div>
    );
}
