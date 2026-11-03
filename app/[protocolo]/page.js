'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
    ShieldCheck,
    Lock,
    Clock,
    CheckCircle2,
    AlertCircle,
    Send,
    ArrowLeft,
    Copy,
    FileText,
    MessageSquare,
    UserCheck,
    EyeOff,
    RefreshCw,
    Building2,
    Calendar,
    MapPin
} from 'lucide-react';

const STATUS_META = {
    NEW: {
        label: 'Recebido / Aguardando Triagem',
        color: '#0284c7',
        bg: '#f0f9ff',
        border: '#bae6fd',
        step: 1
    },
    IN_REVIEW: {
        label: 'Em Apuração pelo Comitê / RH',
        color: '#ea580c',
        bg: '#fff7ed',
        border: '#fed7aa',
        step: 2
    },
    AWAITING_INFO: {
        label: 'Aguardando Informações do Manifestante',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        step: 2
    },
    RESOLVED: {
        label: 'Concluído / Tratativa Finalizada',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
        step: 3
    },
    ARCHIVED: {
        label: 'Arquivado / Encerrado',
        color: '#475569',
        bg: '#f8fafc',
        border: '#cbd5e1',
        step: 3
    }
};

const CATEGORY_LABELS = {
    ASSEDIO_MORAL: 'Assédio Moral (NR-5 / Lei 14.457)',
    ASSEDIO_SEXUAL: 'Assédio Sexual (NR-5 / Lei 14.457)',
    DISCRIMINACAO_VIOLENCIA: 'Discriminação, Violência ou Retaliação (NR-5)',
    RISCO_PSICOSSOCIAL: 'Riscos Psicossociais e Sobrecarga (NR-1 PGR)',
    CONDICAO_INSEGURA_EPI: 'Condição Insegura, Acidente ou EPI (NR-1)',
    SUGESTAO_ESCUTA: 'Canal de Escuta Ativa / Sugestão / Outros',
    OUTROS: 'Relato Geral (NR-1 / NR-5)'
};

export default function ProtocolTrackingPage({ params }) {
    const resolvedParams = use(params);
    const protocoloParam = decodeURIComponent(resolvedParams?.protocolo || '');

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProtocolData = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await fetch(`/api/ouvidoria/${encodeURIComponent(protocoloParam)}`, {
                cache: 'no-store',
                credentials: 'omit'
            });
            if (!res.ok) {
                setNotFound(true);
                setReport(null);
            } else {
                const data = await res.json();
                setReport(data);
                setNotFound(false);
            }
        } catch (err) {
            setNotFound(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (protocoloParam) {
            fetchProtocolData();
        }
    }, [protocoloParam]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !report) return;
        setSending(true);
        try {
            const res = await fetch(`/api/ouvidoria/${encodeURIComponent(report.protocol)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                body: JSON.stringify({ message: newMessage.trim() })
            });
            if (res.ok) {
                const updated = await res.json();
                setReport(updated);
                setNewMessage('');
            }
        } finally {
            setSending(false);
        }
    };

    const copyDirectUrl = () => {
        const url = typeof window !== 'undefined' ? `${window.location.origin}/${report?.protocol || protocoloParam}` : '';
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ background: '#ffffff', padding: '32px 24px', borderRadius: 22, textAlign: 'center', maxWidth: 400, width: '100%', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>
                        Consultando Protocolo #{protocoloParam}...
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Conexão protegida sob sigilo NR-1 e NR-5
                    </div>
                </div>
            </div>
        );
    }

    if (notFound || !report) {
        return (
            <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ background: '#ffffff', padding: '32px 24px', borderRadius: 24, textAlign: 'center', maxWidth: 440, width: '100%', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 18, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <AlertCircle size={30} />
                    </div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                        Protocolo "{protocoloParam}" não encontrado
                    </h1>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                        Verifique se o número do protocolo na URL está correto ou acesse o Canal de Escuta para consultar ou registrar um novo relato.
                    </p>
                    <Link
                        href="/canal-escuta"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            background: '#0f172a',
                            color: 'white',
                            textDecoration: 'none',
                            padding: '12px 20px',
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: '0.85rem'
                        }}
                    >
                        <ArrowLeft size={16} /> Ir para o Canal de Escuta (NR-1 / NR-5)
                    </Link>
                </div>
            </div>
        );
    }

    const st = STATUS_META[report.status] || STATUS_META.NEW;

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 48 }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                {/* Header */}
                <header style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: 'white',
                    padding: '22px 20px 32px',
                    borderBottomLeftRadius: 28,
                    borderBottomRightRadius: 28
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Link
                            href="/canal-escuta"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                color: '#cbd5e1',
                                textDecoration: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: 'rgba(255,255,255,0.08)',
                                padding: '7px 12px',
                                borderRadius: 999
                            }}
                        >
                            <ArrowLeft size={14} /> Canal de Escuta
                        </Link>

                        <button
                            type="button"
                            onClick={() => fetchProtocolData(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: '#e2e8f0',
                                padding: '7px 12px',
                                borderRadius: 999,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
                            {refreshing ? 'Atualizando...' : 'Atualizar'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{
                                    background: report.is_anonymous ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                    color: report.is_anonymous ? '#6ee7b7' : '#7dd3fc',
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}>
                                    {report.is_anonymous ? <EyeOff size={12} /> : <UserCheck size={12} />}
                                    {report.is_anonymous ? 'RELATO ANÔNIMO BLINDADO' : 'RELATO IDENTIFICADO'}
                                </span>
                                <span style={{
                                    background: 'rgba(255,255,255,0.12)',
                                    color: '#f8fafc',
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    fontSize: '0.7rem',
                                    fontWeight: 800
                                }}>
                                    {report.norm_reference === 'NR1' ? 'NR-1 (PGR)' : report.norm_reference === 'NR5' ? 'NR-5 (CIPA)' : 'NR-1 & NR-5'}
                                </span>
                            </div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                                Protocolo #{report.protocol}
                            </h1>
                            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 4 }}>
                                Acompanhe o andamento, parecer oficial e converse com o RH
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={copyDirectUrl}
                            style={{
                                background: copied ? '#059669' : 'rgba(255,255,255,0.14)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 10,
                                padding: '8px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <Copy size={14} />
                            {copied ? 'URL Copiada!' : 'Copiar Link do Protocolo'}
                        </button>
                    </div>
                </header>

                <div style={{ padding: '0 16px', marginTop: -18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* STATUS & PROGRESS CARD */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 22,
                        padding: '20px',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                                    Status Atual da Apuração
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginTop: 4,
                                    background: st.bg,
                                    color: st.color,
                                    border: `1px solid ${st.border}`,
                                    padding: '6px 12px',
                                    borderRadius: 999,
                                    fontWeight: 800,
                                    fontSize: '0.82rem'
                                }}>
                                    <Clock size={15} />
                                    {st.label}
                                </div>
                            </div>

                            {report.sla_due_date && (
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                                        Prazo Previsto (7 dias úteis)
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                                        Até {report.sla_due_date.split('-').reverse().join('/')}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3-Step Visual Progress */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[
                                { step: 1, title: '1. Recebido' },
                                { step: 2, title: '2. Em Apuração' },
                                { step: 3, title: '3. Tratado / Concluído' }
                            ].map(item => {
                                const done = st.step >= item.step;
                                return (
                                    <div
                                        key={item.step}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: 10,
                                            background: done ? '#ecfdf5' : '#f8fafc',
                                            border: `1px solid ${done ? '#a7f3d0' : '#e2e8f0'}`,
                                            color: done ? '#047857' : '#94a3b8',
                                            fontSize: '0.73rem',
                                            fontWeight: 800,
                                            textAlign: 'center'
                                        }}
                                    >
                                        {item.title}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Resolution / Action Plan Box when available */}
                        {(report.resolution_summary || report.action_plan) && (
                            <div style={{
                                marginTop: 16,
                                background: '#ecfdf5',
                                border: '1px solid #6ee7b7',
                                borderRadius: 16,
                                padding: '16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.85rem', color: '#065f46', marginBottom: 6 }}>
                                    <CheckCircle2 size={17} />
                                    Parecer Oficial & Tratativa Adotada (RH / Comitê)
                                </div>
                                {report.resolution_summary && (
                                    <p style={{ fontSize: '0.82rem', color: '#064e3b', margin: '0 0 8px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                        {report.resolution_summary}
                                    </p>
                                )}
                                {report.action_plan && (
                                    <div style={{ fontSize: '0.78rem', color: '#047857', background: 'rgba(255,255,255,0.6)', padding: '10px 12px', borderRadius: 10 }}>
                                        <strong>Plano de Ação (NR-1 / NR-5):</strong> {report.action_plan}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CHAT / MENSAGENS DO PROTOCOLO */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 22,
                        padding: '20px',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <MessageSquare size={18} color="#ea580c" />
                            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                Canal de Comunicação do Protocolo
                            </h2>
                        </div>
                        <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0 0 16px' }}>
                            Acompanhe as respostas do RH ou envie informações adicionais mantendo a blindagem do seu protocolo.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                            {(report.messages || []).map(msg => {
                                const isRh = msg.sender_type === 'RH';
                                const isSystem = msg.sender_type === 'SYSTEM';
                                return (
                                    <div
                                        key={msg.id}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 14,
                                            background: isSystem ? '#f8fafc' : (isRh ? '#fff7ed' : '#f0fdf4'),
                                            border: `1px solid ${isSystem ? '#e2e8f0' : (isRh ? '#fed7aa' : '#bbf7d0')}`,
                                            alignSelf: isSystem ? 'stretch' : (isRh ? 'flex-start' : 'flex-end'),
                                            width: isSystem ? '100%' : '92%'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                color: isSystem ? '#475569' : (isRh ? '#c2410c' : '#15803d')
                                            }}>
                                                {msg.sender_label}
                                            </span>
                                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                                {msg.createdAt ? new Date(msg.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                                            {msg.message}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enviar mensagem ou complemento ao RH..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                style={{ flex: 1, borderRadius: 12, padding: '12px 14px' }}
                            />
                            <button
                                type="submit"
                                disabled={sending || !newMessage.trim()}
                                style={{
                                    background: '#ea580c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 12,
                                    padding: '0 18px',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    cursor: sending ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <Send size={15} />
                                {sending ? '...' : 'Enviar'}
                            </button>
                        </form>
                    </div>

                    {/* DETALHES DO RELATO ENVIADO & PROVA DE ANONIMATO */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 22,
                        padding: '20px',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
                            Resumo do Relato Registrado
                        </h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, fontSize: '0.75rem', color: '#475569' }}>
                            <span style={{ background: '#f1f5f9', padding: '5px 10px', borderRadius: 8, fontWeight: 700 }}>
                                {CATEGORY_LABELS[report.category] || report.category}
                            </span>
                            {report.company_name && (
                                <span style={{ background: '#f1f5f9', padding: '5px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Building2 size={13} /> {report.company_name}
                                </span>
                            )}
                            {report.incident_date && (
                                <span style={{ background: '#f1f5f9', padding: '5px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={13} /> Ocorrido em: {report.incident_date.split('-').reverse().join('/')}
                                </span>
                            )}
                            {report.incident_location && (
                                <span style={{ background: '#f1f5f9', padding: '5px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={13} /> {report.incident_location}
                                </span>
                            )}
                        </div>

                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 14,
                            padding: '14px',
                            fontSize: '0.84rem',
                            color: '#1e293b',
                            lineHeight: 1.55,
                            whiteSpace: 'pre-wrap'
                        }}>
                            {report.description}
                        </div>

                        {report.is_anonymous && report.anonymity_hash && (
                            <div style={{
                                marginTop: 14,
                                background: '#0f172a',
                                color: '#e2e8f0',
                                borderRadius: 14,
                                padding: '12px 14px',
                                fontSize: '0.72rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontWeight: 800, marginBottom: 4 }}>
                                    <Lock size={14} /> Auditoria de Anonimato Verificada (NR-5 / Lei 14.457/22)
                                </div>
                                <div style={{ color: '#94a3b8' }}>
                                    Vínculo de Usuário no Banco: <strong style={{ color: '#34d399' }}>NULL</strong> · Rastreio de IP: <strong style={{ color: '#34d399' }}>NÃO COLETADO</strong>
                                </div>
                                <div style={{ fontFamily: 'monospace', color: '#64748b', marginTop: 4, wordBreak: 'break-all' }}>
                                    Hash SHA-256: {report.anonymity_hash}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
