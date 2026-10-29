'use client';

import { useState, useEffect, useCallback } from 'react';
import { Edit, Check, X, Calendar, Clock } from 'lucide-react';
import { getMonday } from '@/lib/dateUtils';
import { getOperationalWeekInfo, evaluateMetricMultiplier } from '@/lib/prizeUtils';
import { useAuth } from '@/app/context/AuthContext';

export default function WeeklyMetricsConfig({ shifts = [], goalConfig = null, onUpdate }) {
    const { user: authUser } = useAuth();
    const currentWeekMonday = getMonday(new Date());

    const [savedWeeks, setSavedWeeks] = useState([]);
    const [localShifts, setLocalShifts] = useState(shifts);
    const [localGoals, setLocalGoals] = useState(goalConfig);
    const [loading, setLoading] = useState(true);
    const [savingDate, setSavingDate] = useState(null);

    // Inline row editing state
    const [editingDate, setEditingDate] = useState(null);
    const [editValues, setEditValues] = useState({ cmv: '', rating: '', ops: '' });

    useEffect(() => {
        if (shifts && shifts.length > 0) setLocalShifts(shifts);
    }, [shifts]);

    useEffect(() => {
        if (goalConfig) setLocalGoals(goalConfig);
    }, [goalConfig]);

    const loadAllWeeks = useCallback(async () => {
        if (!authUser?.company_id) return;
        setLoading(true);
        try {
            const [res, shiftsRes, goalsRes] = await Promise.all([
                fetch(`/api/metrics/weekly?companyId=${authUser.company_id}`, { cache: 'no-store' }),
                (!shifts || shifts.length === 0)
                    ? fetch(`/api/shifts?companyId=${authUser.company_id}`, { cache: 'no-store' })
                    : Promise.resolve(null),
                !goalConfig
                    ? fetch(`/api/goals?month=WEEKLY&companyId=${authUser.company_id}`, { cache: 'no-store' })
                    : Promise.resolve(null)
            ]);

            if (res && res.ok) {
                const data = await res.json();
                setSavedWeeks(Array.isArray(data) ? data : []);
            }
            if (shiftsRes && shiftsRes.ok) {
                setLocalShifts(await shiftsRes.json());
            }
            if (goalsRes && goalsRes.ok) {
                setLocalGoals(await goalsRes.json());
            }
        } catch (err) {
            console.error('Error loading weekly metrics list:', err);
        } finally {
            setLoading(false);
        }
    }, [authUser?.company_id, shifts, goalConfig]);

    useEffect(() => {
        loadAllWeeks();
    }, [loadAllWeeks]);

    // Sum revenue per operational week
    const revenueByWeek = {};
    (localShifts || []).forEach(s => {
        if (!s?.date) return;
        const wk = getMonday(s.date);
        revenueByWeek[wk] = (revenueByWeek[wk] || 0) + Number(s.revenue || 0);
    });

    const buildWeeksRows = () => {
        const map = new Map();

        const [cy, cm, cd] = currentWeekMonday.split('-').map(Number);
        for (let i = 0; i < 16; i++) {
            const d = new Date(cy, cm - 1, cd);
            d.setDate(d.getDate() - i * 7);
            const mondayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            map.set(mondayStr, {
                date: mondayStr,
                cmv: null,
                rating: null,
                ops: null,
                saved: false
            });
        }

        for (const w of savedWeeks) {
            if (!w.date) continue;
            map.set(w.date, {
                date: w.date,
                cmv: w.cmv,
                rating: w.rating,
                ops: w.ops,
                saved: (Number(w.cmv || 0) > 0 || Number(w.rating || 0) > 0 || Number(w.ops || 0) > 0)
            });
        }

        return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    };

    const handleSaveRow = async (mondayDate, values) => {
        if (!authUser?.company_id) return;
        setSavingDate(mondayDate);
        try {
            const res = await fetch('/api/metrics/weekly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: mondayDate,
                    cmv: values.cmv === '' ? null : parseFloat(values.cmv),
                    rating: values.rating === '' ? null : parseFloat(values.rating),
                    ops: values.ops === '' ? null : parseFloat(values.ops),
                    company_id: authUser.company_id
                })
            });
            if (res.ok) {
                setEditingDate(null);
                await loadAllWeeks();
                if (onUpdate) onUpdate();
            } else {
                alert('Erro ao salvar métricas da semana');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar métricas da semana');
        } finally {
            setSavingDate(null);
        }
    };

    const renderMultPill = (mult) => {
        if (mult === 1.0) return <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: 6, marginLeft: 6 }}>100%</span>;
        if (mult === 0.8) return <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '2px 6px', borderRadius: 6, marginLeft: 6 }}>80%</span>;
        return <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', background: '#fef2f2', padding: '2px 6px', borderRadius: 6, marginLeft: 6 }}>0%</span>;
    };

    const rows = buildWeeksRows();
    const weeklyGoalRev = Number(localGoals?.REVENUE?.goal || 0);

    return (
        <div className="rh-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div>
                    <h3 className="h2" style={{ margin: 0 }}>Histórico de Semanas Operacionais & Apuração</h3>
                    <p className="text-xs" style={{ margin: 0 }}>
                        A operação ocorre de Terça a Domingo e as métricas são apuradas na Segunda-feira seguinte referente à semana encerrada
                    </p>
                </div>
                {weeklyGoalRev > 0 && (
                    <div style={{ fontSize: '0.78rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 8, color: '#334155', fontWeight: 600 }}>
                        Meta Semanal: <strong style={{ color: '#0f172a' }}>R$ {weeklyGoalRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        {localGoals?.REVENUE?.superGoal ? (
                            <> • Supermeta: <strong style={{ color: '#059669' }}>R$ {Number(localGoals.REVENUE.superGoal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="rh-table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="rh-table">
                    <thead>
                        <tr>
                            <th>Semana Operacional (Ter a Dom)</th>
                            <th>Apuração (Segunda)</th>
                            <th>Faturamento Semanal</th>
                            <th>CMV (%)</th>
                            <th>Avaliação (0-5)</th>
                            <th>Nota Operacional (0-10)</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                    Carregando histórico de semanas...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                    Nenhuma semana encontrada.
                                </td>
                            </tr>
                        ) : (
                            rows.map(row => {
                                const isCurrent = row.date >= currentWeekMonday;
                                const isEditingRow = editingDate === row.date;
                                const isSavingRow = savingDate === row.date;
                                const info = getOperationalWeekInfo(row.date);
                                const wkRev = revenueByWeek[row.date] || 0;
                                const mRev = evaluateMetricMultiplier(wkRev, localGoals?.REVENUE);
                                const mCMV = row.saved ? evaluateMetricMultiplier(row.cmv, localGoals?.CMV) : null;
                                const mRat = row.saved ? evaluateMetricMultiplier(row.rating, localGoals?.RATING) : null;
                                const mOps = row.saved ? evaluateMetricMultiplier(row.ops, localGoals?.OPS) : null;

                                return (
                                    <tr key={row.date} style={{ background: isCurrent ? '#fffbeb' : undefined }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Calendar size={15} color={isCurrent ? '#d97706' : '#64748b'} />
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                                    {info?.operationalLabel || row.date}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                                                {info?.apuracaoLabel}
                                            </span>
                                        </td>

                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, color: wkRev > 0 ? '#0f172a' : '#94a3b8' }}>
                                                    R$ {wkRev.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                {wkRev > 0 && !isCurrent && renderMultPill(mRev)}
                                            </div>
                                        </td>

                                        {isEditingRow ? (
                                            <>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="input-field"
                                                        style={{ maxWidth: 100, padding: '6px 10px' }}
                                                        value={editValues.cmv}
                                                        onChange={e => setEditValues({ ...editValues, cmv: e.target.value })}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="input-field"
                                                        style={{ maxWidth: 100, padding: '6px 10px' }}
                                                        value={editValues.rating}
                                                        onChange={e => setEditValues({ ...editValues, rating: e.target.value })}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="input-field"
                                                        style={{ maxWidth: 100, padding: '6px 10px' }}
                                                        value={editValues.ops}
                                                        onChange={e => setEditValues({ ...editValues, ops: e.target.value })}
                                                    />
                                                </td>
                                                <td>
                                                    <span className="rh-badge badge-info">Editando...</span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: 8 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveRow(row.date, editValues)}
                                                            disabled={isSavingRow}
                                                            className="btn btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981' }}
                                                        >
                                                            <Check size={14} /> Salvar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingDate(null)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ fontWeight: 700, color: row.cmv != null ? '#0f172a' : '#94a3b8' }}>
                                                    {row.cmv != null ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            {row.cmv}% {!isCurrent && mCMV !== null && renderMultPill(mCMV)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ fontWeight: 700, color: row.rating != null ? '#0f172a' : '#94a3b8' }}>
                                                    {row.rating != null ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            {row.rating} {!isCurrent && mRat !== null && renderMultPill(mRat)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ fontWeight: 700, color: row.ops != null ? '#0f172a' : '#94a3b8' }}>
                                                    {row.ops != null ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            {row.ops} {!isCurrent && mOps !== null && renderMultPill(mOps)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    {isCurrent ? (
                                                        <span className="rh-badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={12} /> Em Apuração ({info?.apuracaoLabel})
                                                        </span>
                                                    ) : row.saved ? (
                                                        <span className="rh-badge badge-success">Consolidada</span>
                                                    ) : (
                                                        <span className="rh-badge badge-neutral">Pendente Apuração</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingDate(row.date);
                                                            setEditValues({
                                                                cmv: row.cmv ?? '',
                                                                rating: row.rating ?? '',
                                                                ops: row.ops ?? ''
                                                            });
                                                        }}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                                    >
                                                        <Edit size={14} /> {row.saved ? 'Editar' : 'Apurar'}
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
