'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Store, ChevronsUpDown, Check } from 'lucide-react';

export default function CompanySwitcher() {
    const { user, allowedCompanies, companies, switchCompany } = useAuth();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    if (!user) return null;

    const list = allowedCompanies && allowedCompanies.length > 0 ? allowedCompanies : companies;
    const currentCompany = list?.find(c => String(c.id) === String(user.company_id)) || list?.[0];

    if (!list || list.length === 0) return null;

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                position: 'relative'
            }}
        >
            {/* Ícone do prédio/casa fora da caixa */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                flexShrink: 0,
                paddingLeft: 2
            }}>
                <Home size={20} strokeWidth={2} />
            </div>

            {/* Botão Trigger do Dropdown */}
            <button
                type="button"
                onClick={() => list.length > 1 && setOpen(prev => !prev)}
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: open ? '#ffffff' : '#f8fafc',
                    border: open ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                    boxShadow: open ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: list.length > 1 ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                }}
            >
                <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {currentCompany?.name || 'Selecionar Unidade'}
                </span>
                {list.length > 1 && (
                    <ChevronsUpDown size={15} color="#64748b" style={{ flexShrink: 0 }} />
                )}
            </button>

            {/* Menu Dropdown Customizado */}
            {open && list.length > 1 && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 28,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.14), 0 4px 10px -2px rgba(15, 23, 42, 0.06)',
                    padding: 6,
                    zIndex: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}>
                    {list.map(company => {
                        const isSelected = String(company.id) === String(user.company_id);
                        return (
                            <button
                                key={company.id}
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    if (!isSelected) {
                                        switchCompany(company.id);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: isSelected ? '#f1f5f9' : 'transparent',
                                    color: '#0f172a',
                                    fontSize: '0.86rem',
                                    fontWeight: isSelected ? 700 : 500,
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.12s ease'
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <Store size={17} color={isSelected ? '#da291c' : '#334155'} style={{ flexShrink: 0 }} />
                                    <span style={{ lineHeight: 1.25 }}>
                                        {company.name}
                                    </span>
                                </div>
                                {isSelected && (
                                    <Check size={15} color="#da291c" style={{ flexShrink: 0 }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
