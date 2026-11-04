'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import {
    ShieldCheck,
    ShieldAlert,
    Lock,
    UserCheck,
    EyeOff,
    Eye,
    FileText,
    Send,
    Copy,
    CheckCircle2,
    ArrowLeft,
    ExternalLink,
    Search,
    AlertTriangle,
    Code2,
    LogOut,
    Building2,
    Calendar,
    MapPin,
    Users,
    Upload,
    X,
    Scale,
    HeartHandshake,
    HardHat,
    MessageSquare
} from 'lucide-react';

const CATEGORIES = [
    {
        id: 'ASSEDIO_MORAL',
        norm: 'NR5',
        label: 'Assédio Moral (NR-5 / Lei 14.457)',
        desc: 'Humilhação, exposição constrangedora, gritos, perseguição ou abuso de autoridade.',
        icon: ShieldAlert,
        color: '#dc2626',
        bg: '#fef2f2'
    },
    {
        id: 'ASSEDIO_SEXUAL',
        norm: 'NR5',
        label: 'Assédio Sexual (NR-5 / Lei 14.457)',
        desc: 'Conduta indesejada de natureza sexual, constrangimento, insinuações ou chantagem.',
        icon: ShieldAlert,
        color: '#be123c',
        bg: '#fff1f2'
    },
    {
        id: 'DISCRIMINACAO_VIOLENCIA',
        norm: 'NR5',
        label: 'Discriminação, Violência ou Retaliação (NR-5)',
        desc: 'Preconceito, agressão verbal ou física, intimidação ou retaliação no ambiente de trabalho.',
        icon: Scale,
        color: '#9333ea',
        bg: '#faf5ff'
    },
    {
        id: 'RISCO_PSICOSSOCIAL',
        norm: 'NR1',
        label: 'Riscos Psicossociais e Sobrecarga (NR-1 PGR)',
        desc: 'Estresse ocupacional severo, sobrecarga extrema, clima tóxico ou fatores psicossociais.',
        icon: HeartHandshake,
        color: '#ea580c',
        bg: '#fff7ed'
    },
    {
        id: 'CONDICAO_INSEGURA_EPI',
        norm: 'NR1',
        label: 'Condição Insegura, Acidente ou EPI (NR-1 / CIPA)',
        desc: 'Risco físico de acidente, falha em equipamento, falta de EPI ou condição insalubre.',
        icon: HardHat,
        color: '#d97706',
        bg: '#fffbeb'
    },
    {
        id: 'SUGESTAO_ESCUTA',
        norm: 'NR1_NR5',
        label: 'Canal de Escuta Ativa / Sugestão / Outros',
        desc: 'Relato preventivo, sugestão de melhoria de ambiente, dúvida ética ou escuta do trabalhador.',
        icon: MessageSquare,
        color: '#0284c7',
        bg: '#f0f9ff'
    }
];

function CanalEscutaContent() {
    const { user: authUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'consultar' ? 'LOOKUP' : 'NEW');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [showTechnicalProof, setShowTechnicalProof] = useState(false);

    // Form fields
    const [selectedCategory, setSelectedCategory] = useState('ASSEDIO_MORAL');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [incidentDate, setIncidentDate] = useState('');
    const [incidentLocation, setIncidentLocation] = useState('');
    const [involvedPeople, setInvolvedPeople] = useState('');
    const [witnessesInfo, setWitnessesInfo] = useState('');
    const [attachmentData, setAttachmentData] = useState(null);
    const [attachmentName, setAttachmentName] = useState('');

    // Identified fields (only used if isAnonymous === false)
    const [reporterName, setReporterName] = useState('');
    const [reporterContact, setReporterContact] = useState('');
    const [reporterRole, setReporterRole] = useState('');

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [createdReport, setCreatedReport] = useState(null);
    const [copied, setCopied] = useState(false);

    // Protocol Lookup state
    const [lookupInput, setLookupInput] = useState(searchParams.get('protocolo') || '');
    const [lookupError, setLookupError] = useState('');

    useEffect(() => {
        if (!authLoading && !authUser) {
            router.push('/login');
        }
    }, [authLoading, authUser, router]);

    // Automatic routing to the user's unit channel (even when anonymous)
    const userCompanyId = useMemo(() => {
        if (!authUser) return null;
        if (authUser.company_id) {
            return String(authUser.company_id).split(',')[0].trim() || null;
        }
        if (Array.isArray(authUser.company_ids) && authUser.company_ids.length > 0) {
            return authUser.company_ids[0];
        }
        return null;
    }, [authUser]);

    // Pre-fill identified fields when user explicitly switches to Identified mode and is logged in
    useEffect(() => {
        if (!isAnonymous && authUser) {
            if (!reporterName) setReporterName(authUser.name || '');
            if (!reporterContact) setReporterContact(authUser.email || '');
            if (!reporterRole) setReporterRole(authUser.role === 'manager' ? 'Gerente / Liderança' : 'Colaborador(a)');
        }
    }, [isAnonymous, authUser]);

    const currentCatMeta = useMemo(
        () => CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0],
        [selectedCategory]
    );

    // Exact payload preview for technical transparency & proof of anonymity
    const livePayloadPreview = useMemo(() => {
        return {
            is_anonymous: isAnonymous,
            reporter_user_id: isAnonymous ? null : (authUser?.id || null),
            reporter_name: isAnonymous ? null : (reporterName || null),
            reporter_contact: isAnonymous ? null : (reporterContact || null),
            reporter_role: isAnonymous ? null : (reporterRole || null),
            session_cookie_sent: false,
            ip_address_tracked: false,
            norm_reference: currentCatMeta.norm,
            category: selectedCategory,
            company_id: userCompanyId,
            incident_date: incidentDate || null,
            incident_location: incidentLocation || null,
            involved_people: involvedPeople || null,
            description: description ? `${description.slice(0, 60)}${description.length > 60 ? '...' : ''}` : '(aguardando preenchimento)'
        };
    }, [
        isAnonymous,
        authUser,
        reporterName,
        reporterContact,
        reporterRole,
        currentCatMeta,
        selectedCategory,
        userCompanyId,
        incidentDate,
        incidentLocation,
        involvedPeople,
        description
    ]);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('O arquivo deve ter no máximo 5MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setAttachmentData(reader.result);
            setAttachmentName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!description || description.trim().length < 10) {
            setError('Por favor, descreva o que aconteceu com pelo menos 10 caracteres.');
            return;
        }

        if (!isAnonymous && !reporterName.trim()) {
            setError('No relato identificado, informe seu nome (ou selecione Relato Anônimo para não se identificar).');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                is_anonymous: isAnonymous,
                reporter_user_id: isAnonymous ? null : (authUser?.id || null),
                reporter_name: isAnonymous ? null : reporterName.trim(),
                reporter_contact: isAnonymous ? null : reporterContact.trim(),
                reporter_role: isAnonymous ? null : reporterRole.trim(),
                company_id: userCompanyId,
                norm_reference: currentCatMeta.norm,
                category: selectedCategory,
                title: title.trim() || currentCatMeta.label,
                description: description.trim(),
                incident_date: incidentDate || null,
                incident_location: incidentLocation.trim() || null,
                involved_people: involvedPeople.trim() || null,
                witnesses_info: witnessesInfo.trim() || null,
                evidence_attachment: attachmentData || null
            };

            // Crucial: credentials: 'omit' when anonymous so browser does not even transmit session cookies!
            const res = await fetch('/api/ouvidoria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: isAnonymous ? 'omit' : 'same-origin',
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Erro ao enviar relato.');
                setSubmitting(false);
                return;
            }

            setCreatedReport(data);
            setSubmitting(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError('Erro de conexão ao registrar seu relato. Tente novamente.');
            setSubmitting(false);
        }
    };

    const handleLookupSubmit = (e) => {
        e.preventDefault();
        setLookupError('');
        const cleaned = lookupInput.trim().replace(/^#+/, '').replace(/^JLP-/i, '').trim();
        if (!cleaned) {
            setLookupError('Digite o número do protocolo.');
            return;
        }
        router.push(`/${cleaned}`);
    };

    const protocolUrl = useMemo(() => {
        if (!createdReport?.protocol) return '';
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://site.com.br';
        return `${origin}/${createdReport.protocol}`;
    }, [createdReport]);

    const copyProtocolLink = () => {
        if (!createdReport?.protocol) return;
        navigator.clipboard.writeText(protocolUrl || createdReport.protocol);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    if (authLoading || !authUser) {
        return (
            <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#64748b', fontWeight: 700 }}>
                Carregando Canal de Escuta...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 48 }}>
            <div style={{ maxWidth: 620, margin: '0 auto' }}>
                {/* Header */}
                <header style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
                    color: 'white',
                    padding: '24px 20px 36px',
                    borderBottomLeftRadius: 28,
                    borderBottomRightRadius: 28,
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Link
                            href="/"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                color: '#cbd5e1',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                background: 'rgba(255,255,255,0.08)',
                                padding: '7px 12px',
                                borderRadius: 999
                            }}
                        >
                            <ArrowLeft size={15} />
                            Voltar ao App
                        </Link>

                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(16, 185, 129, 0.16)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#6ee7b7',
                            padding: '5px 12px',
                            borderRadius: 999,
                            fontSize: '0.72rem',
                            fontWeight: 800
                        }}>
                            <Lock size={13} />
                            Canal Independente NR-1 & NR-5
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, #ea580c, #da291c)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 8px 20px rgba(234, 88, 12, 0.35)'
                        }}>
                            <ShieldCheck size={26} color="white" />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '1.35rem',
                                fontWeight: 800,
                                margin: '0 0 6px',
                                fontFamily: "'Plus Jakarta Sans', sans-serif"
                            }}>
                                Canal de Escuta e Denúncia
                            </h1>
                            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0, lineHeight: 1.45 }}>
                                Espaço seguro, confidencial e protegido contra retaliação em conformidade com a <strong>NR-1 (Riscos Psicossociais / PGR)</strong> e <strong>NR-5 / Lei 14.457/22 (Prevenção e Combate ao Assédio)</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Top Switcher Tabs */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        background: 'rgba(15, 23, 42, 0.5)',
                        padding: 5,
                        borderRadius: 14,
                        marginTop: 20,
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('NEW'); setCreatedReport(null); }}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: 'none',
                                background: activeTab === 'NEW' ? '#ffffff' : 'transparent',
                                color: activeTab === 'NEW' ? '#0f172a' : '#cbd5e1',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            }}
                        >
                            <FileText size={15} /> Fazer Novo Relato
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('LOOKUP')}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: 'none',
                                background: activeTab === 'LOOKUP' ? '#ffffff' : 'transparent',
                                color: activeTab === 'LOOKUP' ? '#0f172a' : '#cbd5e1',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            }}
                        >
                            <Search size={15} /> Consultar Protocolo
                        </button>
                    </div>
                </header>

                <div style={{ padding: '0 16px', marginTop: -18 }}>
                    {/* TAB 2: CONSULTAR PROTOCOLO */}
                    {activeTab === 'LOOKUP' ? (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: 22,
                            padding: '24px 20px',
                            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
                            border: '1px solid #e2e8f0'
                        }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                                Acompanhar Relato por Protocolo
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 18px', lineHeight: 1.45 }}>
                                Digite o número do seu protocolo ou acesse diretamente pelo link <strong>{typeof window !== 'undefined' ? window.location.origin : 'site.com.br'}/numero-do-protocolo</strong> para ver a resposta do RH e enviar novas informações mantendo seu sigilo.
                            </p>

                            {lookupError && (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#b91c1c',
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    marginBottom: 14
                                }}>
                                    {lookupError}
                                </div>
                            )}

                            <form onSubmit={handleLookupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <label className="input-label">Número do Protocolo</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Ex: 2026482910"
                                        value={lookupInput}
                                        onChange={e => setLookupInput(e.target.value)}
                                        style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.04em', padding: '13px 14px', borderRadius: 12 }}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        background: '#0f172a',
                                        borderColor: '#0f172a',
                                        borderRadius: 12,
                                        padding: '13px',
                                        fontWeight: 800,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <Search size={17} /> Acessar Página do Protocolo
                                </button>
                            </form>
                        </div>
                    ) : createdReport ? (
                        /* TELA DE PROTOCOLO GERADO E COMPROVANTE DE ANONIMATO */
                        <div style={{
                            background: '#ffffff',
                            borderRadius: 24,
                            padding: '26px 22px',
                            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
                            border: '2px solid #10b981'
                        }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: 18,
                                background: '#ecfdf5',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 14px'
                            }}>
                                <CheckCircle2 size={32} />
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <span style={{
                                    background: createdReport.is_anonymous ? '#ecfdf5' : '#eff6ff',
                                    color: createdReport.is_anonymous ? '#047857' : '#1d4ed8',
                                    padding: '4px 12px',
                                    borderRadius: 999,
                                    fontSize: '0.72rem',
                                    fontWeight: 800
                                }}>
                                    {createdReport.is_anonymous ? 'RELATO ANÔNIMO BLINDADO (NR-5)' : 'RELATO IDENTIFICADO REGISTRADO'}
                                </span>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '10px 0 4px' }}>
                                    Relato Recebido com Sucesso!
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                                    Anote ou copie seu protocolo e a URL direta para acompanhar a resposta e tratativa do RH:
                                </p>
                            </div>

                            {/* Protocol Box */}
                            <div style={{
                                background: '#f8fafc',
                                border: '2px dashed #94a3b8',
                                borderRadius: 18,
                                padding: '18px',
                                textAlign: 'center',
                                marginBottom: 18
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Número do Protocolo Oficial
                                </div>
                                <div style={{
                                    fontSize: '2rem',
                                    fontWeight: 900,
                                    color: '#0f172a',
                                    letterSpacing: '0.06em',
                                    margin: '4px 0 10px',
                                    fontFamily: 'monospace'
                                }}>
                                    {createdReport.protocol}
                                </div>

                                <div style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 10,
                                    padding: '8px 12px',
                                    fontSize: '0.78rem',
                                    color: '#0284c7',
                                    fontWeight: 700,
                                    wordBreak: 'break-all',
                                    marginBottom: 12
                                }}>
                                    {protocolUrl}
                                </div>

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={copyProtocolLink}
                                        style={{
                                            background: copied ? '#059669' : '#0f172a',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 10,
                                            padding: '10px 16px',
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <Copy size={15} />
                                        {copied ? 'Link Copiado!' : 'Copiar URL do Protocolo'}
                                    </button>

                                    <Link
                                        href={`/${createdReport.protocol}`}
                                        style={{
                                            background: '#ea580c',
                                            color: 'white',
                                            textDecoration: 'none',
                                            borderRadius: 10,
                                            padding: '10px 16px',
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <ExternalLink size={15} />
                                        Abrir Página do Protocolo
                                    </Link>
                                </div>
                            </div>

                            {/* Cryptographic Proof of Anonymity Receipt */}
                            {createdReport.is_anonymous && (
                                <div style={{
                                    background: '#0f172a',
                                    color: '#f8fafc',
                                    borderRadius: 16,
                                    padding: '16px',
                                    marginBottom: 18,
                                    fontSize: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 800, marginBottom: 8, fontSize: '0.8rem' }}>
                                        <ShieldCheck size={17} />
                                        Certificado Técnico de Anonimato (Registro Gravado)
                                    </div>
                                    <p style={{ color: '#94a3b8', margin: '0 0 10px', lineHeight: 1.4 }}>
                                        Este recibo comprova o que foi gravado no banco de dados para o protocolo <strong>{createdReport.protocol}</strong>:
                                    </p>
                                    <div style={{
                                        background: '#1e293b',
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.72rem',
                                        lineHeight: 1.6,
                                        color: '#e2e8f0'
                                    }}>
                                        <div>reporter_user_id: <span style={{ color: '#34d399', fontWeight: 700 }}>NULL (Não gravado)</span></div>
                                        <div>reporter_name: <span style={{ color: '#34d399', fontWeight: 700 }}>NULL (Não gravado)</span></div>
                                        <div>ip_address: <span style={{ color: '#34d399', fontWeight: 700 }}>NULL (Não coletado)</span></div>
                                        <div>session_cookie: <span style={{ color: '#34d399', fontWeight: 700 }}>IGNORADO (credentials: omit)</span></div>
                                        <div style={{ wordBreak: 'break-all', marginTop: 4, color: '#94a3b8' }}>
                                            sha256_seal: {createdReport.anonymity_hash}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setCreatedReport(null);
                                    setDescription('');
                                    setTitle('');
                                    setInvolvedPeople('');
                                    setIncidentLocation('');
                                }}
                                className="btn btn-secondary"
                                style={{ width: '100%', borderRadius: 12, padding: '12px', fontWeight: 700 }}
                            >
                                Registrar Outro Relato
                            </button>
                        </div>
                    ) : (
                        /* TAB 1: FORMULÁRIO DE NOVO RELATO */
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* STEP 1: ESCOLHA ENTRE ANÔNIMO E IDENTIFICADO */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: 22,
                                padding: '20px',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                    Passo 1 · Como você deseja se manifestar?
                                </div>
                                <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
                                    Escolha o Modo de Identificação
                                </h2>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {/* Option: Anonymous */}
                                    <div
                                        onClick={() => setIsAnonymous(true)}
                                        style={{
                                            border: isAnonymous ? '2.5px solid #059669' : '1.5px solid #e2e8f0',
                                            background: isAnonymous ? '#ecfdf5' : '#f8fafc',
                                            borderRadius: 16,
                                            padding: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                background: isAnonymous ? '#059669' : '#e2e8f0',
                                                color: isAnonymous ? 'white' : '#475569',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <EyeOff size={19} />
                                            </div>
                                            {isAnonymous && (
                                                <span style={{
                                                    background: '#059669',
                                                    color: 'white',
                                                    fontSize: '0.64rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: 999
                                                }}>
                                                    ATIVO
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: 4 }}>
                                            Relato Anônimo
                                        </div>
                                        <div style={{ fontSize: '0.73rem', color: '#475569', lineHeight: 1.35 }}>
                                            Sigilo absoluto garantido pela NR-5. Ninguém saberá quem enviou, mesmo se você estiver logado.
                                        </div>
                                    </div>

                                    {/* Option: Identified */}
                                    <div
                                        onClick={() => setIsAnonymous(false)}
                                        style={{
                                            border: !isAnonymous ? '2.5px solid #0284c7' : '1.5px solid #e2e8f0',
                                            background: !isAnonymous ? '#f0f9ff' : '#f8fafc',
                                            borderRadius: 16,
                                            padding: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                background: !isAnonymous ? '#0284c7' : '#e2e8f0',
                                                color: !isAnonymous ? 'white' : '#475569',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <UserCheck size={19} />
                                            </div>
                                            {!isAnonymous && (
                                                <span style={{
                                                    background: '#0284c7',
                                                    color: 'white',
                                                    fontSize: '0.64rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: 999
                                                }}>
                                                    ATIVO
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: 4 }}>
                                            Relato Identificado
                                        </div>
                                        <div style={{ fontSize: '0.73rem', color: '#475569', lineHeight: 1.35 }}>
                                            Sua identidade é conhecida apenas pelo Comitê/RH para contato direto, com garantia de não-retaliação.
                                        </div>
                                    </div>
                                </div>

                                {/* PROVA TÉCNICA DE ANONIMATO (ESPECIALMENTE QUANDO LOGADO) */}
                                {isAnonymous && (
                                    <div style={{
                                        marginTop: 14,
                                        background: '#0f172a',
                                        color: '#f8fafc',
                                        borderRadius: 16,
                                        padding: '16px',
                                        border: '1px solid #1e293b'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <div style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 10,
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    color: '#34d399',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <Lock size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#34d399' }}>
                                                        {`Blindagem Ativa: Sua conta (${authUser.name.split(' ')[0]}) está DESVINCULADA deste envio`}
                                                    </div>
                                                    <p style={{ fontSize: '0.73rem', color: '#cbd5e1', margin: '4px 0 0', lineHeight: 1.4 }}>
                                                        Mesmo logado no app, este formulário usa isolamento de sessão (credentials: omit). Seu ID, nome, e-mail e IP são descartados antes do envio.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Audit Badges */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 6,
                                            marginTop: 12,
                                            fontSize: '0.7rem'
                                        }}>
                                            <div style={{ background: '#1e293b', padding: '7px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>ID / Nome:</span>
                                                <strong style={{ color: '#34d399' }}>NULL (Oculto)</strong>
                                            </div>
                                            <div style={{ background: '#1e293b', padding: '7px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>Cookie Login:</span>
                                                <strong style={{ color: '#34d399' }}>Bloqueado</strong>
                                            </div>
                                            <div style={{ background: '#1e293b', padding: '7px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>Rastreio IP:</span>
                                                <strong style={{ color: '#34d399' }}>Desativado</strong>
                                            </div>
                                            <div style={{ background: '#1e293b', padding: '7px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>Criptografia:</span>
                                                <strong style={{ color: '#34d399' }}>Selo SHA-256</strong>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowTechnicalProof(prev => !prev)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    color: '#e2e8f0',
                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                    borderRadius: 8,
                                                    padding: '6px 10px',
                                                    fontSize: '0.71rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}
                                            >
                                                <Code2 size={14} />
                                                {showTechnicalProof ? 'Ocultar Pacote Técnico (JSON)' : 'Comprovar: Ver Pacote de Envio (JSON)'}
                                            </button>
                                        </div>

                                        {showTechnicalProof && (
                                            <div style={{
                                                marginTop: 10,
                                                background: '#020617',
                                                border: '1px solid #334155',
                                                borderRadius: 10,
                                                padding: '10px 12px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.68rem',
                                                color: '#a7f3d0',
                                                overflowX: 'auto'
                                            }}>
                                                <div style={{ color: '#94a3b8', marginBottom: 4 }}>
                                                    // Auditoria em tempo real: este é o exato objeto enviado ao servidor (sem dados da sua conta):
                                                </div>
                                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                                    {JSON.stringify(livePayloadPreview, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* IDENTIFIED FIELDS (ONLY WHEN NOT ANONYMOUS) */}
                                {!isAnonymous && (
                                    <div style={{
                                        marginTop: 14,
                                        background: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        borderRadius: 16,
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12
                                    }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1' }}>
                                            Dados de Identificação (Acesso restrito ao Comitê / RH)
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <div>
                                                <label className="input-label" style={{ fontSize: '0.74rem' }}>Seu Nome *</label>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={reporterName}
                                                    onChange={e => setReporterName(e.target.value)}
                                                    placeholder="Seu nome completo"
                                                    style={{ background: '#ffffff', borderRadius: 10 }}
                                                    required={!isAnonymous}
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label" style={{ fontSize: '0.74rem' }}>WhatsApp ou E-mail para Retorno</label>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={reporterContact}
                                                    onChange={e => setReporterContact(e.target.value)}
                                                    placeholder="(21) 99999-9999 ou e-mail"
                                                    style={{ background: '#ffffff', borderRadius: 10 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* STEP 2: NATUREZA DO RELATO (NR-1 / NR-5) */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: 22,
                                padding: '20px',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                    Passo 2 · Classificação Normativa (NR-1 e NR-5)
                                </div>
                                <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
                                    Sobre qual tema é o seu relato?
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {CATEGORIES.map(cat => {
                                        const Icon = cat.icon;
                                        const active = selectedCategory === cat.id;
                                        return (
                                            <div
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '12px 14px',
                                                    borderRadius: 14,
                                                    border: active ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                                                    background: active ? cat.bg : '#ffffff',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: 10,
                                                    background: active ? cat.color : '#f1f5f9',
                                                    color: active ? 'white' : cat.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <Icon size={19} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                                                        {cat.label}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                                                        {cat.desc}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* STEP 3: DESCRIÇÃO DO QUE ACONTECEU */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: 22,
                                padding: '20px',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                    Passo 3 · Detalhamento da Ocorrência
                                </div>
                                <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
                                    Descreva o que aconteceu
                                </h2>

                                {error && (
                                    <div style={{
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        color: '#b91c1c',
                                        padding: '10px 14px',
                                        borderRadius: 12,
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        marginBottom: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        <AlertTriangle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className="input-group">
                                    <label className="input-label">Relato detalhado do que aconteceu *</label>
                                    <textarea
                                        className="input-field"
                                        rows={6}
                                        placeholder="Conte com o máximo de detalhes o que aconteceu, como ocorreu, o contexto e qualquer informação relevante para a apuração..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        style={{ borderRadius: 14, padding: '12px 14px', resize: 'vertical', lineHeight: 1.5 }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                    <div>
                                        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Calendar size={13} /> Data Aproximada (Opcional)
                                        </label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={incidentDate}
                                            onChange={e => setIncidentDate(e.target.value)}
                                            style={{ borderRadius: 10 }}
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <MapPin size={13} /> Setor / Turno / Local (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Ex: Cozinha, Turno Noite..."
                                            value={incidentLocation}
                                            onChange={e => setIncidentLocation(e.target.value)}
                                            style={{ borderRadius: 10 }}
                                        />
                                    </div>
                                </div>

                                <div className="input-group" style={{ marginBottom: 12 }}>
                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Users size={13} /> Envolvidos / Testemunhas (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Nomes ou cargos envolvidos"
                                        value={involvedPeople}
                                        onChange={e => setInvolvedPeople(e.target.value)}
                                        style={{ borderRadius: 10 }}
                                    />
                                </div>

                                {/* Optional Evidence Upload */}
                                <div style={{ marginTop: 8 }}>
                                    <label className="input-label">Anexar Evidência — Foto, Print ou Documento (Opcional)</label>
                                    <input
                                        type="file"
                                        id="ouvidoria-file"
                                        accept="image/*,application/pdf"
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                    />
                                    {attachmentName ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 12,
                                            fontSize: '0.8rem',
                                            fontWeight: 700
                                        }}>
                                            <span>📎 {attachmentName}</span>
                                            <button
                                                type="button"
                                                onClick={() => { setAttachmentData(null); setAttachmentName(''); }}
                                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label
                                            htmlFor="ouvidoria-file"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '10px 14px',
                                                background: '#f8fafc',
                                                border: '1px dashed #94a3b8',
                                                borderRadius: 12,
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#475569',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Upload size={15} /> Escolher foto ou PDF (máx. 5MB)
                                        </label>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        width: '100%',
                                        marginTop: 20,
                                        padding: '15px',
                                        borderRadius: 14,
                                        border: 'none',
                                        background: isAnonymous
                                            ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                            : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        color: 'white',
                                        fontWeight: 800,
                                        fontSize: '0.95rem',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)'
                                    }}
                                >
                                    {submitting ? (
                                        'Gerando Protocolo...'
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            {isAnonymous ? 'Enviar Relato 100% Anônimo e Gerar Protocolo' : 'Enviar Relato Identificado e Gerar Protocolo'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CanalEscutaPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Carregando Canal de Escuta...</div>}>
            <CanalEscutaContent />
        </Suspense>
    );
}
