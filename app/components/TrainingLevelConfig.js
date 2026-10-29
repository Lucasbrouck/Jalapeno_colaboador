
import { useState, useEffect } from 'react';
import { Save, Plus, Trash, GripVertical, ChevronUp, ChevronDown, Check, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';

export default function TrainingLevelConfig() {
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLevels = async () => {
        const res = await fetch('/api/training/levels');
        if (res.ok) {
            const data = await res.json();
            setLevels(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLevels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpdate = async (id, updates) => {
        // Optimistic update
        setLevels(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

        await fetch('/api/training/levels', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates })
        });
    };

    const handleCreate = async () => {
        const newOrder = levels.length > 0 ? Math.max(...levels.map(l => l.order_index)) + 1 : 1;
        const newLevel = {
            order_index: newOrder,
            name: 'Novo Nível',
            description: 'Descrição do nível',
            icon: 'Circle'
        };

        const res = await fetch('/api/training/levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLevel)
        });

        if (res.ok) {
            const saved = await res.json();
            setLevels([...levels, saved]);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover este nível?')) return;

        setLevels(prev => prev.filter(l => l.id !== id));
        await fetch(`/api/training/levels?id=${id}`, { method: 'DELETE' });
    };

    const moveLevel = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === levels.length - 1)) return;

        const newLevels = [...levels];
        const temp = newLevels[index];
        newLevels[index] = newLevels[index + direction];
        newLevels[index + direction] = temp;

        // Update orders
        newLevels.forEach((l, i) => {
            l.order_index = i + 1;
            handleUpdate(l.id, { order_index: i + 1 });
        });

        setLevels(newLevels);
    };

    const IconSelector = ({ value, onChange }) => {
        const commonIcons = ['Circle', 'BookOpen', 'HandHelping', 'Package', 'MessageCircle', 'ChefHat', 'Star', 'Trophy', 'Medal', 'Award', 'Zap', 'Target'];

        return (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {commonIcons.map(iconName => {
                    const IconComp = Icons[iconName] || Icons.Circle;
                    return (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => onChange(iconName)}
                            style={{
                                background: value === iconName ? 'var(--accent-blue)' : '#e2e8f0',
                                border: 'none',
                                borderRadius: 4,
                                padding: 4,
                                cursor: 'pointer',
                                display: 'flex'
                            }}
                            title={iconName}
                        >
                            <IconComp size={16} color="white" />
                        </button>
                    )
                })}
            </div>
        )
    };

    const [isExpanded, setIsExpanded] = useState(false);

    if (loading) return <div>Carregando trilhas...</div>;

    return (
        <div className="card">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? 16 : 0, cursor: 'pointer' }}
            >
                <h3 className="h3" style={{ margin: 0 }}>Trilha de Treinamento</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isExpanded && (
                        <button onClick={(e) => { e.stopPropagation(); handleCreate(); }} className="btn btn-primary" style={{ padding: '6px 12px' }}>
                            <Plus size={16} style={{ marginRight: 6 }} /> Novo Nível
                        </button>
                    )}
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.3s ease' }}>
                    {levels.map((level, index) => {
                        const IconComp = Icons[level.icon] || Icons.Circle;

                        return (
                            <div key={level.id} style={{
                                background: '#f8fafc',
                                padding: 12,
                                borderRadius: 8,
                                display: 'flex',
                                gap: 12,
                                alignItems: 'flex-start'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <button onClick={() => moveLevel(index, -1)} disabled={index === 0} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', opacity: index === 0 ? 0.3 : 1 }}>
                                        <ChevronUp size={16} />
                                    </button>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'center' }}>{level.order_index}</div>
                                    <button onClick={() => moveLevel(index, 1)} disabled={index === levels.length - 1} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', opacity: index === levels.length - 1 ? 0.3 : 1 }}>
                                        <ChevronDown size={16} />
                                    </button>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="text-xs">Nome do Nível</label>
                                            <input
                                                className="input-field"
                                                value={level.name}
                                                onChange={(e) => handleUpdate(level.id, { name: e.target.value })}
                                            />
                                        </div>
                                        <div style={{ width: 50, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <label className="text-xs">Ícone</label>
                                            <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%' }}>
                                                <IconComp size={20} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <label className="text-xs">Descrição</label>
                                                <input
                                                    className="input-field"
                                                    value={level.description}
                                                    onChange={(e) => handleUpdate(level.id, { description: e.target.value })}
                                                />
                                            </div>
                                            <div style={{ width: 80 }}>
                                                <label className="text-xs">Recompensa (Platas)</label>
                                                <input
                                                    type="number"
                                                    className="input-field"
                                                    value={level.platas || 0}
                                                    onChange={(e) => handleUpdate(level.id, { platas: parseInt(e.target.value) || 0 })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <IconSelector value={level.icon} onChange={(icon) => handleUpdate(level.id, { icon })} />
                                </div>

                                <button onClick={() => handleDelete(level.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 8 }}>
                                    <Trash size={18} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            <style jsx>{`
                @media (max-width: 640px) {
                    .h3 { font-size: 0.95rem !important; }
                    .btn { font-size: 0.75rem !important; padding: 6px 10px !important; }
                    .card { padding: 12px !important; }
                    .input-field { font-size: 0.75rem !important; padding: 8px !important; }
                    .text-xs { font-size: 0.65rem !important; }
                    div[style*="padding: 12"] { padding: 8px !important; gap: 8px !important; }
                    button svg { width: 14px !important; height: 14px !important; }
                }
            `}</style>
        </div>
    );
}
