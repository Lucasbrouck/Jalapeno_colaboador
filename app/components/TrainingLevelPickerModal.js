'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, BookOpen, AlertCircle, ChevronRight, ChevronLeft, Layout, FolderOpen, Edit, MoveRight, Coins, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export default function TrainingLevelPickerModal({ isOpen, onClose, currentLevelId, onSave }) {
    // Mode: 'CHOICE' | 'PICKER' | 'ADVANCE_PREVIEW'
    const [mode, setMode] = useState(currentLevelId ? 'CHOICE' : 'PICKER');
    // Workflow States for PICKER: 'PROGRAM' | 'GROUP' | 'LEVEL'
    const [step, setStep] = useState('PROGRAM');

    // Data States
    const [programs, setPrograms] = useState([]);
    const [groups, setGroups] = useState([]);
    const [levels, setLevels] = useState([]);
    const [allStructure, setAllStructure] = useState({ programs: [], groups: [], levels: [] });

    // Selection/Calculation States
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedLevelId, setSelectedLevelId] = useState(currentLevelId || '');
    const [nextLevel, setNextLevel] = useState(null);
    const [currentLevelInfo, setCurrentLevelInfo] = useState(null);

    // Loading States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMode(currentLevelId ? 'CHOICE' : 'PICKER');
            setStep('PROGRAM');
            setSelectedProgram(null);
            setSelectedGroup(null);
            setSelectedLevelId(currentLevelId || '');
            fetchInitialData();
            if (currentLevelId) {
                calculateNextLevel(currentLevelId);
            }
        }
    }, [isOpen, currentLevelId]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/training/programs');
            const data = await res.json();
            setPrograms(data);
        } catch (err) {
            console.error('Failed to fetch programs:', err);
            setError('Erro ao carregar programas de treinamento');
        } finally {
            setLoading(false);
        }
    };

    const calculateNextLevel = async (levelId) => {
        setLoading(true);
        try {
            // We need a complete list of levels in order to find the next one
            const [pRes, gRes, lRes] = await Promise.all([
                fetch('/api/training/programs'),
                fetch('/api/training/groups'),
                fetch('/api/training/levels')
            ]);

            const ps = await pRes.json();
            const gs = await gRes.json();
            const ls = await lRes.json();

            // Store for reassign picker
            setAllStructure({ programs: ps, groups: gs, levels: ls });

            // Flatten structure to find sequence
            // Sort by order_index
            const sortedLevels = [];
            // Simplified: for now just sort all levels by group_id then order_index
            // In a real scenario we'd respect the full hierarchy: Program -> Group -> Level

            // Build map for quick access
            const groupMap = {};
            gs.forEach(g => groupMap[g.id] = g);

            const programMap = {};
            ps.forEach(p => programMap[p.id] = p);

            // Sort all levels
            const allLevels = [...ls].sort((a, b) => {
                const groupA = groupMap[a.group_id] || { order_index: 0, program_id: '' };
                const groupB = groupMap[b.group_id] || { order_index: 0, program_id: '' };

                // Program Order (might need to add order to programs later, for now we group)
                if (groupA.program_id !== groupB.program_id) {
                    return groupA.program_id.localeCompare(groupB.program_id);
                }

                // Group Order
                if (groupA.order_index !== groupB.order_index) {
                    return groupA.order_index - groupB.order_index;
                }

                // Level Order
                return a.order_index - b.order_index;
            });

            const currentIndex = allLevels.findIndex(l => l.id === levelId);
            if (currentIndex !== -1) {
                setCurrentLevelInfo(allLevels[currentIndex]);
                if (currentIndex < allLevels.length - 1) {
                    setNextLevel(allLevels[currentIndex + 1]);
                }
            }
        } catch (err) {
            console.error('Next level calc failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async (programId) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/training/groups?program_id=${programId}`);
            const data = await res.json();
            setGroups(data || []);
            setStep('GROUP');
        } catch (err) {
            console.error('Failed to fetch groups:', err);
            setError('Erro ao carregar grupos');
        } finally {
            setLoading(false);
        }
    };

    const fetchLevels = async (groupId) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/training/levels?group_id=${groupId}`);
            const data = await res.json();
            setLevels(data || []);
            setStep('LEVEL');
        } catch (err) {
            console.error('Failed to fetch levels:', err);
            setError('Erro ao carregar níveis');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (targetLevelId, extra = {}) => {
        if (!targetLevelId) return;
        setSaving(true);
        try {
            await onSave(targetLevelId, extra);
            onClose();
        } catch (err) {
            setError('Erro ao salvar nível');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const renderIcon = (iconName, size = 24) => {
        const IconComponent = LucideIcons[iconName] || BookOpen;
        return <IconComponent size={size} />;
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '16px',
            backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease'
        }}>
            <div style={{
                background: '#ffffff', borderRadius: '24px', width: '100%',
                maxWidth: '550px', maxHeight: '95vh', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid #e2e8f0',
                boxShadow: '0 25px 50px -12px #f1f5f9'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px', borderBottom: '1px solid #f8fafc',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                            {mode === 'CHOICE' ? 'Gerenciar Treinamento' : 'Atribuir Treinamento'}
                        </h2>
                        {mode === 'PICKER' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                {['PROGRAM', 'GROUP', 'LEVEL'].map((s, idx) => (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: step === s ? 700 : 500,
                                            color: step === s ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                                        }}>
                                            {s === 'PROGRAM' ? 'Programa' : s === 'GROUP' ? 'Grupo' : 'Nível'}
                                        </span>
                                        {idx < 2 && <ChevronRight size={12} color="rgba(255,255,255,0.2)" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} style={{
                        background: '#f8fafc', border: 'none', borderRadius: '12px',
                        width: 36, height: 36, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: '350px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                            <div className="loader" style={{ width: 40, height: 40, border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Carregando dados...</span>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            {/* Option Choice Logic */}
                            {mode === 'CHOICE' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: 8 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase' }}>Etapa Atual:</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                            <div style={{ width: 32, height: 32, background: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {renderIcon(currentLevelInfo?.icon, 18)}
                                            </div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentLevelInfo?.name || 'Nível atual'}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setMode('ADVANCE_PREVIEW')}
                                        disabled={!nextLevel}
                                        style={{
                                            padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 20,
                                            background: !nextLevel ? '#f8fafc' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                                            border: '1px solid rgba(59, 130, 246, 0.2)', cursor: !nextLevel ? 'not-allowed' : 'pointer',
                                            textAlign: 'left', transition: 'all 0.2s', opacity: !nextLevel ? 0.5 : 1
                                        }}
                                    >
                                        <div style={{ width: 48, height: 48, background: '#3b82f6', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)' }}>
                                            <CheckCircle size={28} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Avançar Próxima Etapa</div>
                                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                                {nextLevel ? `Promover para: ${nextLevel.name}` : 'Treinamento concluído!'}
                                            </div>
                                        </div>
                                        <ChevronRight size={24} color="#3b82f6" />
                                    </button>

                                    <button
                                        onClick={() => setMode('PICKER')}
                                        style={{
                                            padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 20,
                                            background: '#f8fafc', border: '1px solid #f8fafc',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ width: 48, height: 48, background: '#e2e8f0', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                                            <Edit size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Reatribuir Tudo</div>
                                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Alterar programa, categoria ou etapa (sem recompensas)</div>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Advance Progress Preview */}
                            {mode === 'ADVANCE_PREVIEW' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>Promoção de Treinamento</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
                                            <div style={{ opacity: 0.5 }}>
                                                <div style={{ width: 48, height: 48, background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                                                    {renderIcon(currentLevelInfo?.icon)}
                                                </div>
                                                <div style={{ fontSize: '0.8rem' }}>{currentLevelInfo?.name}</div>
                                            </div>
                                            <MoveRight size={32} color="#3b82f6" />
                                            <div style={{ transform: 'scale(1.2)' }}>
                                                <div style={{ width: 48, height: 48, background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: '#10b981', border: '1px solid #10b981' }}>
                                                    {renderIcon(nextLevel?.icon)}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{nextLevel?.name}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {(nextLevel?.platas > 0) && (
                                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '20px', borderRadius: '20px', border: '1px dashed #10b981' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>RECOMPENSAS ACUMULADAS:</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                                                <LucideIcons.Coins size={32} color="#fbbf24" />
                                                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>+{nextLevel.platas} Platas</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Serão creditadas no saldo do funcionário.</div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button onClick={() => setMode('CHOICE')} style={{ flex: 1, padding: '16px', background: '#f8fafc', borderRadius: '16px', border: 'none', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Voltar</button>
                                        <button
                                            onClick={() => handleSave(nextLevel.id)}
                                            style={{ flex: 2, padding: '16px', background: '#3b82f6', borderRadius: '16px', border: 'none', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                        >
                                            <LucideIcons.Zap size={20} /> {saving ? 'Processando...' : 'Confirmar Avanço'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reassign Picker (The old flow) */}
                            {mode === 'PICKER' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* ... Step logic ... */}
                                    {step === 'PROGRAM' && (
                                        <>
                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 4 }}>Selecione o Programa:</p>
                                            {programs.map(p => (
                                                <button key={p.id} onClick={() => fetchGroups(p.id)} style={{
                                                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                                                    background: '#f8fafc', border: '1px solid #f8fafc',
                                                    borderRadius: '16px', cursor: 'pointer', textAlign: 'left', width: '100%'
                                                }}>
                                                    <div style={{ width: 44, height: 44, background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                                                        <Layout size={24} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                                                    </div>
                                                    <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {step === 'GROUP' && (
                                        <>
                                            <button onClick={() => setStep('PROGRAM')} style={{ background: 'none', border: 'none', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem', marginBottom: 12 }}>
                                                <ChevronLeft size={16} /> Voltar para Programas
                                            </button>
                                            {groups.map(g => (
                                                <button key={g.id} onClick={() => fetchLevels(g.id)} style={{
                                                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                                                    background: '#f8fafc', border: '1px solid #f8fafc',
                                                    borderRadius: '16px', cursor: 'pointer', textAlign: 'left', width: '100%'
                                                }}>
                                                    <div style={{ width: 44, height: 44, background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                                        <FolderOpen size={24} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                                                    </div>
                                                    <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {step === 'LEVEL' && (
                                        <>
                                            <button onClick={() => setStep('GROUP')} style={{ background: 'none', border: 'none', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem', marginBottom: 12 }}>
                                                <ChevronLeft size={16} /> Voltar para Grupos
                                            </button>
                                            {levels.map(level => (
                                                <button key={level.id} onClick={() => setSelectedLevelId(level.id)} style={{
                                                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                                                    background: selectedLevelId === level.id ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                                                    border: selectedLevelId === level.id ? '2px solid #10b981' : '1px solid #f8fafc',
                                                    borderRadius: '16px', cursor: 'pointer', textAlign: 'left', width: '100%'
                                                }}>
                                                    <div style={{ color: selectedLevelId === level.id ? '#10b981' : 'rgba(255,255,255,0.3)', width: 44, height: 44, background: selectedLevelId === level.id ? 'rgba(16, 185, 129, 0.15)' : '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {renderIcon(level.icon, 24)}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{level.name}</div>
                                                    </div>
                                                </button>
                                            ))}
                                            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                                                <button onClick={() => currentLevelId ? setMode('CHOICE') : onClose()} style={{ flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '12px', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
                                                <button
                                                    onClick={() => handleSave(selectedLevelId, { skipRewards: true })}
                                                    disabled={!selectedLevelId}
                                                    style={{ flex: 2, padding: '12px', background: '#3b82f6', borderRadius: '12px', border: 'none', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', opacity: !selectedLevelId ? 0.5 : 1 }}
                                                >
                                                    {saving ? 'Aguarde...' : 'Confirmar Sem Recompensa'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { 
                    from { transform: translateY(30px); opacity: 0; } 
                    to { transform: translateY(0); opacity: 1; } 
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .loader { border-top-color: transparent !important; }
            `}</style>
        </div>
    );
}


