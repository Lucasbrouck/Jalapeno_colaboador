'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Coffee, LogOut, CheckCircle2, RotateCcw, AlertCircle, Loader2, X, Clock, Coins, Sparkles } from 'lucide-react';

export default function FloatingCheckIn({ user, variant = 'floating' }) {
    const isNav = variant === 'nav';
    const [checkin, setCheckin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rewardModal, setRewardModal] = useState({ open: false, platas: 0, status: 'ON_TIME' });
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
            const timer = setTimeout(() => setLoading(false), 2000);
            return () => clearTimeout(timer);
        }
        setLoading(true);
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

    const navButtonStyle = (color, disabled) => ({
        background: 'none',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        color: disabled ? '#94a3b8' : color,
        fontWeight: 700,
        fontSize: '0.68rem',
        cursor: disabled ? 'default' : 'pointer',
        padding: '0',
        textAlign: 'center',
        lineHeight: 1.1
    });
    const navCircleStyle = (color, disabled) => ({
        width: 52,
        height: 52,
        marginTop: -22,
        borderRadius: '50%',
        background: disabled ? '#e2e8f0' : color,
        color: disabled ? '#94a3b8' : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '4px solid #fff',
        boxShadow: disabled ? 'none' : '0 6px 14px rgba(15, 23, 42, 0.2)'
    });

    if (loading || !user?.id) {
        if (isNav) {
            return (
                <button type="button" disabled style={navButtonStyle('#94a3b8', true)}>
                    <span style={navCircleStyle('#e2e8f0', true)}>
                        <Loader2 size={22} className="animate-spin" style={{ color: '#94a3b8' }} />
                    </span>
                    <span style={{ color: '#94a3b8' }}>Ponto</span>
                </button>
            );
        }
        return (
            <div className="fab-checkin loading" style={{ background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' }}>
                <Loader2 size={24} className="animate-spin" />
            </div>
        );
    }

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
            if (isNav) {
                return (
                    <button type="button" disabled style={navButtonStyle('#94a3b8', true)}>
                        <span style={navCircleStyle('#e2e8f0', true)}><CheckCircle2 size={24} style={{ color: '#94a3b8' }} /></span>
                        <span style={{ color: '#94a3b8' }}>Finalizado</span>
                    </button>
                );
            }
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

    if (!isVisible) {
        if (isNav) {
            return (
                <button type="button" disabled style={navButtonStyle('#94a3b8', true)}>
                    <span style={navCircleStyle('#e2e8f0', true)}>
                        <Icon size={24} style={{ color: '#94a3b8' }} />
                    </span>
                    <span style={{ color: '#94a3b8' }}>Em turno</span>
                </button>
            );
        }
        return (
            <div className="fab-checkin" style={{ background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' }}>
                <Icon size={24} />
                <span className="fab-label">Em turno</span>
            </div>
        );
    }

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
            {isNav && (
                <button
                    type="button"
                    onClick={() => { setError(null); setIsModalOpen(true); }}
                    disabled={actionLoading}
                    style={navButtonStyle(bgColor, false)}
                >
                    <span style={navCircleStyle(bgColor, false)}>
                        {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <Icon size={24} />}
                    </span>
                    <span>{label}</span>
                </button>
            )}
            {!isNav && (
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
            )}

            {/* Confirmation Modal */}
            {isModalOpen && createPortal(
                <div
                    onClick={() => !actionLoading && setIsModalOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: 24
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 300,
                            padding: 18, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
                            display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {actionNames[currentAction]}
                        </div>
                        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize', marginTop: -6 }}>
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>

                        {checkin && (
                            <div style={{ fontSize: '0.74rem', color: '#475569', background: '#f8fafc', borderRadius: 12, padding: '8px 10px', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <span>Entrada <strong>{formatTime(checkin.checkinEntry)}</strong></span>
                                {checkin.checkoutBreak && <span>Intervalo <strong>{formatTime(checkin.checkoutBreak)}</strong></span>}
                                {checkin.checkinBreak && <span>Retorno <strong>{formatTime(checkin.checkinBreak)}</strong></span>}
                            </div>
                        )}

                        {isLate() && (
                            <div style={{ fontSize: '0.72rem', color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '6px 10px' }}>
                                Check-in fora do horário ideal (atrasado).
                            </div>
                        )}

                        {error && (
                            <div style={{ fontSize: '0.74rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '6px 10px', fontWeight: 600 }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                disabled={actionLoading}
                                style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAction(currentAction)}
                                disabled={actionLoading}
                                style={{ flex: 1.4, height: 42, borderRadius: 12, border: 'none', background: '#ea580c', color: '#fff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Local Toast */}
            {toast.visible && createPortal(
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
            , document.body)}
            {/* Modal de Recompensa de Platas (Ao bater ponto de entrada) */}
            {rewardModal.open && createPortal(
                <div
                    onClick={() => setRewardModal(prev => ({ ...prev, open: false }))}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.72)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3000,
                        padding: 24
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="plata-reward-card"
                        style={{
                            background: '#ffffff',
                            borderRadius: 24,
                            width: '100%',
                            maxWidth: 320,
                            padding: '28px 22px 22px',
                            boxShadow: '0 25px 60px rgba(234, 88, 12, 0.25), 0 10px 30px rgba(15, 23, 42, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Shimmer top line */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 6,
                            background: 'linear-gradient(90deg, #f59e0b, #ea580c, #f59e0b)'
                        }} />

                        {/* Floating sparkles */}
                        <div className="plata-sparkle sparkle-tl">✨</div>
                        <div className="plata-sparkle sparkle-tr">⭐</div>
                        <div className="plata-sparkle sparkle-br">✨</div>

                        {/* Animated Jumping Coin */}
                        <div className="coin-jump-stage">
                            <div className="coin-glow-aura" />
                            <div className="coin-jumping-wrapper">
                                <div className="coin-disc">
                                    <div className="coin-specular" />
                                    <Coins size={38} color="#ffffff" strokeWidth={2.4} />
                                </div>
                            </div>
                        </div>

                        {/* Badge */}
                        <div style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#ea580c',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            background: '#fff7ed',
                            border: '1px solid #ffedd5',
                            padding: '4px 12px',
                            borderRadius: 999,
                            marginBottom: 10,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}>
                            <Sparkles size={12} /> Turno Iniciado!
                        </div>

                        {/* Amount */}
                        <div style={{
                            fontSize: '1.85rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            lineHeight: 1.1,
                            marginBottom: 8
                        }}>
                            +{rewardModal.platas} {rewardModal.platas === 1 ? 'Plata' : 'Platas'}!
                        </div>

                        {/* Subtitle */}
                        <p style={{
                            fontSize: '0.8rem',
                            color: '#64748b',
                            lineHeight: 1.45,
                            margin: '0 0 20px',
                            padding: '0 6px'
                        }}>
                            {rewardModal.status === 'LATE'
                                ? 'Check-in realizado com atraso. Você garantiu +1 Plata na sua carteira!'
                                : 'Parabéns pela pontualidade! Você garantiu o bônus máximo de +3 Platas na carteira.'}
                        </p>

                        {/* Dismiss button */}
                        <button
                            type="button"
                            onClick={() => setRewardModal(prev => ({ ...prev, open: false }))}
                            style={{
                                width: '100%',
                                height: 46,
                                borderRadius: 14,
                                border: 'none',
                                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.86rem',
                                cursor: 'pointer',
                                boxShadow: '0 8px 18px rgba(234, 88, 12, 0.3)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}
                        >
                            Bora pro Turno!
                        </button>

                        <style jsx>{`
                            .plata-reward-card {
                                animation: rewardModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                            }
                            @keyframes rewardModalIn {
                                0% { opacity: 0; transform: scale(0.65) translateY(30px); }
                                100% { opacity: 1; transform: scale(1) translateY(0); }
                            }
                            .coin-jump-stage {
                                position: relative;
                                width: 110px;
                                height: 110px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin-bottom: 12px;
                            }
                            .coin-glow-aura {
                                position: absolute;
                                width: 95px;
                                height: 95px;
                                border-radius: 50%;
                                background: radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, rgba(234, 88, 12, 0.2) 55%, transparent 75%);
                                animation: auraPulse 1.8s ease-in-out infinite alternate;
                            }
                            @keyframes auraPulse {
                                0% { transform: scale(0.8); opacity: 0.5; }
                                100% { transform: scale(1.4); opacity: 1; }
                            }
                            .coin-jumping-wrapper {
                                animation: coinJumpAnim 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, coinIdleAnim 2.2s ease-in-out 0.85s infinite alternate;
                            }
                            @keyframes coinJumpAnim {
                                0% { transform: translateY(90px) scale(0.15) rotate(-45deg); opacity: 0; }
                                50% { transform: translateY(-40px) scale(1.35) rotate(15deg); opacity: 1; }
                                70% { transform: translateY(12px) scale(0.9) rotate(-6deg); }
                                85% { transform: translateY(-6px) scale(1.06) rotate(2deg); }
                                100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
                            }
                            @keyframes coinIdleAnim {
                                0% { transform: translateY(0) rotate(0deg); }
                                100% { transform: translateY(-8px) rotate(5deg); }
                            }
                            .coin-disc {
                                width: 76px;
                                height: 76px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 45%, #d97706 80%, #b45309 100%);
                                border: 4px solid #fef3c7;
                                box-shadow: 0 12px 28px rgba(217, 119, 6, 0.55), inset 0 3px 6px rgba(255, 255, 255, 0.7), inset 0 -4px 8px rgba(180, 83, 9, 0.7);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                position: relative;
                                overflow: hidden;
                            }
                            .coin-specular {
                                position: absolute;
                                top: -20%;
                                left: -20%;
                                width: 140%;
                                height: 50%;
                                background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%);
                                transform: rotate(-30deg);
                                border-radius: 50%;
                            }
                            .plata-sparkle {
                                position: absolute;
                                pointer-events: none;
                            }
                            .sparkle-tl {
                                top: 22px;
                                left: 30px;
                                font-size: 1.15rem;
                                animation: sparkleFlash 1.6s ease-in-out infinite alternate;
                            }
                            .sparkle-tr {
                                top: 16px;
                                right: 32px;
                                font-size: 1.25rem;
                                animation: sparkleFlash 1.4s ease-in-out 0.3s infinite alternate;
                            }
                            .sparkle-br {
                                top: 78px;
                                right: 26px;
                                font-size: 1.05rem;
                                animation: sparkleFlash 1.8s ease-in-out 0.6s infinite alternate;
                            }
                            @keyframes sparkleFlash {
                                0% { transform: scale(0.5) rotate(0deg); opacity: 0.25; }
                                100% { transform: scale(1.3) rotate(25deg); opacity: 1; }
                            }
                        `}</style>
                    </div>
                </div>
            , document.body)}
        </>
    );
}
