'use client';

import { useState, useEffect } from 'react';
import { Play, Coffee, LogOut, CheckCircle2, RotateCcw, AlertCircle, Loader2, X, Clock } from 'lucide-react';

export default function FloatingCheckIn({ user }) {
    const [checkin, setCheckin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [currentTime, setCurrentTime] = useState(new Date());
    const [error, setError] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
    };

    // Fetch active check-in on mount
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        fetch(`/api/checkins?userId=${user.id}`)
            .then(res => res.json())
            .then(data => {
                setCheckin(data || null);
            })
            .catch(err => console.error('Error fetching checkin:', err))
            .finally(() => setLoading(false));
    }, [user?.id]);

    // Safe time formatter
    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return 'Inválido';
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error('Error formatting time:', e);
            return 'Erro';
        }
    };

    // Helper to calculate elapsed minutes
    const getElapsedMinutes = (startTime) => {
        if (!startTime) return 0;
        try {
            const start = new Date(startTime);
            if (isNaN(start.getTime())) return 0;
            const diff = currentTime.getTime() - start.getTime();
            return Math.floor(diff / (1000 * 60));
        } catch (e) {
            return 0;
        }
    };

    // Update time every second for the countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Helper to calculate countdown string (1 hour break)
    const getCountdownString = (checkoutBreakTime) => {
        if (!checkoutBreakTime) return '';
        try {
            const start = new Date(checkoutBreakTime);
            if (isNaN(start.getTime())) return '';
            const target = new Date(start.getTime() + 60 * 60 * 1000);
            const diff = target.getTime() - currentTime.getTime();
            
            if (diff <= 0) {
                return 'Voltar Agora';
            }
            
            const totalSeconds = Math.floor(diff / 1000);
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        } catch (e) {
            return '';
        }
    };

    // Notification Logic
    useEffect(() => {
        if (checkin && checkin.checkoutBreak && !checkin.checkinBreak) {
            const elapsed = getElapsedMinutes(checkin.checkoutBreak);
            const notifiedKey = `notified_break_${checkin.id}`;

            if (elapsed >= 50 && !localStorage.getItem(notifiedKey)) {
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('JalaBank - Intervalo', {
                        body: 'Seu intervalo acaba em 10 minutos! Prepare-se para voltar.',
                        icon: '/icon-192x192.png' // Assumes a standard icon path
                    });
                    localStorage.setItem(notifiedKey, 'true');
                }
            }
        }
    }, [currentTime, checkin]);

    const handleAction = async (action) => {
        setActionLoading(true);
        try {
            let coords = null;
            // Geolocation Logic - obtain coords for ALL actions (including EXIT)
            // The backend validates geography for all actions when company has geofencing configured
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 8000,
                        maximumAge: 10000
                    });
                });
                coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            } catch (geoError) {
                console.warn('Geolocation warning:', geoError);
                // On mobile, geolocation often fails. We show a warning but let them try if the company allows.
                // If the API requires it, it will return an error anyway.
            }

            const res = await fetch('/api/checkins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, companyId: user.company_id, action, coords })
            });

            if (res.ok) {
                const data = await res.json();
                setCheckin(data);
                setIsModalOpen(false);
                setError(null);

                let msg = '';
                switch (action) {
                    case 'ENTRY': msg = 'Check-in de entrada realizado!'; break;
                    case 'BREAK_START': msg = 'Início de intervalo registrado!'; break;
                    case 'BREAK_END': msg = 'Retorno de intervalo registrado!'; break;
                    case 'EXIT': msg = 'Check-out de saída realizado!'; break;
                }
                showToast(msg);
            } else {
                let errorMsg = 'Erro ao processar ação.';
                try {
                    const err = await res.json();
                    errorMsg = err.error || errorMsg;
                } catch (e) { /* fallback to default message */ }
                setError(errorMsg);
            }
        } catch (error) {
            console.error('handleAction error:', error);
            setError(error.message || 'Erro de conexão.');
            showToast('Erro ao processar.', 'error');
            // Trigger global error logger for unexpected crashes
            if (window.onerror) {
                window.onerror(`FloatingCheckIn Error: ${error.message}`, window.location.href, 0, 0, error);
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return null;

    // Determine current step and visibility
    const WAIT_TIME = 50; // 50 minutes
    let currentAction = 'ENTRY';
    let label = 'Entrar no Turno';
    let Icon = Play;
    let bgColor = 'var(--accent-green)';
    let isVisible = true;

    if (checkin) {
        if (!checkin.checkoutBreak) {
            currentAction = 'BREAK_START';
            label = 'Sair p/ Intervalo';
            Icon = Coffee;
            bgColor = 'var(--accent-orange)';
            isVisible = getElapsedMinutes(checkin.checkinEntry) >= WAIT_TIME;
        } else if (!checkin.checkinBreak) {
            currentAction = 'BREAK_END';
            const countdown = getCountdownString(checkin.checkoutBreak);
            label = countdown && countdown !== 'Voltar Agora' ? `Voltar (${countdown})` : 'Voltar do Intervalo';
            Icon = RotateCcw;
            bgColor = 'var(--accent-blue)';
            isVisible = true; // Always visible during break to show the countdown!
        } else if (!checkin.checkoutExit) {
            currentAction = 'EXIT';
            label = 'Encerrar Turno';
            Icon = LogOut;
            bgColor = 'var(--accent-red)';
            isVisible = getElapsedMinutes(checkin.checkinBreak) >= WAIT_TIME;
        } else {
            // Already finished
            return (
                <div className="checkin-completed-badge">
                    <CheckCircle2 size={16} />
                    Turno Finalizado
                    <style jsx>{`
                       .checkin-completed-badge {
                           position: fixed;
                           bottom: 100px;
                           right: 24px;
                           background: rgba(16, 185, 129, 0.1);
                           color: var(--accent-green);
                           padding: 6px 12px;
                           border-radius: 20px;
                           font-size: 0.75rem;
                           font-weight: 700;
                           display: flex;
                           align-items: center;
                           gap: 6px;
                           border: 1px solid rgba(16, 185, 129, 0.2);
                           backdrop-filter: blur(8px);
                           z-index: 90;
                       }
                   `}</style>
                </div>
            );
        }
    }

    if (!isVisible) return null;

    // Lateness logic for Modal
    const isLate = () => {
        if (currentAction !== 'ENTRY') return false;
        const h = currentTime.getHours();
        const m = currentTime.getMinutes();
        const total = h * 60 + m;
        // Business Rules: Day until 9:15, Night until 15:15
        if (total < 13 * 60) return total > (9 * 60 + 15);
        return total > (15 * 60 + 15);
    };

    const actionNames = {
        'ENTRY': 'Entrada no Turno',
        'BREAK_START': 'Saída para Intervalo',
        'BREAK_END': 'Retorno do Intervalo',
        'EXIT': 'Saída do Turno'
    };

    return (
        <>
            <button
                className={`fab-checkin ${actionLoading ? 'loading' : ''} ${currentAction === 'BREAK_END' ? 'break-countdown' : ''}`}
                onClick={() => {
                    setError(null);
                    setIsModalOpen(true);
                }}
                disabled={actionLoading}
            >
                {actionLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    <>
                        <Icon size={24} />
                        <span className="fab-label">{label}</span>
                    </>
                )}

                <style jsx>{`
                    .fab-checkin {
                        position: fixed;
                        bottom: 24px;
                        right: 24px;
                        height: 56px;
                        min-width: 56px;
                        border-radius: 28px;
                        background: ${bgColor};
                        color: black;
                        border: none;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0 20px;
                        gap: 10px;
                        cursor: pointer;
                        box-shadow: 0 8px 16px #f1f5f9, inset 0 2px 4px rgba(255,255,255,0.3);
                        z-index: 1000;
                        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        font-size: 0.85rem;
                    }
                    .fab-checkin:hover {
                        transform: translateY(-4px) scale(1.02);
                        box-shadow: 0 12px 20px #f1f5f9;
                        filter: brightness(1.1);
                    }
                    .fab-checkin:active {
                        transform: translateY(0) scale(0.95);
                    }
                    .fab-checkin.loading {
                        opacity: 0.8;
                        width: 56px;
                        padding: 0;
                    }
                    @media (max-width: 600px) {
                        .fab-checkin:not(.break-countdown) .fab-label {
                            display: none;
                        }
                        .fab-checkin:not(.break-countdown) {
                            padding: 0;
                            width: 56px;
                        }
                        .fab-checkin.break-countdown {
                            width: auto;
                            min-width: 150px;
                            padding: 0 16px;
                        }
                    }
                `}</style>
            </button>

            {/* Confirmation Modal */}
            {isModalOpen && (
                <div className="checkin-modal-overlay">
                    <div className="checkin-modal">
                        <div className="modal-header">
                            <h3>Confirmar Ação</h3>
                            <button onClick={() => setIsModalOpen(false)} className="close-btn"><X size={20} /></button>
                        </div>

                        <div className="modal-body">
                            <div className="action-badge" style={{ background: bgColor + '22', color: bgColor }}>
                                {actionNames[currentAction]}
                            </div>

                            <div className="info-row">
                                <Clock size={18} />
                                <div>
                                    <p className="label">Data e Hora Atual</p>
                                    <p className="value">
                                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        <br />
                                        <strong>{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="summary-cards">
                                {checkin && (
                                    <div className="summary-card">
                                        <div className="card-label">Horários</div>
                                        <div className="card-content">
                                             <div className="time-item">
                                                 <span className="dot entry"></span>
                                                 <span>Entrada: <strong>{formatTime(checkin.checkinEntry)}</strong></span>
                                             </div>
                                             {checkin.checkoutBreak && (
                                                 <div className="time-item">
                                                     <span className="dot break"></span>
                                                     <span>Intervalo: <strong>{formatTime(checkin.checkoutBreak)}</strong></span>
                                                 </div>
                                             )}
                                             {checkin.checkinBreak && (
                                                 <div className="time-item">
                                                     <span className="dot break"></span>
                                                     <span>Retorno: <strong>{formatTime(checkin.checkinBreak)}</strong></span>
                                                 </div>
                                             )}
                                        </div>
                                    </div>
                                )}

                            </div>

                            {isLate() && (
                                <div className="late-warning">
                                    <AlertCircle size={18} />
                                    <span>Você está realizando o check-in fora do horário ideal (Atrasado).</span>
                                </div>
                            )}

                            {error && (
                                <div className="error-warning">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="confirm-btn" style={{ background: bgColor }} onClick={() => handleAction(currentAction)}>
                                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Registro'}
                            </button>
                        </div>
                    </div>

                    <style jsx>{`
                        .checkin-modal-overlay {
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0,0,0,0.8);
                            backdrop-filter: blur(8px);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 2000;
                            padding: 20px;
                        }
                        .checkin-modal {
                            background: #111827;
                            border: 1px solid #e2e8f0;
                            border-radius: 24px;
                            width: 100%;
                            max-width: 400px;
                            box-shadow: 0 25px 50px -12px #f1f5f9;
                            animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        }
                        @keyframes modalIn {
                            from { transform: scale(0.9) translateY(20px); opacity: 0; }
                            to { transform: scale(1) translateY(0); opacity: 1; }
                        }
                        .modal-header {
                            padding: 24px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            border-bottom: 1px solid #f8fafc;
                        }
                        .modal-header h3 { margin: 0; font-size: 1.25rem; }
                        .close-btn { background: none; border: none; color: #9ca3af; cursor: pointer; }
                        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
                        .action-badge {
                            padding: 8px 16px;
                            border-radius: 12px;
                            font-weight: 800;
                            text-transform: uppercase;
                            font-size: 0.75rem;
                            letter-spacing: 1px;
                            align-self: flex-start;
                        }
                        .info-row { display: flex; gap: 16px; align-items: flex-start; }
                        .info-row .label { font-size: 0.75rem; color: #9ca3af; margin: 0; }
                        .info-row .value { font-size: 0.9rem; margin: 4px 0 0 0; text-transform: capitalize; }
                        .late-warning {
                            background: rgba(239, 68, 68, 0.1);
                            color: #fca5a5;
                            padding: 12px;
                            border-radius: 12px;
                            display: flex;
                            gap: 10px;
                            font-size: 0.8rem;
                            line-height: 1.4;
                            border: 1px solid rgba(239, 68, 68, 0.2);
                        }
                        .error-warning {
                            background: rgba(239, 68, 68, 0.15);
                            color: #ef4444;
                            padding: 14px;
                            border-radius: 12px;
                            display: flex;
                            gap: 12px;
                            font-size: 0.85rem;
                            line-height: 1.4;
                            border: 1px solid rgba(239, 68, 68, 0.3);
                            font-weight: 500;
                            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                        }
                        @keyframes shake {
                            10%, 90% { transform: translate3d(-1px, 0, 0); }
                            20%, 80% { transform: translate3d(2px, 0, 0); }
                            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                            40%, 60% { transform: translate3d(4px, 0, 0); }
                        }
                        .confirm-btn {
                            width: 100%;
                            height: 48px;
                            border-radius: 12px;
                            border: none;
                            color: black;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.2s;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .confirm-btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
                        .modal-footer { padding: 0 24px 24px 24px; }

                        .summary-cards {
                            display: flex;
                            flex-direction: column;
                            gap: 12px;
                        }
                        .summary-card {
                            background: #f8fafc;
                            border: 1px solid #f8fafc;
                            border-radius: 16px;
                            padding: 16px;
                        }
                        .card-label {
                            font-size: 0.65rem;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            color: #9ca3af;
                            margin-bottom: 8px;
                            font-weight: 700;
                        }
                        .card-content {
                            display: flex;
                            flex-direction: column;
                            gap: 6px;
                        }
                        .time-item, .scale-item {
                            font-size: 0.85rem;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        .dot {
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                        }
                        .dot.entry { background: var(--accent-green); }
                        .dot.break { background: var(--accent-orange); }
                        .dot.exit { background: var(--accent-red); }
                    `}</style>
                </div>
            )}

            {/* Local Toast */}
            {toast.visible && (
                <div className={`checkin-toast ${toast.type}`}>
                    {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    {toast.message}
                    <style jsx>{`
                        .checkin-toast {
                            position: fixed;
                            bottom: 90px;
                            right: 24px;
                            padding: 12px 20px;
                            border-radius: 12px;
                            background: #ffffff;
                            color: white;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            font-size: 0.9rem;
                            font-weight: 600;
                            box-shadow: 0 10px 25px #f1f5f9;
                            z-index: 1001;
                            backdrop-filter: blur(10px);
                            border: 1px solid #e2e8f0;
                            animation: slideIn 0.3s ease-out;
                        }
                        .checkin-toast.error { border-color: rgba(239, 68, 68, 0.5); color: #fca5a5; }
                        .checkin-toast.success { border-color: rgba(16, 185, 129, 0.5); color: #6ee7b7; }
                        @keyframes slideIn {
                            from { transform: translateX(50px); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
