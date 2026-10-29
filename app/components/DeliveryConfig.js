'use client';

import { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronRight, Clock, Plus, X } from 'lucide-react';

export default function DeliveryConfig() {
    const [configs, setConfigs] = useState({ daily_rate: 0, delivery_rate: 0, fee_rate: 0 });
    const [scales, setScales] = useState([]);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (isExpanded) {
            fetchConfigs();
            fetchScales();
        }
    }, [isExpanded]);

    const fetchConfigs = async () => {
        try {
            const res = await fetch('/api/drivers/configs');
            if (res.ok) {
                const data = await res.json();
                setConfigs(data);
            }
        } catch (error) {
            console.error('Error fetching delivery configs:', error);
        }
    };

    const fetchScales = async () => {
        try {
            const res = await fetch('/api/drivers/scales');
            if (res.ok) {
                const data = await res.json();
                setScales(data);
            }
        } catch (error) {
            console.error('Error fetching scales:', error);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/drivers/configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configs)
            });
            if (res.ok) {
                showToast('Configurações de Entregas salvas!');
                setIsExpanded(false); // Auto close on save
            } else {
                showToast('Erro ao salvar', 'error');
            }
        } catch (e) {
            showToast('Erro ao salvar', 'error');
        }
    };

    return (
        <div className="card">
            {toast.visible && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: toast.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
                    color: 'var(--text-primary)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 9999,
                    animation: 'slideUp 0.3s ease-out',
                    fontWeight: 600
                }}>
                    {toast.message}
                </div>
            )}

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
                        <Settings size={20} color="#38bdf8" />
                    </div>
                    <div>
                        <h3 className="h3" style={{ margin: 0 }}>Entregas: Valores de Referência</h3>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="config-header-right">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div style={{ display: 'grid', gap: '20px', animation: 'fadeIn 0.3s ease', marginTop: 20 }}>
                    <div className="input-group">
                        <label className="input-label">Valor da Diária (R$)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={configs.daily_rate}
                            onChange={e => setConfigs({ ...configs, daily_rate: Number(e.target.value) })}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Valor por Entrega (R$)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={configs.delivery_rate}
                            onChange={e => setConfigs({ ...configs, delivery_rate: Number(e.target.value) })}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Valor da Taxa (R$)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={configs.fee_rate}
                            onChange={e => setConfigs({ ...configs, fee_rate: Number(e.target.value) })}
                            placeholder="0,00"
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '12px' }}
                        onClick={handleSave}
                    >
                        Salvar Configurações de Entregas
                    </button>

                    {/* Scale Management Section */}
                    <div style={{
                        marginTop: '32px',
                        paddingTop: '32px',
                        borderTop: '1px solid #f8fafc'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--accent-green)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Clock size={18} />
                            </div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Gestão de Escalas (Terceirizados)</h4>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', marginBottom: '24px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label" style={{ fontSize: '0.7rem' }}>Início</label>
                                <input
                                    type="time"
                                    className="input-field"
                                    id="newScaleStart"
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label" style={{ fontSize: '0.7rem' }}>Fim</label>
                                <input
                                    type="time"
                                    className="input-field"
                                    id="newScaleEnd"
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ alignSelf: 'flex-end', padding: '12px 16px' }}
                                onClick={async () => {
                                    const start = document.getElementById('newScaleStart').value;
                                    const end = document.getElementById('newScaleEnd').value;
                                    if (!start || !end) return;
                                    const res = await fetch('/api/drivers/scales', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ start_time: start, end_time: end })
                                    });
                                    if (res.ok) {
                                        fetchScales();
                                        document.getElementById('newScaleStart').value = '';
                                        document.getElementById('newScaleEnd').value = '';
                                        showToast('Escala adicionada!');
                                    }
                                }}
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {scales.map(scale => (
                                <div
                                    key={scale.id}
                                    style={{
                                        background: '#f8fafc',
                                        borderRadius: '10px',
                                        padding: '6px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        border: '1px solid #f8fafc'
                                    }}
                                >
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                        {scale.start_time} - {scale.end_time}
                                    </span>
                                    <button
                                        onClick={async () => {
                                            if (confirm('Excluir esta escala?')) {
                                                const res = await fetch(`/api/drivers/scales?id=${scale.id}`, { method: 'DELETE' });
                                                if (res.ok) {
                                                    fetchScales();
                                                    showToast('Escala excluída!');
                                                }
                                            }
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(239, 68, 68, 0.5)',
                                            cursor: 'pointer',
                                            padding: '2px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
