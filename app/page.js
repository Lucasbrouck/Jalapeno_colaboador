'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Wallet,
    LogOut,
    Sun,
    Moon,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Coins,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    Flame,
    Upload,
    Clock,
    GraduationCap,
    Target,
    X,
    Users,
    Eye,
    EyeOff,
    Receipt,
    ArrowUpRight,
    Sparkles,
    ShieldCheck,
    Home,
    BarChart3
} from 'lucide-react';
import QuickShiftModal from '@/app/components/QuickShiftModal';
import { formatLocalDate, getMonday } from '@/lib/dateUtils';
import { calculateWeeklyPrizeEngine, getOperationalWeekInfo } from '@/lib/prizeUtils';
import PlataWallet from '@/app/components/PlataWallet';
import UserBadge from '@/app/components/UserBadge';
import TrainingTrailsModal from '@/app/components/TrainingTrailsModal';
import PDIEvaluationModal from '@/app/components/PDIEvaluationModal';
import FloatingCheckIn from '@/app/components/FloatingCheckIn';
import CompanySwitcher from '@/app/components/CompanySwitcher';

function CollaboratorBankApp() {
    const { user: authUser, logout, loading: authLoading } = useAuth();
    const router = useRouter();

    const [allUsers, setAllUsers] = useState([]);
    const [impersonatedUserId, setImpersonatedUserId] = useState(null);
    const effectiveUserId = impersonatedUserId || authUser?.id;

    const [userData, setUserData] = useState(null);
    const [allShifts, setAllShifts] = useState([]);
    const [goalConfig, setGoalConfig] = useState(null);
    const [weeklyResults, setWeeklyResults] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [pdiEvaluations, setPdiEvaluations] = useState([]);

    // Bank UI states
    const [activeSection, setActiveSection] = useState('HOME'); // 'HOME' | 'WEEKS' | 'STATEMENT' | 'PLATA' | 'RH'
    const [hideValues, setHideValues] = useState(false);
    const [showBalanceDetails, setShowBalanceDetails] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [expandedShiftId, setExpandedShiftId] = useState(null);

    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
    const [selectedPdi, setSelectedPdi] = useState(null);
    const [selectedAbsenceForJustify, setSelectedAbsenceForJustify] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isQuickShiftOpen, setIsQuickShiftOpen] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const fmtMoney = (val) => {
        if (hideValues) return 'R$ •••••';
        return `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const safeJson = async (res, fallback = []) => {
        if (!res || !res.ok) return fallback;
        try {
            const text = await res.text();
            return text ? JSON.parse(text) : fallback;
        } catch {
            return fallback;
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!authUser?.id) {
            router.push('/login');
            return;
        }

        const companyParam = authUser.company_id ? `?companyId=${authUser.company_id}` : '';
        fetch(`/api/users${companyParam}`, { cache: 'no-store' })
            .then(r => safeJson(r, []))
            .then(users => {
                if (!Array.isArray(users)) return;
                setAllUsers(users);
                const me = users.find(u => u.id === effectiveUserId);
                if (me) {
                    setUserData(me);
                } else if (authUser.role === 'superadmin' || authUser.role === 'admin') {
                    const firstWorker = users.find(u => u.role === 'worker' || u.role === 'manager') || users[0];
                    if (firstWorker) {
                        setImpersonatedUserId(firstWorker.id);
                        setUserData(firstWorker);
                    }
                }
            });
    }, [authLoading, authUser, router, effectiveUserId]);

    useEffect(() => {
        if (!effectiveUserId || !authUser) return;
        const companyId = userData?.company_id || authUser.company_id;

        Promise.all([
            fetch(`/api/advances?userId=${effectiveUserId}`, { cache: 'no-store' }).then(r => safeJson(r, [])),
            fetch(`/api/absences?userId=${effectiveUserId}`, { cache: 'no-store' }).then(r => safeJson(r, [])),
            fetch(`/api/shifts${companyId ? `?companyId=${companyId}` : ''}`, { cache: 'no-store' }).then(r => safeJson(r, [])),
            fetch(`/api/goals?month=${selectedMonth}${companyId ? `&companyId=${companyId}` : ''}`, { cache: 'no-store' }).then(r => safeJson(r, null)),
            fetch(`/api/metrics/weekly${companyId ? `?companyId=${companyId}` : ''}`, { cache: 'no-store' }).then(r => safeJson(r, [])),
            fetch(`/api/pdi/evaluations?userId=${effectiveUserId}`, { cache: 'no-store' }).then(r => safeJson(r, []))
        ]).then(([advData, absData, shiftsData, goalsData, weeklyData, pdiData]) => {
            setAdvances(Array.isArray(advData) ? advData : []);
            setAbsences(Array.isArray(absData) ? absData : []);
            setAllShifts(Array.isArray(shiftsData) ? shiftsData : []);
            setGoalConfig(goalsData);
            setWeeklyResults(Array.isArray(weeklyData) ? weeklyData : []);
            setPdiEvaluations(Array.isArray(pdiData) ? pdiData : []);
        });
    }, [effectiveUserId, authUser, userData?.company_id, selectedMonth]);

    const changeMonth = (delta) => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const prizeSummary = useMemo(() => {
        const engine = calculateWeeklyPrizeEngine(allShifts, goalConfig, weeklyResults);
        const { weeksMap, shiftsMap, currentWeekMonday } = engine;

        const monthShifts = allShifts
            .filter(s => s.date?.startsWith(selectedMonth))
            .sort((a, b) => {
                const cmp = (b.date || '').localeCompare(a.date || '');
                if (cmp !== 0) return cmp;
                return (a.type === 'NIGHT' ? 0 : 1) - (b.type === 'NIGHT' ? 0 : 1);
            });

        let consolidatedGross = 0;
        let consolidatedMaxGross = 0;
        let pendingMaxGross = 0;
        const userShiftHistory = [];
        const weeksInMonthSet = new Set();

        monthShifts.forEach(shift => {
            const wk = getMonday(shift.date);
            weeksInMonthSet.add(wk);

            const workers = shift.workers || [];
            const myWorker = workers.find(w => w.id === effectiveUserId);
            if (!myWorker) return;

            const calc = shiftsMap[shift.id];
            if (!calc) return;

            // Regra oficial:
            // 1. Prêmio Máximo = Pote do Turno dividido pelo número de pessoas (sem multiplicador das métricas)
            const workerCount = workers.length;
            const maxPrizeValue = workerCount > 0 ? calc.maxPot / workerCount : 0;

            // 2. Consolidado Real = Pote apurado (maxPot * mRev * mCMV * mRating * mOps) dividido por quem foi
            //    (1.0 se chegou no horário, 0.5 se chegou atrasado)
            let totalShares = 0;
            workers.forEach(w => {
                totalShares += (w.status === 'LATE' ? 0.5 : 1.0);
            });

            const myMult = myWorker.status === 'LATE' ? 0.5 : 1.0;
            const consolidatedValue = totalShares > 0 ? (calc.actualPot / totalShares) * myMult : 0;

            if (calc.isPendingApuracao) {
                pendingMaxGross += maxPrizeValue;
            } else {
                consolidatedGross += consolidatedValue;
                consolidatedMaxGross += maxPrizeValue;
            }

            userShiftHistory.push({
                ...shift,
                myWorker,
                myMult,
                workerCount,
                totalShares,
                calc,
                consolidatedValue,
                maxPrizeValue,
                displayValue: calc.isPendingApuracao ? maxPrizeValue : consolidatedValue
            });
        });

        const weeksList = Array.from(weeksInMonthSet)
            .sort((a, b) => b.localeCompare(a))
            .map(wkMon => {
                const wkInfo = weeksMap[wkMon] || getOperationalWeekInfo(wkMon);
                const myWeekShifts = userShiftHistory.filter(s => s.calc.weekMonday === wkMon);
                const myWeekConsolidated = myWeekShifts.reduce((acc, s) => acc + s.consolidatedValue, 0);
                const myWeekMaxPrize = myWeekShifts.reduce((acc, s) => acc + s.maxPrizeValue, 0);
                return {
                    ...wkInfo,
                    myShiftsCount: myWeekShifts.length,
                    myWeekConsolidated,
                    myWeekMaxPrize
                };
            });

        const monthAbsences = absences.filter(a => a.date?.startsWith(selectedMonth));
        const monthAdvances = advances.filter(a => a.date?.startsWith(selectedMonth));
        const totalAdvances = monthAdvances.reduce((acc, a) => acc + (parseFloat(a.value) || 0), 0);

        return {
            currentWeekMonday,
            consolidatedGross,
            consolidatedMaxGross,
            pendingMaxGross,
            totalAdvances,
            monthAbsences,
            monthAdvances,
            userShiftHistory,
            weeksList
        };
    }, [allShifts, goalConfig, weeklyResults, selectedMonth, effectiveUserId, absences, advances]);

    const handleJustifySubmit = async (absenceId, file) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/absences/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Falha no upload');
            const { url } = await uploadRes.json();

            const updateRes = await fetch('/api/absences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: absenceId,
                    certificate_url: url,
                    justification_status: 'PENDING'
                })
            });

            if (!updateRes.ok) throw new Error('Erro ao salvar justificativa');

            showToast('Atestado enviado para análise do RH!');
            setSelectedAbsenceForJustify(null);

            const refreshed = await fetch(`/api/absences?userId=${effectiveUserId}`).then(r => r.json());
            setAbsences(Array.isArray(refreshed) ? refreshed : []);
        } catch (error) {
            console.error(error);
            showToast('Erro ao enviar justificativa', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const renderMultiplierPill = (mult, isPending, label) => {
        if (isPending) {
            return (
                <div style={{
                    background: '#fff7ed',
                    border: '1px solid #ffedd5',
                    borderRadius: 12,
                    padding: '8px 6px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.66rem', color: '#9a3412', fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: 800, marginTop: 2 }}>Apura Seg.</div>
                </div>
            );
        }
        const cfg = mult === 1.0
            ? { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857', text: '100% ★' }
            : mult === 0.8
                ? { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', text: '80% ✓' }
                : { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', text: '0% ✕' };

        return (
            <div style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 12,
                padding: '8px 6px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '0.66rem', color: '#475569', fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: '0.76rem', color: cfg.color, fontWeight: 800, marginTop: 2 }}>{cfg.text}</div>
            </div>
        );
    };

    const isAdminOrManager = authUser?.role === 'admin' || authUser?.role === 'superadmin' || authUser?.role === 'manager';
    const pendingPdis = pdiEvaluations.filter(e => e.status === 'PENDING_SELF');
    const firstName = (userData?.name || authUser?.name || 'Colaborador').split(' ')[0];

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f4f6f9',
            paddingBottom: 96
        }}>
            {/* Mobile-First Bank Container */}
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                minHeight: '100vh',
                background: '#f4f6f9',
                position: 'relative',
                boxShadow: '0 0 40px rgba(15, 23, 42, 0.06)'
            }}>
                {/* Admin Preview Top Strip */}
                {isAdminOrManager && allUsers.length > 0 && (
                    <div style={{
                        background: '#18181b',
                        color: 'white',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: '0.74rem'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#fb923c' }}>
                            <Users size={14} /> Simular Conta:
                        </span>
                        <select
                            value={effectiveUserId || ''}
                            onChange={e => {
                                const uid = e.target.value;
                                setImpersonatedUserId(uid);
                                const found = allUsers.find(u => u.id === uid);
                                if (found) setUserData(found);
                            }}
                            style={{
                                background: '#27272a',
                                color: 'white',
                                border: '1px solid #3f3f46',
                                borderRadius: 8,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                flex: 1,
                                maxWidth: 240
                            }}
                        >
                            {allUsers
                                .filter(u => u.role === 'worker' || u.role === 'manager')
                                .map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}

                {/* BANCO INTER INSPIRED HERO HEADER */}
                <header style={{
                    background: 'linear-gradient(135deg, #ff6b00 0%, #ea580c 45%, #da291c 100%)',
                    color: 'white',
                    padding: '22px 20px 68px',
                    borderBottomLeftRadius: 28,
                    borderBottomRightRadius: 28,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Subtle decorative circles */}
                    <div style={{
                        position: 'absolute',
                        top: -40,
                        right: -30,
                        width: 160,
                        height: 160,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                                onClick={() => setActiveSection('CAREER')}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.22)',
                                    border: '2px solid rgba(255,255,255,0.6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(6px)'
                                }}
                            >
                                {firstName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 600 }}>
                                    Jalapeño Bank · Conta Prêmio
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        Olá, {firstName}
                                    </span>
                                    {userData?.training_level_id && (
                                        <UserBadge levelId={userData.training_level_id} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setHideValues(prev => !prev)}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.16)',
                                    border: 'none',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
                            >
                                {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button
                                type="button"
                                onClick={logout}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.16)',
                                    border: 'none',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                title="Sair da conta"
                            >
                                <LogOut size={17} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* FLOATING ACCOUNT CARD (OVERLAPPING HEADER) */}
                <div style={{ padding: '0 16px', marginTop: -46, position: 'relative', zIndex: 10 }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 22,
                        padding: '20px',
                        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
                        border: '1px solid #f1f5f9'
                    }}>
                        {/* Top row: Month Selector Pill + Ver Extrato */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 999,
                                padding: '4px 10px'
                            }}>
                                <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: '#475569' }}>
                                    <ChevronLeft size={15} />
                                </button>
                                <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                                    {(() => {
                                        const [y, m] = selectedMonth.split('-').map(Number);
                                        return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
                                    })()}
                                </span>
                                <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: '#475569' }}>
                                    <ChevronRight size={15} />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveSection('STATEMENT')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ea580c',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}
                            >
                                Ver extrato <ChevronRight size={15} />
                            </button>
                        </div>

                        {/* Side-by-Side: Prêmio Consolidado vs Prêmio Máximo */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.1fr 1fr',
                            gap: 12,
                            alignItems: 'center',
                            marginBottom: 14
                        }}>
                            <div>
                                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                    <Wallet size={14} color="#15803d" /> Prêmio Consolidado
                                </div>
                                <div style={{
                                    fontSize: '1.95rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    letterSpacing: '-0.03em',
                                    lineHeight: 1.1
                                }}>
                                    {fmtMoney(prizeSummary.consolidatedGross)}
                                </div>
                            </div>

                            <div style={{
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: 16,
                                padding: '10px 14px',
                                textAlign: 'right'
                            }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 2 }}>
                                    Prêmio Máximo
                                </div>
                                <div style={{
                                    fontSize: '1.35rem',
                                    fontWeight: 800,
                                    color: '#ea580c',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1.15
                                }}>
                                    {fmtMoney(prizeSummary.consolidatedMaxGross)}
                                </div>
                            </div>
                        </div>

                        {/* Lançamentos em Apuração (Semana Atual - Fecha na Segunda) */}
                        <div
                            onClick={() => setActiveSection('WEEKS')}
                            style={{
                                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                                border: '1px solid #fed7aa',
                                borderRadius: 14,
                                padding: '11px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 10,
                                    background: '#ea580c',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#9a3412' }}>
                                        Semana em Apuração
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#c2410c', fontWeight: 600 }}>
                                        Fecha na segunda-feira
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ea580c' }}>
                                    + {fmtMoney(prizeSummary.pendingMaxGross)}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#9a3412', fontWeight: 800 }}>
                                    Prêmio Máximo
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUPER APP QUICK ACTION SQUIRCLES (BANCO INTER STYLE) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 8,
                    padding: '16px 16px 8px'
                }}>
                    {[
                        { id: 'WEEKS', label: 'Semanas', icon: Target },
                        { id: 'STATEMENT', label: 'Extrato', icon: Receipt },
                        { id: 'PLATA', label: 'Platas', icon: Coins },
                        { id: 'RH', label: 'Atestados', icon: ClipboardList },
                        { id: 'CAREER', label: 'Carreira', icon: GraduationCap, onClick: () => setActiveSection('CAREER') }
                    ].map(action => {
                        const Icon = action.icon;
                        const isActive = activeSection === action.id;
                        return (
                            <button
                                key={action.id}
                                type="button"
                                onClick={action.onClick || (() => setActiveSection(action.id))}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 18,
                                    background: isActive ? '#ea580c' : '#ffffff',
                                    color: isActive ? '#ffffff' : '#ea580c',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isActive
                                        ? '0 8px 18px rgba(234, 88, 12, 0.28)'
                                        : '0 4px 12px rgba(15, 23, 42, 0.05)',
                                    border: isActive ? 'none' : '1px solid #f1f5f9',
                                    transition: 'all 0.15s ease'
                                }}>
                                    <Icon size={22} />
                                </div>
                                <span style={{
                                    fontSize: '0.71rem',
                                    fontWeight: isActive ? 800 : 700,
                                    color: isActive ? '#ea580c' : '#334155'
                                }}>
                                    {action.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Pending PDI Banner */}
                {pendingPdis.length > 0 && (
                    <div style={{ padding: '8px 16px 0' }}>
                        <div
                            onClick={() => setSelectedPdi(pendingPdis[0])}
                            style={{
                                background: '#ffffff',
                                border: '1px solid #fed7aa',
                                borderLeft: '4px solid #ea580c',
                                borderRadius: 16,
                                padding: '12px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Sparkles size={19} color="#ea580c" />
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                                        Autoavaliação de PDI Disponível
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                        Toque para responder e evoluir na sua trilha
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} color="#ea580c" />
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT AREA */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {activeSection === 'PLATA' ? (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: 22,
                            padding: '18px',
                            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                            border: '1px solid #f1f5f9'
                        }}>
                            <PlataWallet userId={effectiveUserId} />
                        </div>
                    ) : activeSection === 'RH' ? (
                        <>
                            {/* Absences & Medical Certificates */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: 22,
                                padding: '18px',
                                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                                border: '1px solid #f1f5f9'
                            }}>
                                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                                    Faltas & Envio de Atestados
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 14px' }}>
                                    Faltas sem abono reduzem 10% do prêmio consolidado do mês.
                                </p>

                                {prizeSummary.monthAbsences.length === 0 ? (
                                    <div style={{
                                        background: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        color: '#15803d',
                                        padding: '14px',
                                        borderRadius: 14,
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        <CheckCircle2 size={18} /> Assiduidade 100%! Nenhuma falta neste mês.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {prizeSummary.monthAbsences.map(abs => (
                                            <div
                                                key={abs.id}
                                                style={{
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: 14,
                                                    padding: '12px 14px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: 10
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a' }}>
                                                        {formatLocalDate(abs.date)}
                                                    </div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                                        {abs.description || 'Ausência registrada'}
                                                    </div>
                                                    <div style={{ marginTop: 4 }}>
                                                        {abs.excused ? (
                                                            <span className="rh-badge badge-success">Abonada</span>
                                                        ) : abs.justification_status === 'PENDING' ? (
                                                            <span className="rh-badge badge-warning">Em análise pelo RH</span>
                                                        ) : (
                                                            <span className="rh-badge badge-danger">Sem abono (-10%)</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {!abs.excused && abs.justification_status !== 'PENDING' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedAbsenceForJustify(abs)}
                                                        style={{
                                                            background: '#ea580c',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 10,
                                                            padding: '8px 12px',
                                                            fontSize: '0.74rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6
                                                        }}
                                                    >
                                                        <Upload size={14} /> Atestado
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Advances / Vales */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: 22,
                                padding: '18px',
                                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                                border: '1px solid #f1f5f9'
                            }}>
                                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                                    Vales & Adiantamentos
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 14px' }}>
                                    Histórico de descontos lançados neste mês
                                </p>

                                {prizeSummary.monthAdvances.length === 0 ? (
                                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '8px 0' }}>
                                        Nenhum vale registrado neste mês.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {prizeSummary.monthAdvances.map(adv => (
                                            <div
                                                key={adv.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '12px 14px',
                                                    background: '#f8fafc',
                                                    borderRadius: 14,
                                                    border: '1px solid #e2e8f0'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>
                                                        {adv.description || 'Adiantamento / Vale'}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                        {formatLocalDate(adv.date)}
                                                    </div>
                                                </div>
                                                <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.88rem' }}>
                                                    - {fmtMoney(adv.value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* SECTION: CARREIRA (TRILHA DE APRENDIZADO) */}
                            {activeSection === 'CAREER' && userData && (
                                <div style={{ background: '#ffffff', borderRadius: 22, padding: '40px 20px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                        <GraduationCap size={30} />
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Em breve</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>O módulo de Carreira está em desenvolvimento.</div>
                                </div>
                            )}

                            {/* SECTION: SEMANAS OPERACIONAIS (TERÇA A DOMINGO) */}
                            {(activeSection === 'HOME' || activeSection === 'WEEKS') && (
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: 22,
                                    padding: '18px',
                                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                        <div>
                                            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                                Ciclos Semanais (Terça a Domingo)
                                            </h2>
                                            <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '2px 0 0' }}>
                                                Apuração toda segunda-feira referente à semana anterior
                                            </p>
                                        </div>
                                    </div>

                                    {prizeSummary.weeksList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: '0.84rem' }}>
                                            Nenhuma semana registrada neste mês.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {(activeSection === 'HOME' ? prizeSummary.weeksList.slice(0, 2) : prizeSummary.weeksList).map(wk => {
                                                const revGoal = Number(goalConfig?.REVENUE?.goal || 0);
                                                const revSuper = Number(goalConfig?.REVENUE?.superGoal || 0);
                                                const pct = revGoal > 0 ? Math.min(100, Math.round((wk.weekRevenue / revGoal) * 100)) : 0;

                                                return (
                                                    <div
                                                        key={wk.weekMonday}
                                                        style={{
                                                            background: wk.isPendingApuracao ? '#fffaf5' : '#f8fafc',
                                                            border: `1px solid ${wk.isPendingApuracao ? '#fed7aa' : '#e2e8f0'}`,
                                                            borderRadius: 16,
                                                            padding: '14px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                                                                        {wk.operationalLabel}
                                                                    </span>
                                                                    {wk.isPendingApuracao ? (
                                                                        <span style={{
                                                                            background: '#ffedd5',
                                                                            color: '#c2410c',
                                                                            fontSize: '0.66rem',
                                                                            fontWeight: 800,
                                                                            padding: '3px 8px',
                                                                            borderRadius: 999
                                                                        }}>
                                                                            Em Apuração · {wk.apuracaoLabel}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{
                                                                            background: '#dcfce7',
                                                                            color: '#15803d',
                                                                            fontSize: '0.66rem',
                                                                            fontWeight: 800,
                                                                            padding: '3px 8px',
                                                                            borderRadius: 999
                                                                        }}>
                                                                            Consolidada
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                                                                    {wk.myShiftsCount} turno(s) trabalhados na semana
                                                                </div>
                                                            </div>

                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{
                                                                    fontWeight: 800,
                                                                    fontSize: '1.05rem',
                                                                    color: wk.isPendingApuracao ? '#ea580c' : '#15803d'
                                                                }}>
                                                                    {fmtMoney(wk.isPendingApuracao ? wk.myWeekMaxPrize : wk.myWeekConsolidated)}
                                                                </div>
                                                                {wk.isPendingApuracao ? (
                                                                    <div style={{ fontSize: '0.68rem', color: '#c2410c', fontWeight: 800 }}>
                                                                        Prêmio Máximo
                                                                    </div>
                                                                ) : (
                                                                    <div style={{
                                                                        display: 'inline-block',
                                                                        marginTop: 3,
                                                                        background: '#fff7ed',
                                                                        border: '1px solid #fed7aa',
                                                                        color: '#ea580c',
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 800,
                                                                        padding: '2px 8px',
                                                                        borderRadius: 999
                                                                    }}>
                                                                        Máx: {fmtMoney(wk.myWeekMaxPrize)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Weekly Revenue Progress Bar */}
                                                        <div style={{
                                                            background: '#ffffff',
                                                            padding: '10px 12px',
                                                            borderRadius: 12,
                                                            border: '1px solid #f1f5f9',
                                                            marginBottom: 10
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: 5 }}>
                                                                <span style={{ color: '#475569', fontWeight: 600 }}>
                                                                    Faturamento: <strong style={{ color: '#0f172a' }}>{fmtMoney(wk.weekRevenue)}</strong>
                                                                </span>
                                                                <span style={{ fontWeight: 800, color: pct >= 100 ? '#15803d' : '#ea580c' }}>
                                                                    {pct}% da Meta
                                                                </span>
                                                            </div>
                                                            <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                                                                <div style={{
                                                                    width: `${pct}%`,
                                                                    height: '100%',
                                                                    background: wk.weekRevenue >= revSuper && revSuper > 0
                                                                        ? '#eab308'
                                                                        : pct >= 100
                                                                            ? '#10b981'
                                                                            : 'linear-gradient(90deg, #ff6b00, #ea580c)',
                                                                    borderRadius: 999
                                                                }} />
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600 }}>
                                                                <span>Meta Semanal: {fmtMoney(revGoal)}</span>
                                                                {revSuper > 0 && <span>Supermeta: {fmtMoney(revSuper)}</span>}
                                                            </div>
                                                        </div>

                                                        {/* 4 Multipliers */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                                            {renderMultiplierPill(wk.mRev, wk.isPendingApuracao, 'Fat. Sem.')}
                                                            {renderMultiplierPill(wk.mCMV, wk.isPendingApuracao, wk.isPendingApuracao ? 'CMV' : `CMV ${wk.cmv ? `${wk.cmv}%` : ''}`)}
                                                            {renderMultiplierPill(wk.mRating, wk.isPendingApuracao, wk.isPendingApuracao ? 'Avaliação' : `Aval. ${wk.rating || ''}`)}
                                                            {renderMultiplierPill(wk.mOps, wk.isPendingApuracao, wk.isPendingApuracao ? 'Operacional' : `Oper. ${wk.ops || ''}`)}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {activeSection === 'HOME' && prizeSummary.weeksList.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveSection('WEEKS')}
                                                    style={{
                                                        background: '#fff7ed',
                                                        color: '#ea580c',
                                                        border: '1px solid #ffedd5',
                                                        borderRadius: 12,
                                                        padding: '10px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 800,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Ver todas as {prizeSummary.weeksList.length} semanas do mês
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SECTION: EXTRATO BANCÁRIO DE TURNOS */}
                            {(activeSection === 'HOME' || activeSection === 'STATEMENT') && (
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: 22,
                                    padding: '18px',
                                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                        <div>
                                            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                                Extrato de Turnos
                                            </h2>
                                            <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '2px 0 0' }}>
                                                Toque em um lançamento para abrir o comprovante de cálculo
                                            </p>
                                        </div>
                                    </div>

                                    {prizeSummary.userShiftHistory.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 28, color: '#94a3b8', fontSize: '0.84rem' }}>
                                            Nenhum lançamento de turno neste mês.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {prizeSummary.userShiftHistory.map((shift, idx) => {
                                                const isExpanded = expandedShiftId === shift.id;
                                                const isPending = shift.calc.isPendingApuracao;
                                                const wkInfo = shift.calc.weekInfo;

                                                return (
                                                    <div
                                                        key={shift.id}
                                                        onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                                                        style={{
                                                            padding: '13px 4px',
                                                            borderBottom: idx === prizeSummary.userShiftHistory.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <div style={{
                                                                    width: 42,
                                                                    height: 42,
                                                                    borderRadius: 14,
                                                                    background: shift.type === 'DAY' ? '#fff7ed' : '#eef2ff',
                                                                    color: shift.type === 'DAY' ? '#ea580c' : '#4f46e5',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}>
                                                                    {shift.type === 'DAY' ? <Sun size={20} /> : <Moon size={20} />}
                                                                </div>
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                                                                            Rateio Turno {shift.type === 'DAY' ? 'Dia' : 'Noite'}
                                                                        </span>
                                                                        {shift.myWorker?.isDouble && (
                                                                            <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.64rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>
                                                                                Dobra 2x
                                                                            </span>
                                                                        )}
                                                                        {(shift.myWorker?.status === 'LATE' || shift.myWorker?.discounted_hours > 0) && (
                                                                            <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.64rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>
                                                                                Atraso
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 2 }}>
                                                                        {formatLocalDate(shift.date)} · Semana {wkInfo?.shortRangeLabel}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                <div style={{
                                                                    fontWeight: 800,
                                                                    fontSize: '0.94rem',
                                                                    color: isPending ? '#ea580c' : (shift.displayValue > 0 ? '#15803d' : '#94a3b8')
                                                                }}>
                                                                    + {fmtMoney(shift.displayValue)}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 700,
                                                                    color: isPending ? '#c2410c' : '#64748b'
                                                                }}>
                                                                    {isPending
                                                                        ? `Prêmio Máximo · Apura ${wkInfo?.apuracaoLabel}`
                                                                        : `Consolidado (Máx: ${fmtMoney(shift.maxPrizeValue)})`}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <div style={{
                                                                marginTop: 12,
                                                                padding: '12px',
                                                                background: '#f8fafc',
                                                                borderRadius: 14,
                                                                border: '1px solid #e2e8f0',
                                                                fontSize: '0.75rem',
                                                                color: '#475569'
                                                            }}>
                                                                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8, fontSize: '0.76rem' }}>
                                                                    Comprovante de Rateio do Turno
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <span>Faturamento do Turno:</span>
                                                                    <strong>{fmtMoney(shift.revenue)}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <span>Pote do Turno ({shift.type === 'DAY' ? '1,5%' : '0,8%'}):</span>
                                                                    <strong>{fmtMoney(shift.calc.maxPot)}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <span>Prêmio Máximo ({shift.workerCount} pessoa{shift.workerCount !== 1 ? 's' : ''} no turno):</span>
                                                                    <strong>{fmtMoney(shift.maxPrizeValue)}</strong>
                                                                </div>
                                                                {!isPending && (
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                        <span>Seu Consolidado Real:</span>
                                                                        <strong style={{ color: '#15803d' }}>{fmtMoney(shift.consolidatedValue)}</strong>
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                                                    <span>Seu Multiplicador de Pontualidade:</span>
                                                                    <strong>{shift.myMult === 0.5 ? '0,5 (Chegou atrasado)' : '1,0 (No horário)'} · Total cotas: {shift.totalShares}</strong>
                                                                </div>

                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                                                    {renderMultiplierPill(shift.calc.mRev, isPending, 'Fat. Sem.')}
                                                                    {renderMultiplierPill(shift.calc.mCMV, isPending, 'CMV')}
                                                                    {renderMultiplierPill(shift.calc.mRating, isPending, 'Aval.')}
                                                                    {renderMultiplierPill(shift.calc.mOps, isPending, 'Oper.')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* FIXED BOTTOM SUPER-APP NAVIGATION BAR */}
                <nav style={{
                    position: 'fixed',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100%',
                    maxWidth: 480,
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(12px)',
                    borderTop: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    padding: '8px 10px 12px',
                    zIndex: 90,
                    boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.05)'
                }}>
                    {[
                        { id: 'WEEKS', label: 'Semanas', icon: BarChart3 },
                        { id: 'STATEMENT', label: 'Extrato', icon: Receipt },
                        { id: 'CHECKIN' },
                        { id: 'PLATA', label: 'Platas', icon: Coins },
                        { id: 'CAREER', label: 'Carreira', icon: GraduationCap }
                    ].map(item => {
                        if (item.id === 'CHECKIN') {
                            return <FloatingCheckIn key="checkin" variant="nav" user={userData || authUser} />;
                        }
                        const Icon = item.icon;
                        const active = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveSection(item.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 3,
                                    color: active ? '#ea580c' : '#94a3b8',
                                    fontWeight: active ? 800 : 600,
                                    fontSize: '0.68rem',
                                    cursor: 'pointer',
                                    padding: '4px 0'
                                }}
                            >
                                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Modals */}
            {userData && (
                <TrainingTrailsModal
                    isOpen={isTrainingModalOpen}
                    onClose={() => setIsTrainingModalOpen(false)}
                    userId={userData.id}
                />
            )}

            {selectedPdi && (
                <PDIEvaluationModal
                    evaluation={selectedPdi}
                    userId={effectiveUserId}
                    onClose={() => setSelectedPdi(null)}
                    onSave={() => {
                        fetch(`/api/pdi/evaluations?userId=${effectiveUserId}`)
                            .then(r => r.json())
                            .then(data => setPdiEvaluations(Array.isArray(data) ? data : []));
                    }}
                />
            )}

            {isQuickShiftOpen && (
                <QuickShiftModal
                    onClose={() => setIsQuickShiftOpen(false)}
                    onSuccess={() => {
                        showToast('Turno lançado com sucesso!');
                        window.location.reload();
                    }}
                />
            )}

            {selectedAbsenceForJustify && (
                <div className="rh-modal-overlay" onClick={() => setSelectedAbsenceForJustify(null)}>
                    <div className="rh-modal" style={{ maxWidth: 400, borderRadius: 22 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h3 className="h3" style={{ margin: 0 }}>Enviar Atestado Médico</h3>
                            <button onClick={() => setSelectedAbsenceForJustify(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs" style={{ marginBottom: 16 }}>
                            Selecione uma foto ou PDF do seu atestado referente ao dia <strong>{formatLocalDate(selectedAbsenceForJustify.date)}</strong>.
                        </p>
                        <input
                            type="file"
                            id="cert-upload"
                            accept="image/*,application/pdf"
                            style={{ display: 'none' }}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleJustifySubmit(selectedAbsenceForJustify.id, file);
                            }}
                        />
                        <label
                            htmlFor="cert-upload"
                            className="btn btn-primary"
                            style={{ width: '100%', cursor: 'pointer', background: '#ea580c', borderColor: '#ea580c', borderRadius: 12 }}
                        >
                            <Upload size={16} /> {isUploading ? 'Enviando...' : 'Escolher Arquivo'}
                        </label>
                    </div>
                </div>
            )}

            {/* Check-in de ponto agora e o botao central do menu inferior */}

            {/* Toast */}
            {toast.visible && (
                <div style={{
                    position: 'fixed',
                    bottom: 84,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: toast.type === 'error' ? '#dc2626' : '#10b981',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}

export default function CollaboratorAppPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Abrindo Jalapeño Bank...</div>}>
            <CollaboratorBankApp />
        </Suspense>
    );
}
