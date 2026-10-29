'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Clock, AlertCircle, Trash2, ShoppingBag } from 'lucide-react';

export default function EditShiftModal({ shift, users, onClose, onSave, onDelete }) {
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        revenue: '',
        metrics: { CMV: '', RATING: '', OPS: '' },
        workers: []
    });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (shift) {
            setFormData({
                revenue: shift.revenue ?? '',
                metrics: shift.metrics || { CMV: '', RATING: '', OPS: '' },
                workers: shift.workers || []
            });
        }
    }, [shift]);

    if (!mounted || !shift) return null;

    const toggleWorker = (uid) => {
        setFormData(prev => {
            const existing = prev.workers.find(w => w.id === uid);
            let newWorkers;

            if (!existing) {
                newWorkers = [...prev.workers, { id: uid, status: 'ON_TIME' }];
            } else if (existing.status === 'ON_TIME') {
                newWorkers = prev.workers.map(w =>
                    w.id === uid ? { ...w, status: 'LATE' } : w
                );
            } else if (existing.status === 'LATE') {
                newWorkers = prev.workers.map(w =>
                    w.id === uid ? { ...w, status: 'ABSENT' } : w
                );
            } else {
                newWorkers = prev.workers.filter(w => w.id !== uid);
            }

            return { ...prev, workers: newWorkers };
        });
    };

    const handleDelete = async () => {
        if (confirm('Tem certeza que deseja excluir este turno permanentemente?')) {
            await onDelete(shift.id);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.metrics.CMV === '' || formData.metrics.RATING === '' || formData.metrics.OPS === '') {
            alert('Todas as métricas são obrigatórias');
            return;
        }

        const presentWorkers = formData.workers.filter(w => w.status !== 'ABSENT');
        const absentWorkers = formData.workers.filter(w => w.status === 'ABSENT');

        const updatedShift = {
            id: shift.id,
            date: shift.date,
            type: shift.type,
            revenue: parseFloat(formData.revenue) || 0,
            metrics: {
                CMV: parseFloat(formData.metrics.CMV) || 0,
                RATING: parseFloat(formData.metrics.RATING) || 0,
                OPS: parseFloat(formData.metrics.OPS) || 0
            },
            workers: presentWorkers
        };

        if (absentWorkers.length > 0) {
            await Promise.all(absentWorkers.map(w =>
                fetch('/api/absences', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: w.id,
                        date: shift.date,
                        description: `Falta registrada automaticamente via edição de turno (${shift.type === 'DAY' ? 'Dia' : 'Noite'})`,
                        excused: 0
                    })
                })
            ));
        }

        await onSave(updatedShift);
    };

    const formatDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    const eligibleUsers = users.filter(u => u.role !== 'admin');

    const modalContent = (
        <div
            className="rh-modal-overlay"
            onClick={onClose}
        >
            <div
                className="rh-modal"
                style={{ maxWidth: 620, width: '92%' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
                    <div>
                        <h3 className="h2" style={{ margin: '0 0 4px 0' }}>Editar Turno</h3>
                        <p className="text-xs" style={{ margin: 0, color: '#64748b', textTransform: 'capitalize' }}>
                            {formatDate(shift.date)} • {shift.type === 'DAY' ? 'Dia' : 'Noite'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Revenue */}
                    <div className="input-group" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, fontSize: '0.7rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <ShoppingBag size={12} /> Sincronizado via Saipos
                        </div>
                        <label className="input-label">Faturamento (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={formData.revenue}
                            onChange={e => setFormData({ ...formData, revenue: e.target.value })}
                        />
                    </div>

                    {/* Metrics */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, color: '#0f172a' }}>Métricas</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">CMV (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input-field"
                                    value={formData.metrics.CMV}
                                    onChange={e => setFormData({
                                        ...formData,
                                        metrics: { ...formData.metrics, CMV: e.target.value }
                                    })}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Avaliação (0-5)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="input-field"
                                    value={formData.metrics.RATING}
                                    onChange={e => setFormData({
                                        ...formData,
                                        metrics: { ...formData.metrics, RATING: e.target.value }
                                    })}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Operacional (0-10)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="input-field"
                                    value={formData.metrics.OPS}
                                    onChange={e => setFormData({
                                        ...formData,
                                        metrics: { ...formData.metrics, OPS: e.target.value }
                                    })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Workers */}
                    <div style={{ marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, color: '#0f172a' }}>Chamada</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {eligibleUsers.map(user => {
                                const worker = formData.workers.find(w => w.id === user.id);
                                const isSelected = !!worker;
                                const isLate = worker?.status === 'LATE';

                                let bg = '#ffffff', color = '#475569', border = '1px solid #cbd5e1';
                                if (isSelected) {
                                    if (isLate) {
                                        bg = '#f59e0b';
                                        color = '#ffffff';
                                        border = '1px solid #f59e0b';
                                    } else if (worker.status === 'ABSENT') {
                                        bg = '#ef4444';
                                        color = '#ffffff';
                                        border = '1px solid #ef4444';
                                    } else {
                                        bg = '#10b981';
                                        color = '#ffffff';
                                        border = '1px solid #10b981';
                                    }
                                }

                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => toggleWorker(user.id)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 999,
                                            border,
                                            background: bg,
                                            color,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {user.name}
                                        {isLate && <Clock size={12} />}
                                        {worker?.status === 'ABSENT' && <AlertCircle size={12} />}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs" style={{ color: '#64748b', marginTop: 10, marginBottom: 0 }}>
                            Clique para alternar: <strong>1x Presente</strong> → <strong>2x Atrasado</strong> → <strong>3x Falta</strong> → <strong>Remover</strong>
                        </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="btn btn-secondary"
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        >
                            <Trash2 size={16} /> Excluir
                        </button>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                            >
                                <Save size={16} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
