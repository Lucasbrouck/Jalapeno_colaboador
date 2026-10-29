'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import CompanySwitcher from './CompanySwitcher';
import {
    LayoutDashboard,
    Users,
    CalendarClock,
    FileSpreadsheet,
    Bike,
    GraduationCap,
    ShoppingBag,
    Settings,
    LogOut,
    ShieldCheck,
    Flame,
    BookOpen
} from 'lucide-react';

const NAV_SECTIONS = [
    {
        title: 'OPERAÇÃO & GESTÃO',
        items: [
            { href: '/', label: 'Visão Geral & Ao Vivo', icon: LayoutDashboard },
            { href: '/equipe', label: 'Equipe & Prontuários', icon: Users },
            { href: '/turnos', label: 'Turnos & Resultados', icon: CalendarClock },
            { href: '/folha', label: 'Folha de Ponto & PDF', icon: FileSpreadsheet },
            { href: '/entregadores', label: 'Entregadores', icon: Bike },
        ]
    },
    {
        title: 'CARREIRA & BENEFÍCIOS',
        items: [
            { href: '/desenvolvimento', label: 'PDI & Treinamentos', icon: GraduationCap },
            { href: '/loja', label: 'Loja Plata', icon: ShoppingBag },
        ]
    },
    {
        title: 'ADMINISTRAÇÃO',
        items: [
            { href: '/regulamento', label: 'Regulamento Interno', icon: BookOpen },
            { href: '/configuracoes', label: 'Configurações & Metas', icon: Settings },
        ]
    }
];

const ROUTE_TITLES = {
    '/': { title: 'Visão Geral & Operação Ao Vivo', subtitle: 'Acompanhamento em tempo real de check-ins, pendências de RH e indicadores' },
    '/equipe': { title: 'Gestão de Equipe & Colaboradores', subtitle: 'Quadro de funcionários, prontuários individuais, vales, faltas e documentos' },
    '/turnos': { title: 'Turnos, Faturamento & Métricas', subtitle: 'Lançamento de turnos Dia/Noite, sincronização Saipos e histórico mensal' },
    '/folha': { title: 'Folha de Ponto & Exportação', subtitle: 'Espelho de ponto mensal, feriados, fechamento do mês e geração de PDFs em lote' },
    '/entregadores': { title: 'Gestão de Entregadores', subtitle: 'Controle de entregadores terceirizados e internos, escalas, taxas e pagamentos' },
    '/desenvolvimento': { title: 'Desenvolvimento: PDI & Treinamentos', subtitle: 'Avaliações de desempenho, modelos de PDI e trilhas de capacitação' },
    '/loja': { title: 'Loja de Recompensas (Plata)', subtitle: 'Catálogo de benefícios corporativos e histórico de resgates' },
    '/regulamento': { title: 'Regulamento Interno — Jalapeño', subtitle: 'Cadastro, edição e organização dos artigos, normas operacionais e deveres contratuais' },
    '/configuracoes': { title: 'Configurações & Unidades', subtitle: 'Metas mensais, regras de assiduidade, localização GPS, Saipos e multi-empresa' },
};

export default function AppShell({ children }) {
    const pathname = usePathname();
    const { user, logout, loading } = useAuth();

    const publicRoutes = ['/login', '/reset-password', '/auth/link-account'];
    const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));

    if (isPublic) {
        return <>{children}</>;
    }

    const getRouteHeader = () => {
        if (pathname.startsWith('/equipe/') || pathname.startsWith('/admin/users/')) {
            return {
                title: 'Prontuário do Colaborador',
                subtitle: 'Visão 360º: Espelho de Ponto, Faltas, Vales, Documentos, PDI e Carteira Plata'
            };
        }
        return ROUTE_TITLES[pathname] || { title: 'Sistema de RH Jalapeño', subtitle: 'Painel Administrativo Desktop' };
    };

    const headerInfo = getRouteHeader();

    return (
        <div className="rh-shell">
            {/* Left Sidebar */}
            <aside className="rh-sidebar">
                {/* Unit Selector Header (replaces logo) */}
                <div style={{
                    height: 'var(--topbar-height)',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)',
                    position: 'relative',
                    zIndex: 200
                }}>
                    <CompanySwitcher />
                </div>

                {/* Navigation Links */}
                <nav style={{ flex: 1, padding: '18px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {NAV_SECTIONS.map(section => (
                        <div key={section.title}>
                            <div style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#94a3b8',
                                letterSpacing: '0.06em',
                                padding: '0 12px',
                                marginBottom: 8
                            }}>
                                {section.title}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {section.items.map(item => {
                                    const Icon = item.icon;
                                    const isActive = item.href === '/'
                                        ? pathname === '/'
                                        : pathname === item.href || pathname.startsWith(item.href + '/') || (item.href === '/equipe' && pathname.startsWith('/admin/users/'));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 11,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                fontSize: '0.875rem',
                                                fontWeight: isActive ? 700 : 500,
                                                color: isActive ? '#da291c' : '#475569',
                                                background: isActive ? '#fef2f2' : 'transparent',
                                                transition: 'all 0.15s ease',
                                                position: 'relative'
                                            }}
                                        >
                                            {isActive && (
                                                <span style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 6,
                                                    bottom: 6,
                                                    width: 3.5,
                                                    borderRadius: '0 4px 4px 0',
                                                    background: '#da291c'
                                                }} />
                                            )}
                                            <Icon size={18} color={isActive ? '#da291c' : '#64748b'} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User Footer */}
                <div style={{
                    padding: '14px 16px',
                    borderTop: '1px solid var(--border-color)',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0
                        }}>
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '0.825rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {user?.name || (loading ? 'Carregando...' : 'Administrador')}
                            </div>
                            <div style={{
                                fontSize: '0.7rem',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}>
                                <ShieldCheck size={11} color="#10b981" />
                                <span>{user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'manager' ? 'Gerente' : 'Administrador'}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        title="Sair do Sistema"
                        style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="rh-main-wrapper">
                {/* Sticky Topbar */}
                <header className="rh-topbar">
                    <div>
                        <h1 style={{
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: 0,
                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                        }}>
                            {headerInfo.title}
                        </h1>
                        <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0 }}>
                            {headerInfo.subtitle}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            fontSize: '0.8rem',
                            color: '#475569',
                            background: '#f1f5f9',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontWeight: 600
                        }}>
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                    </div>
                </header>

                {/* Page Workspace */}
                <main className="rh-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
