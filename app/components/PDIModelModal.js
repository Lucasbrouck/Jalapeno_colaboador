'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';

export default function PDIModelModal({ isOpen, onClose, onSave, initialData }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setDescription(initialData.description || '');
            } else {
                setTitle('');
                setDescription('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ title, description });
    };

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999, // High z-index to be sure
            padding: '16px',
            animation: 'fadeIn 0.2s ease'
        }}
            onClick={(e) => {
                // Close if clicking outside the modal content (optional, but good UX)
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div style={{
                background: '#f8fafc',
                width: '100%',
                maxWidth: '500px',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px #f1f5f9',
                position: 'relative',
                animation: 'slideUp 0.3s ease',
                overflow: 'hidden'
            }}
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="h3" style={{ margin: 0 }}>
                        {initialData ? 'Editar Modelo' : 'Novo Modelo'}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Nome do Modelo</label>
                            <input
                                className="input-field"
                                placeholder="Ex: Liderança, Operacional, Padrão..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Descrição (Opcional)</label>
                            <textarea
                                className="input-field"
                                placeholder="Breve descrição sobre a finalidade deste modelo..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn"
                                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={!title.trim()}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <Save size={18} />
                                Salvar
                            </button>
                        </div>
                    </form>
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
                `}</style>
            </div>
        </div>,
        document.body
    );
}
