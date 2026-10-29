'use client';

import { useState, useEffect } from 'react';
import { X, Lock, CheckCircle, ChevronDown, ChevronRight, Award, Target, BookOpen, Layers, Coins } from 'lucide-react';
import * as Icons from 'lucide-react';

export default function TrainingTrailsModal({ isOpen, onClose, userId, embedded = false }) {
    const [user, setUser] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [groups, setGroups] = useState([]);
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [expandedGroups, setExpandedGroups] = useState({});
    const [expandedLevels, setExpandedLevels] = useState({});

    useEffect(() => {
        if (isOpen && userId) {
            fetchData();
        }
    }, [isOpen, userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, pRes, gRes, lRes] = await Promise.all([
                fetch(`/api/users?id=${userId}`),
                fetch('/api/training/programs'),
                fetch('/api/training/groups'),
                fetch('/api/training/levels')
            ]);

            const userData = await uRes.json();
            const currentUser = Array.isArray(userData) ? userData[0] : userData;
            const allPrograms = await pRes.json();
            const allGroups = await gRes.json();
            const allLevels = await lRes.json();

            setUser(currentUser);
            setPrograms(Array.isArray(allPrograms) ? allPrograms : []);
            setGroups(Array.isArray(allGroups) ? allGroups : []);
            setLevels(Array.isArray(allLevels) ? allLevels : []);

            // Auto-expand the group and level that is current
            if (currentUser?.training_level_id) {
                const currentLevel = allLevels.find(l => l.id === currentUser.training_level_id);
                if (currentLevel) {
                    setExpandedGroups({ [currentLevel.group_id]: true });
                    setExpandedLevels({ [currentLevel.id]: true });
                }
            }
        } catch (error) {
            console.error('Error fetching training data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const toggleLevel = (levelId) => {
        setExpandedLevels(prev => ({ ...prev, [levelId]: !prev[levelId] }));
    };

    if (!isOpen) return null;

    // Filter data for the user's assigned program
    // If user has no program assigned, we might show "No program assigned"
    const userProgram = programs.find(p => p.name === user?.trainingProgramName);
    const programGroups = userProgram
        ? groups.filter(g => g.program_id === userProgram.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        : [];

    return (
        <div style={{
            ...(embedded ? { width: '100%' } : {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px',
            backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease'
        }) }}>
            <div style={{
                background: '#ffffff', borderRadius: '28px', width: '100%',
                maxWidth: embedded ? '100%' : '600px', maxHeight: embedded ? 'none' : '85vh', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                border: '1px solid #e2e8f0',
                boxShadow: embedded ? '0 4px 16px rgba(15, 23, 42, 0.06)' : '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 30px', borderBottom: '1px solid #f8fafc',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 50, height: 50, borderRadius: '15px',
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(124, 58, 237, 0.3)'
                        }}>
                            <Award size={28} color="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                {user?.trainingProgramName || 'Minha Jornada'}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                {user?.trainingGroupName ? `Grupo: ${user.trainingGroupName}` : 'Acompanhe sua evolução profissional'}
                            </p>
                        </div>
                    </div>
                    {!embedded && <button onClick={onClose} style={{
                        background: '#f8fafc', border: 'none', borderRadius: '14px',
                        width: 40, height: 40, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                    }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                        <X size={20} />
                    </button>}
                </div>

                {/* Content */}
                <div style={{ padding: '30px', overflowY: 'auto', flex: 1, position: 'relative' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                            <div style={{ width: 40, height: 40, border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 500 }}>Carregando sua jornada...</span>
                        </div>
                    ) : !userProgram ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                            <Target size={48} style={{ marginBottom: 16, opacity: 0.2, margin: '0 auto' }} />
                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhum programa atribuído.</p>
                            <p style={{ fontSize: '0.9rem' }}>Fale com seu gestor para iniciar sua trilha de treinamento.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                            {/* Improved Vertical Journey Line */}
                            <div style={{
                                position: 'absolute', left: 23, top: 40, bottom: 40,
                                width: 3, background: 'rgba(124, 58, 237, 0.4)',
                                borderRadius: 4, zIndex: 0
                            }}></div>

                            {/* Hierarchy View */}
                            {programGroups.map((group, gIdx) => {
                                const groupLevels = levels.filter(l => l.group_id === group.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                                const isGroupExpanded = expandedGroups[group.id];

                                return (
                                    <div key={group.id} style={{ position: 'relative', zIndex: 1 }}>
                                        {/* Group Milestone Header */}
                                        <div
                                            onClick={() => toggleGroup(group.id)}
                                            style={{
                                                padding: '12px 0px', cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'space-between',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{
                                                    width: 48, height: 48, borderRadius: '15px',
                                                    background: isGroupExpanded ? '#7c3aed' : '#f8fafc',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: isGroupExpanded ? 'white' : 'rgba(255,255,255,0.4)',
                                                    border: isGroupExpanded ? 'none' : '2px solid #e2e8f0',
                                                    boxShadow: isGroupExpanded ? '0 0 20px rgba(124, 58, 237, 0.4)' : 'none',
                                                    zIndex: 2, transition: 'all 0.3s ease'
                                                }}>
                                                    <Layers size={22} />
                                                </div>
                                                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: isGroupExpanded ? 'white' : 'rgba(255,255,255,0.5)' }}>
                                                    {group.name}
                                                </span>
                                                {group.platas > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(251, 191, 36, 0.1)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                                        <Coins size={12} color="#fbbf24" />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>+{group.platas}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ transform: isGroupExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'rgba(255,255,255,0.3)' }}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </div>

                                        {/* Levels List within Group (Indented and open) */}
                                        {isGroupExpanded && (
                                            <div style={{ padding: '8px 0 24px 60px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {groupLevels.map((level, lIdx) => {
                                                    const isCurrent = level.id === user?.training_level_id;
                                                    const isExpanded = expandedLevels[level.id] || isCurrent;
                                                    const iconName = level.icon || 'Circle';
                                                    const IconComp = Icons[iconName] || BookOpen;

                                                    return (
                                                        <div key={level.id} style={{
                                                            borderRadius: '18px', border: isCurrent ? '1.5px solid #fbbf24' : '1px solid #f8fafc',
                                                            background: isCurrent ? 'rgba(251, 191, 36, 0.08)' : (isExpanded ? '#f8fafc' : 'transparent'),
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: isCurrent ? '0 8px 32px -8px rgba(251, 191, 36, 0.15)' : 'none',
                                                            position: 'relative'
                                                        }}>
                                                            {/* Dot on the Journey Line */}
                                                            <div style={{
                                                                position: 'absolute', left: -41.5, top: '50%', transform: 'translateY(-50%)',
                                                                width: 12, height: 12, borderRadius: '50%',
                                                                background: isCurrent ? '#fbbf24' : 'rgba(124, 58, 237, 0.8)',
                                                                border: '3px solid #1a1a1a', zIndex: 10,
                                                                boxShadow: isCurrent ? '0 0 10px #fbbf24' : 'none'
                                                            }}></div>

                                                            <div
                                                                onClick={() => toggleLevel(level.id)}
                                                                style={{
                                                                    padding: '16px 20px', cursor: 'pointer', display: 'flex',
                                                                    alignItems: 'center', gap: 14, position: 'relative'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: 36, height: 36, borderRadius: '10px',
                                                                    background: isCurrent ? '#fbbf24' : '#f8fafc',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: isCurrent ? '#000' : 'rgba(255,255,255,0.3)'
                                                                }}>
                                                                    <IconComp size={18} />
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isCurrent ? 'white' : 'rgba(255,255,255,0.6)' }}>
                                                                        {level.name}
                                                                    </span>
                                                                </div>
                                                                {level.platas > 0 && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(251, 191, 36, 0.1)', padding: '4px 10px', borderRadius: '10px', marginRight: isCurrent ? 0 : 8, border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                                                        <Coins size={14} color="#fbbf24" />
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24' }}>+{level.platas}</span>
                                                                    </div>
                                                                )}
                                                                {isCurrent && (
                                                                    <span style={{
                                                                        fontSize: '0.55rem', padding: '3px 8px', borderRadius: '6px',
                                                                        background: '#fbbf24', color: 'black', fontWeight: 900,
                                                                        textTransform: 'uppercase', letterSpacing: '0.05em'
                                                                    }}>
                                                                        Seu Level
                                                                    </span>
                                                                )}
                                                                {!isCurrent && isExpanded && <ChevronDown size={14} color="rgba(255,255,255,0.2)" />}
                                                                {!isCurrent && !isExpanded && <ChevronRight size={14} color="#e2e8f0" />}
                                                            </div>

                                                            {isExpanded && (
                                                                <div style={{ padding: '0 20px 20px 70px', animation: 'fadeIn 0.3s ease' }}>
                                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                                                                        {level.description || 'Nenhuma descrição detalhada disponível.'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div style={{ padding: '20px 30px', background: '#f1f5f9', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: '#fbbf24', display: 'flex' }}><Icons.Info size={16} /></div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                        Dica: Conclua os desafios de cada etapa para avançar e ganhar mais Platas!
                    </p>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { 
                    from { transform: translateY(40px); opacity: 0; } 
                    to { transform: translateY(0); opacity: 1; } 
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div >
    );
}

