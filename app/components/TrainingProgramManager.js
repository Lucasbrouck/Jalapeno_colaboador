'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Edit, Trash2, ChevronRight, ChevronDown,
    MoreVertical, Folder, Layers, BookOpen, Save, X,
    Layout, Star, Terminal, AlertCircle, CheckCircle2,
    MoveRight, ListTodo, Search
} from 'lucide-react';

export default function TrainingProgramManager() {
    const [programs, setPrograms] = useState([]);
    const [groups, setGroups] = useState({}); // Map: programId -> groups[]
    const [levels, setLevels] = useState({}); // Map: groupId -> levels[]
    const [unassignedLevels, setUnassignedLevels] = useState([]);

    const [loading, setLoading] = useState(true);
    const [expandedPrograms, setExpandedPrograms] = useState(new Set());
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Edit/Create Modal State
    const [modal, setModal] = useState({ open: false, type: null, parentId: null, data: null });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPrograms = useCallback(async () => {
        try {
            const res = await fetch('/api/training/programs');
            const data = await res.json();
            if (res.ok) setPrograms(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchUnassigned = useCallback(async () => {
        try {
            const res = await fetch('/api/training/levels');
            const data = await res.json();
            if (res.ok) {
                // Filter levels where group_id is null or empty
                const unassigned = data.filter(l => !l.group_id);
                setUnassignedLevels(unassigned);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchPrograms(), fetchUnassigned()]);
            setLoading(false);
        };
        init();
    }, [fetchPrograms, fetchUnassigned]);

    const fetchGroups = async (programId) => {
        try {
            const res = await fetch(`/api/training/groups?program_id=${programId}`);
            const data = await res.json();
            if (res.ok) {
                setGroups(prev => ({ ...prev, [programId]: data }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchLevels = async (groupId) => {
        try {
            const res = await fetch(`/api/training/levels?group_id=${groupId}`);
            const data = await res.json();
            if (res.ok) {
                setLevels(prev => ({ ...prev, [groupId]: data }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleProgram = (programId) => {
        const newExpanded = new Set(expandedPrograms);
        if (newExpanded.has(programId)) {
            newExpanded.delete(programId);
        } else {
            newExpanded.add(programId);
            fetchGroups(programId);
        }
        setExpandedPrograms(newExpanded);
    };

    const toggleGroup = (groupId) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
            fetchLevels(groupId);
        }
        setExpandedGroups(newExpanded);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { type, parentId, data } = modal;
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData);

        let url = '';
        let method = data ? 'PUT' : 'POST';
        if (data) payload.id = data.id;

        if (type === 'PROGRAM') {
            url = '/api/training/programs';
        } else if (type === 'GROUP') {
            url = '/api/training/groups';
            payload.program_id = parentId;
            payload.platas = parseInt(payload.platas) || 0;
        } else if (type === 'LEVEL') {
            url = '/api/training/levels';
            payload.group_id = parentId;
            payload.order_index = parseInt(payload.order_index);
            payload.platas = parseInt(payload.platas) || 0;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setModal({ open: false, type: null, parentId: null, data: null });
                // Refresh relevant data
                if (type === 'PROGRAM') fetchPrograms();
                if (type === 'GROUP') fetchGroups(parentId);
                if (type === 'LEVEL') {
                    if (parentId) fetchLevels(parentId);
                    fetchUnassigned(); // Might have been assigned from unassigned
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (type, id, parentId) => {
        if (!confirm('Tem certeza? Isso pode desvincular itens filhos.')) return;

        let url = '';
        if (type === 'PROGRAM') url = `/api/training/programs?id=${id}`;
        if (type === 'GROUP') url = `/api/training/groups?id=${id}`;
        if (type === 'LEVEL') url = `/api/training/levels?id=${id}`;

        try {
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                if (type === 'PROGRAM') fetchPrograms();
                if (type === 'GROUP') fetchGroups(parentId);
                if (type === 'LEVEL') {
                    if (parentId) fetchLevels(parentId);
                    else fetchUnassigned();
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const ModalForm = () => {
        if (!modal.open) return null;
        const { type, data } = modal;

        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#f1f5f9',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                animation: 'fadeIn 0.2s ease'
            }}>
                <div className="card" style={{
                    width: '450px', maxWidth: '95%',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 25px 50px -12px #f1f5f9'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            {data ? <Edit size={20} /> : <Plus size={20} />}
                            {data ? 'Editar' : 'Novo'} {type === 'PROGRAM' ? 'Programa' : type === 'GROUP' ? 'Grupo' : 'Nível'}
                        </h3>
                        <button onClick={() => setModal({ ...modal, open: false })} className="icon-btn">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="input-group">
                            <label className="input-label">Nome</label>
                            <input name="name" defaultValue={data?.name} className="input-field" required placeholder="Ex: Treinamento Inicial" />
                        </div>

                        {type === 'PROGRAM' && (
                            <div className="input-group">
                                <label className="input-label">Descrição</label>
                                <textarea name="description" defaultValue={data?.description} className="input-field" rows={3} placeholder="Breve resumo do programa..." />
                            </div>
                        )}

                        {type !== 'PROGRAM' && (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Ordem de Exibição</label>
                                    <input name="order_index" type="number" defaultValue={data?.order_index || 0} className="input-field" required />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Recompensa (Platas)</label>
                                    <input name="platas" type="number" defaultValue={data?.platas || 0} className="input-field" placeholder="Ex: 50" />
                                </div>
                            </div>
                        )}

                        {type === 'LEVEL' && (
                            <>
                                <div className="input-group">
                                    <label className="input-label">Descrição da Conquista</label>
                                    <textarea name="description" defaultValue={data?.description} className="input-field" rows={3} placeholder="O que o funcionário aprende aqui?" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Ícone</label>
                                    <input name="icon" defaultValue={data?.icon || 'Circle'} className="input-field" placeholder="Nome do ícone Lucide (ex: ChefHat, Star)" />
                                </div>
                                {modal.parentId === null && data?.group_id === null && (
                                    <div className="input-group">
                                        <label className="input-label">Atribuir a Grupo</label>
                                        <select name="group_id" className="input-field">
                                            <option value="">Permanecer sem grupo</option>
                                            {programs.map(p => (
                                                <optgroup key={p.id} label={p.name}>
                                                    {groups[p.id]?.map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                type="button"
                                onClick={() => setModal({ ...modal, open: false })}
                                className="btn"
                                style={{ background: '#f8fafc' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', padding: '4rem' }}>
                <Terminal className="animate-pulse" size={48} color="var(--accent-purple)" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
            {/* Header Area */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '2rem', padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                borderRadius: '24px', border: '1px solid #f8fafc'
            }}>
                <div>
                    <h2 className="h2" style={{ margin: 0, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Layout color="var(--accent-purple)" size={28} />
                        Gestor de Trilhas
                    </h2>
                    <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: 4 }}>
                        Organize o aprendizado da sua equipe em programas e categorias.
                    </p>
                </div>
                <button
                    onClick={() => setModal({ open: true, type: 'PROGRAM', parentId: null })}
                    className="btn btn-primary shadow-glow"
                    style={{ width: 'auto', padding: '12px 24px', borderRadius: '12px' }}
                >
                    <Plus size={20} style={{ marginRight: 8 }} /> Novo Programa
                </button>
            </div>

            {/* List of Programs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {programs.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.8 }}>
                        <AlertCircle size={48} style={{ margin: '0 auto 1rem', display: 'block' }} className="text-secondary" />
                        <p>Nenhum programa cadastrado. Comece criando um acima!</p>
                    </div>
                )}

                {programs.map(program => (
                    <div key={program.id} className="card" style={{
                        padding: 0, overflow: 'hidden',
                        border: '1px solid #f8fafc',
                        background: expandedPrograms.has(program.id) ? '#f8fafc' : 'rgba(255,255,255,0.01)',
                        transition: 'all 0.33s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        {/* Program Header */}
                        <div
                            style={{
                                padding: '1.25rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer',
                                background: '#f8fafc'
                            }}
                            onClick={() => toggleProgram(program.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                                    width: 44, height: 44, borderRadius: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                                }}>
                                    <Folder color="white" size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{program.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>{program.description || 'Sem descrição'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="icon-btn-circle" onClick={(e) => { e.stopPropagation(); setModal({ open: true, type: 'PROGRAM', data: program }); }}>
                                        <Edit size={16} />
                                    </button>
                                    <button className="icon-btn-circle" style={{ color: 'var(--accent-red)' }} onClick={(e) => { e.stopPropagation(); handleDelete('PROGRAM', program.id); }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#f8fafc'
                                }}>
                                    {expandedPrograms.has(program.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                            </div>
                        </div>

                        {/* Groups Area */}
                        {expandedPrograms.has(program.id) && (
                            <div style={{ padding: '1rem 1.5rem 1.5rem', borderTop: '1px solid #f8fafc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Layers size={16} className="text-secondary" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>GRUPOS / CATEGORIAS</span>
                                    </div>
                                    <button
                                        className="btn"
                                        style={{
                                            width: 'auto',
                                            fontSize: '0.75rem',
                                            padding: '6px 12px',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(59, 130, 246, 0.2)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                        onClick={() => setModal({ open: true, type: 'GROUP', parentId: program.id })}
                                    >
                                        <Plus size={14} /> Novo Grupo
                                    </button>
                                </div>

                                {groups[program.id]?.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Crie categorias para organizar as trilhas.
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {groups[program.id]?.sort((a, b) => a.order_index - b.order_index).map(group => (
                                        <div key={group.id} style={{
                                            borderRadius: '16px',
                                            background: expandedGroups.has(group.id) ? '#f1f5f9' : 'rgba(0,0,0,0.15)',
                                            border: '1px solid #f8fafc',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '0.75rem 1rem',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => toggleGroup(group.id)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)' }}></div>
                                                    <span style={{ fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{group.name}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', padding: '2px 6px', background: '#f8fafc', borderRadius: '4px' }}>#{group.order_index}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); setModal({ open: true, type: 'GROUP', parentId: program.id, data: group }); }}>
                                                            <Edit size={14} />
                                                        </button>
                                                        <button className="icon-btn-small" style={{ color: 'var(--accent-red)' }} onClick={(e) => { e.stopPropagation(); handleDelete('GROUP', group.id, program.id); }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    {expandedGroups.has(group.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </div>
                                            </div>

                                            {/* Levels Rendering */}
                                            {expandedGroups.has(group.id) && (
                                                <div style={{ padding: '0 1rem 1rem', animation: 'slideDown 0.2s ease-out' }}>
                                                    <div style={{ borderTop: '1px solid #f8fafc', paddingTop: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Star size={12} /> TRILHAS (NÍVEIS DE PROGRESSO)
                                                            </span>
                                                            <button
                                                                className="btn"
                                                                style={{
                                                                    width: 'auto',
                                                                    fontSize: '0.7rem',
                                                                    padding: '4px 10px',
                                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                                    color: 'var(--accent-green)',
                                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                    borderRadius: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                                onClick={() => setModal({ open: true, type: 'LEVEL', parentId: group.id })}
                                                            >
                                                                <Plus size={12} /> Add Nível
                                                            </button>
                                                        </div>

                                                        {levels[group.id]?.length === 0 && (
                                                            <div style={{ padding: '1rem', border: '1px dashed #e2e8f0', borderRadius: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                                Nenhuma trilha neste grupo.
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {levels[group.id]?.sort((a, b) => a.order_index - b.order_index).map(level => {
                                                                // Dynamic icon selection
                                                                //@ts-ignore
                                                                const LevelIcon = Star;

                                                                return (
                                                                    <div key={level.id} style={{
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                        padding: '10px 12px', background: '#f8fafc',
                                                                        borderRadius: '12px', border: '1px solid #f8fafc',
                                                                        transition: 'transform 0.2s'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <BookOpen size={16} color="var(--accent-green)" />
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{level.name}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                    {level.description}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '0.8rem', fontWeight: '800', opacity: 0.3 }}>{level.order_index}º</span>
                                                                            <div style={{ width: 1, height: 20, background: '#e2e8f0' }}></div>
                                                                            <button className="icon-btn-small" onClick={() => setModal({ open: true, type: 'LEVEL', parentId: group.id, data: level })}>
                                                                                <Edit size={14} />
                                                                            </button>
                                                                            <button className="icon-btn-small" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete('LEVEL', level.id, group.id)}>
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Unassigned Trails Section */}
                {unassignedLevels.length > 0 && (
                    <div className="card" style={{
                        marginTop: '2rem', border: '1px dashed #e2e8f0',
                        background: 'rgba(255,252,231,0.02)', position: 'relative'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                            <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: 10, borderRadius: 12 }}>
                                <AlertCircle color="var(--accent-gold)" size={20} />
                            </div>
                            <div>
                                <h3 className="h3" style={{ margin: 0, fontSize: '1.1rem' }}>Trilhas Não Atribuídas</h3>
                                <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Existem {unassignedLevels.length} trilhas sem grupo. Vincule-as para que apareçam para os usuários.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                            {unassignedLevels.map(level => (
                                <div key={level.id} style={{
                                    padding: '12px', background: '#f8fafc',
                                    borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{level.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nível {level.order_index}</div>
                                    </div>
                                    <button
                                        className="icon-btn-circle"
                                        onClick={() => setModal({ open: true, type: 'LEVEL', parentId: null, data: level })}
                                        title="Atribuir a um grupo"
                                    >
                                        <MoveRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ModalForm />

            <style jsx>{`
                .icon-btn-circle {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: #f8fafc;
                    border: none;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .icon-btn-circle:hover {
                    background: rgba(255,255,255,0.12);
                    transform: translateY(-1px);
                }
                .icon-btn-small {
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    padding: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .icon-btn-small:hover {
                    background: #f8fafc;
                    color: white;
                }
                .shadow-glow {
                    box-shadow: 0 0 15px rgba(124, 58, 237, 0.2);
                }
                .shadow-glow:hover {
                    box-shadow: 0 0 25px rgba(124, 58, 237, 0.4);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
