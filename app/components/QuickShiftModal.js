'use client';

import { useState, useEffect } from 'react';
import { X, Save, Users, DollarSign, Clock, Calendar, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDateForInput, getMonday } from '@/lib/dateUtils';

export default function QuickShiftModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedWorkers, setSelectedWorkers] = useState([]);
    const [revenue, setRevenue] = useState('');
    const [date, setDate] = useState(formatDateForInput());
    const [shiftType, setShiftType] = useState('DAY');
    const [weeklyMetrics, setWeeklyMetrics] = useState(null);
    const [existingShiftId, setExistingShiftId] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Lógica de Pré-seleção Baseada no Horário
    useEffect(() => {
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hour * 60 + minutes;

        // Transition point: 14:45
        if (totalMinutes < (14 * 60 + 45)) {
            setShiftType('DAY');
            setDate(formatDateForInput());
        } else {
            setShiftType('NIGHT');
            // If it's early morning (before 4 AM), it belongs to "yesterday"
            if (hour < 4) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setDate(formatDateForInput(yesterday));
            } else {
                setDate(formatDateForInput());
            }
        }
    }, []);

    const fetchSaiposRevenue = async (targetDate, targetType) => {
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/saipos/sales?date=${targetDate}`);
            if (res.ok) {
                const data = await res.json();
                const value = targetType === 'DAY' ? data.dayRevenue : data.nightRevenue;
                setRevenue(value > 0 ? value.toString() : '');
            }
        } catch (error) {
            console.error('Error syncing with Saipos:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Buscar Métricas Semanais e Turno Existente quando a data/tipo mudar
    useEffect(() => {
        if (!date) return;
        const fetchData = async () => {
            const monday = getMonday(date);
            try {
                // Get companyId from some source - it should be in the user's auth context
                // In DashboardContent, it's authUser.company_id
                const companyId = localStorage.getItem('company_id'); // Fallback or wait for context
                // Fetch weekly metrics
                fetch(`/api/metrics/weekly?date=${monday}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => setWeeklyMetrics(data));

                // Check for existing shift
                const res = await fetch(`/api/shifts?companyId=${companyId || ''}`);
                if (res.ok) {
                    const allShifts = await res.json();
                    const shift = allShifts.find(s => s.date === date && s.type === shiftType);
                    if (shift) {
                        setExistingShiftId(shift.id);
                        setRevenue(shift.revenue || '');
                        setSelectedWorkers(shift.workers || []);
                    } else {
                        setExistingShiftId(null);
                        setSelectedWorkers([]);
                        // Se não existe turno, tenta buscar do Saipos
                        fetchSaiposRevenue(date, shiftType);
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            }
        };
        fetchData();
    }, [date, shiftType]);

    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                setAllUsers(data.filter(u => u.role !== 'admin'));
            });
    }, []);

    const toggleWorker = (id) => {
        setSelectedWorkers(prev => {
            const existing = prev.find(w => w.id === id);
            if (existing) {
                if (existing.status === 'ON_TIME') {
                    return prev.map(w => w.id === id ? { ...w, status: 'LATE' } : w);
                } else if (existing.status === 'LATE') {
                    return prev.map(w => w.id === id ? { ...w, status: 'ABSENT' } : w);
                } else {
                    return prev.filter(w => w.id !== id);
                }
            } else {
                return [...prev, { id, status: 'ON_TIME' }];
            }
        });
    };

    const handleSave = async () => {
        if (!revenue || selectedWorkers.length === 0) {
            alert('Preencha o faturamento e selecione pelo menos um funcionário.');
            return;
        }

        setLoading(true);
        try {
            const presentWorkers = selectedWorkers.filter(w => w.status !== 'ABSENT');
            const absentWorkers = selectedWorkers.filter(w => w.status === 'ABSENT');

            const shiftData = {
                id: existingShiftId,
                date,
                type: shiftType,
                revenue: parseFloat(revenue),
                workers: presentWorkers,
                metrics: {
                    CMV: weeklyMetrics?.cmv != null ? parseFloat(weeklyMetrics.cmv) : null,
                    RATING: weeklyMetrics?.rating != null ? parseFloat(weeklyMetrics.rating) : null,
                    OPS: weeklyMetrics?.ops != null ? parseFloat(weeklyMetrics.ops) : null
                }
            };

            const url = '/api/shifts';
            const method = existingShiftId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shiftData)
            });

            if (res.ok) {
                if (absentWorkers.length > 0) {
                    await Promise.all(absentWorkers.map(w =>
                        fetch('/api/absences', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: w.id,
                                date,
                                description: `Falta registrada automaticamente via conferência de turno (${shiftType === 'DAY' ? 'Dia' : 'Noite'})`,
                                excused: 0
                            })
                        })
                    ));
                }

                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert('Erro ao salvar turno: ' + (err.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Erro de conexão ou erro interno do servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
        }}>
            <div style={{
                background: 'var(--bg-card)',
                width: '100%',
                maxWidth: 500,
                borderRadius: 24,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Clock color="var(--accent-orange)" size={28} />
                        Conferir Turno
                    </h2>
                    <button onClick={onClose} style={{ background: '#e2e8f0', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 8, borderRadius: '50%' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Date and Type */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label className="text-xs" style={{ color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Data</label>
                            <input
                                type="date"
                                className="input-field"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                style={{ width: '100%', height: 48 }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="text-xs" style={{ color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Turno</label>
                            <select
                                className="input-field"
                                value={shiftType}
                                onChange={e => setShiftType(e.target.value)}
                                style={{ width: '100%', height: 48 }}
                            >
                                <option value="DAY">Dia</option>
                                <option value="NIGHT">Noite</option>
                            </select>
                        </div>
                    </div>

                    {/* Revenue */}
                    <div>
                        <label className="text-xs" style={{ color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Faturamento do Dia</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 700 }}>R$</span>
                            <input
                                type="number"
                                placeholder="0,00"
                                className="input-field"
                                value={revenue}
                                onChange={e => setRevenue(e.target.value)}
                                style={{ width: '100%', height: 56, paddingLeft: 45, fontSize: '1.2rem', fontWeight: 700 }}
                            />
                            <button
                                onClick={() => fetchSaiposRevenue(date, shiftType)}
                                disabled={isSyncing}
                                title="Sincronizar com Saipos"
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 8,
                                    padding: '6px 10px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                            </button>
                        </div>
                    </div>

                    {/* Workers List - REPLICATED FROM ADMIN UI */}
                    <div>
                        <label className="text-xs" style={{ color: 'var(--text-secondary)', marginBottom: 10, display: 'block' }}>
                            Fazer Chamada ({selectedWorkers.length} presentes)
                        </label>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            maxHeight: 200,
                            overflowY: 'auto',
                            padding: '4px 0'
                        }}>
                            {allUsers.map(u => {
                                const record = selectedWorkers.find(sw => sw.id === u.id);
                                let bg = '#f8fafc', color = 'var(--text-secondary)';
                                if (record) {
                                    if (record.status === 'ON_TIME') { bg = 'var(--accent-green)'; color = 'white'; }
                                    else if (record.status === 'LATE') { bg = 'var(--accent-orange)'; color = 'white'; }
                                    else { bg = 'var(--accent-red)'; color = 'white'; }
                                }
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => toggleWorker(u.id)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 20,
                                            background: bg,
                                            border: 'none',
                                            color,
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {u.name}
                                        {record?.status === 'LATE' && <Clock size={14} />}
                                        {record?.status === 'ABSENT' && <AlertCircle size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.75rem', lineHeight: '1.4' }}>
                            * Toque 1x: <b>Presente</b> (verde) | 2x: <b>Atrasado</b> (laranja) | 3x: <b>Falta</b> (vermelho) | 4x: Remover.
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ height: 56, gap: 10, marginTop: 10 }}
                    >
                        {loading ? 'Salvando...' : (
                            <>
                                <Save size={20} />
                                {existingShiftId ? 'Finalizar Turno' : 'Salvar Turno'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
