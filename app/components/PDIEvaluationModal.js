import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Save, Star, MessageSquare, User, ShieldCheck } from 'lucide-react';

export default function PDIEvaluationModal({ evaluation, userId, onClose, onSave, isAdmin = false }) {
    const [questions, setQuestions] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [improvementPlan, setImprovementPlan] = useState({
        focusOpId: '',
        focusOpComment: '',
        focusCultId: '',
        focusCultComment: '',
        finalComment: ''
    });

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch questions
                const qRes = await fetch('/api/pdi/questions');
                const qs = await qRes.json();

                // Fetch existing answers if any
                const aRes = await fetch(`/api/pdi/answers?userId=${userId}&date=${evaluation.scheduled_date}&evaluationId=${evaluation.id}`);
                const as = await aRes.json();
                console.log('[Modal] API Answers fetched:', as);

                const initialAnswers = {};
                qs.forEach(q => {
                    const existing = as.find(a => String(a.questionId) === String(q.id));
                    // console.log(`[Modal] Mapping Q: ${q.id} -> Answer Found: ${!!existing}`);

                    initialAnswers[q.id] = {
                        selfScore: existing?.selfScore || null,
                        selfComment: existing?.selfComment || '',
                        admScore: existing?.admScore || null,
                        admComment: existing?.admComment || ''
                    };
                });

                setAnswers(initialAnswers);
                setQuestions(qs);

                // Initialize Improvement Plan from evaluation prop
                setImprovementPlan({
                    focusOpId: evaluation.focus_op_id || '',
                    focusOpComment: evaluation.focus_op_comment || '',
                    focusCultId: evaluation.focus_cult_id || '',
                    focusCultComment: evaluation.focus_cult_comment || '',
                    finalComment: evaluation.final_comment || ''
                });

                setLoading(false);
            } catch (error) {
                console.error('Failed to load PDI evaluation:', error);
                onClose();
            }
        };
        load();
    }, [evaluation, userId, onClose]);

    const handleAnswerChange = (questionId, field, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save all answers
            for (const qId of Object.keys(answers)) {
                // ... (logic for payload matches previous fix)
                const payload = {
                    userId: userId,
                    questionId: qId,
                    date: evaluation.scheduled_date,
                    evaluationId: evaluation.id
                };

                if (evaluation.status === 'PENDING_SELF') {
                    payload.selfScore = answers[qId]?.selfScore || 3;
                    payload.selfComment = answers[qId]?.selfComment ?? '';
                } else if (evaluation.status === 'PENDING_ADM') {
                    payload.admScore = answers[qId]?.admScore || 3;
                    payload.admComment = answers[qId]?.admComment ?? '';
                }

                await fetch('/api/pdi/answers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            // 2. Update evaluation status and Improvement Plan
            let nextStatus = evaluation.status;
            let completedAt = null;

            if (evaluation.status === 'PENDING_SELF') {
                nextStatus = 'PENDING_ADM';
            } else if (evaluation.status === 'PENDING_ADM') {
                nextStatus = 'COMPLETED';
                completedAt = new Date().toISOString();
            }

            const evalPayload = {
                id: evaluation.id,
                status: nextStatus,
                completed_at: completedAt,
                // Only send improvement plan if Admin
                ...(isAdmin ? {
                    focus_op_id: improvementPlan.focusOpId,
                    focus_op_comment: improvementPlan.focusOpComment,
                    focus_cult_id: improvementPlan.focusCultId,
                    focus_cult_comment: improvementPlan.focusCultComment,
                    final_comment: improvementPlan.finalComment
                } : {})
            };

            await fetch('/api/pdi/evaluations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evalPayload)
            });

            if (onSave) onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save PDI:', error);
            alert('Erro ao salvar avaliação');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    const isPendingAdm = evaluation.status === 'PENDING_ADM';
    const sections = [];

    if (isPendingAdm && isAdmin) {
        // Manager is evaluating: OPS -> CULTURAL -> OPEN -> PLAN
        sections.push('OPERATIONAL', 'CULTURAL', 'OPEN', 'PLAN');
    } else {
        // Standard Review: PLAN (if applicable) -> OPS -> CULTURAL -> OPEN
        if (isAdmin || evaluation.status === 'COMPLETED') {
            sections.push('PLAN');
        }
        sections.push('OPERATIONAL', 'CULTURAL', 'OPEN');
    }

    const sectionLabels = {
        'PLAN': 'Plano de Melhoria',
        'OPERATIONAL': 'Operação',
        'CULTURAL': 'Cultura',
        'OPEN': 'Perguntas Abertas'
    };

    const isLastStep = currentStep === sections.length - 1;
    const isCompleted = evaluation.status === 'COMPLETED';
    const canEditAdm = isPendingAdm && isAdmin;
    const currentSectionKey = sections[currentStep];

    const renderContent = () => {
        if (currentSectionKey === 'PLAN') {
            const opQuestions = questions.filter(q => q.category === 'OPERATIONAL');
            const cultQuestions = questions.filter(q => q.category === 'CULTURAL');

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Focus Cards Container - Side by Side */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        {/* FOCO OPERACIONAL */}
                        <div className="card" style={{ background: '#f8fafc', padding: 12, border: '1px solid var(--accent-blue)' }}>
                            <h4 style={{ color: 'var(--accent-blue)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <ShieldCheck size={16} /> <span style={{ fontSize: '0.85rem' }}>FOCO OPERACIONAL</span>
                            </h4>

                            {canEditAdm ? (
                                <>
                                    <select
                                        className="input-field"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.75rem',
                                            marginBottom: 8
                                        }}
                                        value={improvementPlan.focusOpId}
                                        onChange={(e) => setImprovementPlan({ ...improvementPlan, focusOpId: e.target.value })}
                                    >
                                        <option value="">Selecione um foco...</option>
                                        {opQuestions.map(q => <option key={q.id} value={q.id}>{q.text}</option>)}
                                    </select>
                                    <textarea
                                        className="input-field"
                                        placeholder="Comentário sobre o foco operacional..."
                                        style={{
                                            width: '100%',
                                            minHeight: 100,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.75rem',
                                            resize: 'vertical'
                                        }}
                                        value={improvementPlan.focusOpComment}
                                        onChange={(e) => setImprovementPlan({ ...improvementPlan, focusOpComment: e.target.value })}
                                    />
                                </>
                            ) : (
                                <>
                                    <div style={{
                                        padding: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--accent-blue)',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        marginBottom: 8
                                    }}>
                                        {opQuestions.find(q => String(q.id) === String(improvementPlan.focusOpId))?.text || 'Não definido'}
                                    </div>
                                    {improvementPlan.focusOpComment && (
                                        <div style={{
                                            padding: '8px',
                                            background: '#f8fafc',
                                            borderRadius: '8px',
                                            color: '#ccc',
                                            fontSize: '0.75rem',
                                            fontStyle: 'italic'
                                        }}>
                                            "{improvementPlan.focusOpComment}"
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* FOCO CULTURAL */}
                        <div className="card" style={{ background: '#f8fafc', padding: 12, border: '1px solid var(--accent-purple)' }}>
                            <h4 style={{ color: 'var(--accent-purple)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <User size={16} /> <span style={{ fontSize: '0.85rem' }}>FOCO CULTURAL</span>
                            </h4>

                            {canEditAdm ? (
                                <select
                                    className="input-field"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.75rem',
                                        marginBottom: 8
                                    }}
                                    value={improvementPlan.focusCultId}
                                    onChange={(e) => setImprovementPlan({ ...improvementPlan, focusCultId: e.target.value })}
                                >
                                    <option value="">Selecione um foco...</option>
                                    {cultQuestions.map(q => <option key={q.id} value={q.id}>{q.text}</option>)}
                                </select>
                            ) : (
                                <div style={{
                                    padding: '8px',
                                    background: 'rgba(168, 85, 247, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--accent-purple)',
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    marginBottom: 8
                                }}>
                                    {cultQuestions.find(q => String(q.id) === String(improvementPlan.focusCultId))?.text || 'Não definido'}
                                </div>
                            )}

                            {canEditAdm ? (
                                <textarea
                                    className="input-field"
                                    placeholder="Comentário sobre o foco cultural..."
                                    style={{
                                        width: '100%',
                                        minHeight: 100,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        background: '#f8fafc',
                                        border: '2px solid #e2e8f0',
                                        color: 'var(--text-primary)',
                                        resize: 'vertical'
                                    }}
                                    value={improvementPlan.focusCultComment}
                                    onChange={(e) => setImprovementPlan({ ...improvementPlan, focusCultComment: e.target.value })}
                                />
                            ) : (
                                improvementPlan.focusCultComment && (
                                    <div style={{
                                        padding: '8px',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        color: '#ccc',
                                        fontSize: '0.75rem',
                                        fontStyle: 'italic'
                                    }}>
                                        "{improvementPlan.focusCultComment}"
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ background: '#f8fafc', padding: 12 }}>
                        <h4 style={{ marginBottom: 16, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <MessageSquare size={16} /> CONSIDERAÇÕES FINAIS
                        </h4>
                        <textarea
                            className="input-field"
                            placeholder="Feedback geral e próximos passos..."
                            style={{
                                width: '100%',
                                minHeight: 100,
                                padding: '8px',
                                borderRadius: '8px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                resize: 'vertical'
                            }}
                            value={improvementPlan.finalComment}
                            onChange={(e) => setImprovementPlan({ ...improvementPlan, finalComment: e.target.value })}
                            readOnly={!canEditAdm}
                        />
                    </div>
                </div >
            );
        }

        const sectionQuestions = questions.filter(q => q.category === currentSectionKey);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {sectionQuestions.map(q => {
                    const isSelfMode = evaluation.status === 'PENDING_SELF';

                    // OPEN questions have no stars (only text)
                    const isOpenCategory = q.category === 'OPEN';

                    // VISIBILITY LOGIC for Pending Adm User View
                    if (isPendingAdm && !isAdmin) {
                        return (
                            <div key={q.id} className="card" style={{ textAlign: 'center', padding: 20, background: '#f8fafc' }}>
                                <h4 style={{ margin: '0 0 8px' }}>Autoavaliação concluída</h4>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aguardando feedback e avaliação do seu gestor.</p>
                            </div>
                        );
                    }

                    const canEditSelf = isSelfMode && !isAdmin;

                    return (
                        <div key={q.id}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-primary)', borderLeft: '4px solid var(--accent-blue)', paddingLeft: 8 }}>{q.text}</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: (isCompleted || isPendingAdm) ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8 }}>
                                {/* SUAVALIAÇÃO (LEFT) */}
                                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                                        <User size={12} /> AUTOAVALIAÇÃO
                                    </div>

                                    {!isOpenCategory && (
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    disabled={!canEditSelf}
                                                    onClick={() => handleAnswerChange(q.id, 'selfScore', star)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: canEditSelf ? 'pointer' : 'default',
                                                        color: (answers[q.id]?.selfScore || 0) >= star ? '#fbbf24' : '#e2e8f0',
                                                        padding: 2
                                                    }}
                                                >
                                                    <Star size={13} fill={(answers[q.id]?.selfScore || 0) >= star ? '#fbbf24' : 'none'} />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ position: 'relative' }}>
                                        <textarea
                                            readOnly={!canEditSelf}
                                            className="input-field"
                                            placeholder={canEditSelf ? "Sua autoavaliação..." : "Não preenchido"}
                                            style={{
                                                width: '100%',
                                                minHeight: 60,
                                                padding: '6px',
                                                borderRadius: '6px',
                                                fontSize: '0.65rem',
                                                resize: 'none',
                                                background: canEditSelf ? '#f8fafc' : 'transparent',
                                                border: canEditSelf ? '1px solid #e2e8f0' : 'none',
                                                color: 'var(--text-primary)'
                                            }}
                                            value={answers[q.id]?.selfComment || ''}
                                            onChange={e => handleAnswerChange(q.id, 'selfComment', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* GESTOR (RIGHT) */}
                                {(isCompleted || isPendingAdm) && (
                                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 10, borderRadius: 8, border: canEditAdm ? '1px solid rgba(59, 130, 246, 0.2)' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--accent-blue)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                                            <ShieldCheck size={12} /> AVALIAÇÃO GESTOR
                                        </div>

                                        {!isOpenCategory && (
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        disabled={!canEditAdm}
                                                        onClick={() => handleAnswerChange(q.id, 'admScore', star)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: canEditAdm ? 'pointer' : 'default',
                                                            color: (answers[q.id]?.admScore || 0) >= star ? '#fbbf24' : '#e2e8f0',
                                                            padding: 2
                                                        }}
                                                    >
                                                        <Star size={13} fill={(answers[q.id]?.admScore || 0) >= star ? '#fbbf24' : 'none'} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ position: 'relative' }}>
                                            <textarea
                                                readOnly={!canEditAdm}
                                                className="input-field"
                                                placeholder={canEditAdm ? "Seu feedback como gestor..." : "Aguardando avaliação..."}
                                                style={{
                                                    width: '100%',
                                                    minHeight: 60,
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.65rem',
                                                    resize: 'none',
                                                    background: canEditAdm ? '#f8fafc' : 'transparent',
                                                    border: canEditAdm ? '1px solid #e2e8f0' : 'none',
                                                    color: 'var(--text-primary)'
                                                }}
                                                value={answers[q.id]?.admComment || ''}
                                                onChange={e => handleAnswerChange(q.id, 'admComment', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ... (logic remains the same until return)

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px',
                animation: 'fadeIn 0.2s ease',
                overflowX: 'hidden'
            }}>
            <div
                className="modal-card"
                style={{
                    background: '#f8fafc',
                    width: '100%',
                    maxWidth: '600px',
                    height: evaluation.status === 'COMPLETED' ? '85vh' : 'auto',
                    maxHeight: '90vh',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px #f1f5f9',
                    animation: 'slideUp 0.3s ease',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                            {sectionLabels[currentSectionKey]}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0', fontSize: '0.7rem' }}>
                            {new Date(evaluation.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#e2e8f0',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper / Progress */}
                <div style={{
                    padding: '0 24px 20px',
                    margin: '20px 0 0',
                    display: 'flex',
                    gap: '6px',
                    justifyContent: 'center'
                }}>
                    {sections.map((_, idx) => (
                        <div key={idx} style={{
                            flex: 1,
                            height: '4px',
                            background: idx <= currentStep ? 'var(--accent-blue)' : '#e2e8f0',
                            borderRadius: '2px',
                            transition: 'all 0.3s ease'
                        }} />
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '0 12px 12px', overflowY: 'auto', flex: 1, overflowX: 'hidden' }}>
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        {renderContent()}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                        disabled={currentStep === 0}
                        style={{
                            padding: '10px 16px',
                            background: '#e2e8f0',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: currentStep === 0 ? 0.3 : 1
                        }}
                    >
                        <ChevronLeft size={16} /> Ant.
                    </button>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Etapa {currentStep + 1} de {sections.length}
                    </div>

                    {!isLastStep ? (
                        <button
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            style={{
                                padding: '10px 16px',
                                background: 'var(--accent-blue)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            Próximo <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={saving || isCompleted || (evaluation.status === 'PENDING_ADM' && !isAdmin) || (evaluation.status === 'PENDING_SELF' && isAdmin)}
                            style={{
                                padding: '10px 16px',
                                background: saving || isCompleted ? '#e2e8f0' : 'var(--accent-green)',
                                border: 'none',
                                borderRadius: '8px',
                                color: saving || isCompleted ? 'rgba(255,255,255,0.5)' : 'black',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: (saving || isCompleted) ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            {saving ? '...' : (isCompleted ? 'OK' : <><Save size={16} /> Salvar</>)}
                        </button>
                    )}
                </div>

                <style jsx>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .input-field:focus {
                        outline: none;
                        border-color: var(--accent-blue) !important;
                    }
                    @media (max-width: 640px) {
                        .modal-card {
                            max-width: 100% !important;
                            height: 98% !important;
                            max-height: 98% !important;
                            border-radius: 16px !important;
                        }
                        .modal-overlay {
                            padding: 8px !important;
                        }
                    }
                `}</style>
            </div>
        </div >
    );
}
