import { useState, useEffect } from 'react';
import PDIModelModal from './PDIModelModal';
import { Plus, Trash2, CheckCircle, HelpCircle, Save, X, Trash, Folder, ArrowLeft, MoreVertical, Edit2, ChevronRight, ChevronDown } from 'lucide-react';

export default function PDIConfig() {
    // Models State
    const [viewMode, setViewMode] = useState('MODELS'); // 'MODELS' or 'QUESTIONS'
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState(null);

    // Questions State (Old Logic)
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingType, setAddingType] = useState(null);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [error, setError] = useState(null);

    // --- MODELS LOGIC ---
    useEffect(() => {
        fetchModels();
    }, []);

    // Fetch questions when selected model changes
    useEffect(() => {
        if (selectedModel) {
            fetchQuestions(selectedModel.id);
        } else {
            setQuestions([]);
        }
    }, [selectedModel]);

    const fetchModels = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/pdi/models');
            if (res.ok) {
                const data = await res.json();
                setModels(data);
                // If only one model exists (legacy/default), maybe auto-select it? 
                // For now, let's show the list to enforce the new flow.
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingModel(null);
        setIsModalOpen(true);
    };

    const handleEditModel = (model) => {
        setEditingModel(model);
        setIsModalOpen(true);
    };

    const handleDeleteModel = async (idToDelete) => {
        // Allow passing an ID (for list view) or use selectedModel (for detail view)
        const targetId = idToDelete || selectedModel?.id;

        if (!targetId) return;

        if (!confirm('Tem certeza que deseja excluir este modelo? Todas as perguntas associadas serão apagadas. Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const res = await fetch(`/api/pdi/models/${targetId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Remove from local list
                const updatedModels = models.filter(m => m.id !== targetId);
                setModels(updatedModels);

                // If we deleted the currently selected model (or we are in detail view), handle navigation
                if (selectedModel?.id === targetId) {
                    if (updatedModels.length > 0) {
                        const nextModel = updatedModels[0];
                        setSelectedModel(nextModel);
                    } else {
                        setSelectedModel(null);
                        setViewMode('MODELS');
                    }
                }
                alert('Modelo excluído com sucesso!');
            } else {
                const data = await res.json();
                alert(data.error || 'Erro ao excluir modelo');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir modelo');
        }
    };

    const handleSaveModel = async (data) => {
        try {
            const url = editingModel ? `/api/pdi/models/${editingModel.id}` : '/api/pdi/models';
            const method = editingModel ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchModels();
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao salvar modelo');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar modelo');
        }
    };

    const selectModel = (modelId) => {
        setSelectedModel(modelId);
        setViewMode('QUESTIONS');
    };

    // --- QUESTIONS LOGIC (Scoped to Model) ---
    const fetchQuestions = async (modelId) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/pdi/questions?modelId=${modelId}`);
            if (!res.ok) throw new Error('Erro ao carregar perguntas');
            const data = await res.json();
            setQuestions(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuestion = async (category) => {
        if (!newQuestionText.trim() || !selectedModel) return;

        try {
            const res = await fetch('/api/pdi/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: newQuestionText,
                    category,
                    modelId: selectedModel.id, // Scoped to current model (ID)
                    order_index: questions.filter(q => q.category === category).length
                })
            });
            if (res.ok) {
                setNewQuestionText('');
                setAddingType(null);
                fetchQuestions(selectedModel.id);
            }
        } catch (error) {
            alert('Erro ao salvar pergunta');
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!confirm('Excluir pergunta definitivamente?')) return;
        try {
            const res = await fetch(`/api/pdi/questions?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchQuestions(selectedModel.id);
        } catch (error) {
            console.error('Failed to delete question:', error);
        }
    };

    // --- RENDER HELPERS ---
    const renderQuestionSection = (title, category) => {
        const sectionQuestions = questions.filter(q => q.category === category);
        const isAdding = addingType === category;

        return (
            <div style={{ marginBottom: 24, animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 className="h4" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{title}</h4>
                    <button
                        onClick={() => {
                            if (isAdding) {
                                setAddingType(null);
                                setNewQuestionText('');
                            } else {
                                setAddingType(category);
                                setNewQuestionText('');
                            }
                        }}
                        className="btn"
                        style={{
                            width: 'auto',
                            padding: '6px 16px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '0.8rem',
                            background: isAdding ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isAdding ? 'var(--accent-red)' : 'var(--accent-green)',
                            border: isAdding ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                            fontWeight: 600,
                            borderRadius: 8,
                            marginLeft: 16
                        }}
                    >
                        {isAdding ? <><X size={14} style={{ marginRight: 4 }} /> Cancelar</> : <><Plus size={14} style={{ marginRight: 4 }} /> Novo</>}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sectionQuestions.map(q => (
                        <div key={q.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderRadius: 6,
                        }}>
                            <span style={{ fontSize: '0.95rem' }}>{q.text}</span>
                            <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'rgba(239, 68, 68, 0.6)',
                                    display: 'flex', alignItems: 'center', padding: 4
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {sectionQuestions.length === 0 && !isAdding && (
                        <div style={{ padding: 10, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            Nenhuma pergunta registrada neste modelo.
                        </div>
                    )}
                </div>

                {isAdding && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, animation: 'fadeIn 0.2s' }}>
                        <input
                            autoFocus
                            type="text"
                            className="input-field"
                            placeholder="Digite a pergunta..."
                            style={{ flex: 1 }}
                            value={newQuestionText}
                            onChange={e => setNewQuestionText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateQuestion(category)}
                        />
                        <button
                            onClick={() => handleCreateQuestion(category)}
                            className="btn btn-primary"
                            disabled={!newQuestionText.trim()}
                            style={{
                                width: 42,
                                height: 42,
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 8
                            }}
                        >
                            <Save size={20} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const [isExpanded, setIsExpanded] = useState(false);

    // --- MAIN RENDER ---

    // VIEW: MODELS LIST
    if (viewMode === 'MODELS') {
        return (
            <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ marginBottom: isExpanded ? 20 : 0, paddingBottom: isExpanded ? 12 : 0, borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <h3 className="h3" style={{ margin: 0 }}>Modelos de Avaliação</h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCreate(); }}
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <Plus size={18} /> Novo Modelo
                            </button>
                        )}
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                </div>

                {isExpanded && (
                    <>
                        {/* Create Model Form */}
                        <PDIModelModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSave={handleSaveModel}
                            initialData={editingModel}
                        />

                        {/* Models Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                            {models.map(model => (
                                <div key={model.id} onClick={() => selectModel(model)} style={{
                                    background: '#f8fafc',
                                    padding: 24,
                                    borderRadius: 16,
                                    border: '1px solid #f8fafc',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f8fafc'; e.currentTarget.style.transform = 'none'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 10 }}>
                                            <Folder size={24} color="var(--accent-blue)" />
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditModel(model);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'rgba(255,255,255,0.4)',
                                                    display: 'flex',
                                                    padding: 4,
                                                    borderRadius: 6,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                                                title="Editar Modelo"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteModel(model.id);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'rgba(255,255,255,0.4)',
                                                    display: 'flex',
                                                    padding: 4,
                                                    borderRadius: 6,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                                                title="Excluir Modelo"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>{model.title}</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                            {model.description || 'Sem descrição'}
                                        </p>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f8fafc', fontSize: '0.85rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Configurar Perguntas <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // VIEW: QUESTION EDITOR (Scoped)
    return (
        <div className="card" style={{ marginTop: 40, animation: 'fadeIn 0.3s ease' }}>
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ marginBottom: isExpanded ? 20 : 0, paddingBottom: isExpanded ? 12 : 0, borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
                <div>
                    {isExpanded && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setViewMode('MODELS'); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.9rem' }}
                        >
                            <ArrowLeft size={16} /> Voltar para Modelos
                        </button>
                    )}
                    <h3 className="h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {selectedModel?.title}
                    </h3>
                    {isExpanded && (
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Adicione ou remova perguntas para este modelo.
                        </p>
                    )}
                </div>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>

            {isExpanded && (
                <>
                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: '0.9rem' }}>
                            Erro: {error}.
                        </div>
                    )}

                    {renderQuestionSection('Operação', 'OPERATIONAL')}
                    <div style={{ height: 1, background: '#e2e8f0', margin: '24px 0' }} />

                    {renderQuestionSection('Cultura', 'CULTURAL')}
                    <div style={{ height: 1, background: '#e2e8f0', margin: '24px 0' }} />

                    {renderQuestionSection('Perguntas Abertas', 'OPEN')}
                </>
            )}
            <style jsx>{`
                @media (max-width: 640px) {
                    .h3 { font-size: 0.95rem !important; }
                    .h4 { font-size: 0.85rem !important; }
                    .btn { font-size: 0.75rem !important; }
                    .card { padding: 12px !important; }
                    .input-field { font-size: 0.75rem !important; padding: 8px !important; }
                    span { font-size: 0.75rem !important; }
                    p { font-size: 0.75rem !important; }
                    div[style*="padding: 24"] { padding: 12px !important; }
                    div[style*="gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'"] { 
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                    }
                    button svg { width: 14px !important; height: 14px !important; }
                }
            `}</style>
        </div>
    );
}
