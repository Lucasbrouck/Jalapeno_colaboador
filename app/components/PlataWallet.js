'use client';

import { useState, useEffect } from 'react';
import { Coins, Send, ArrowUpRight, ArrowDownLeft, CheckCircle, ShoppingBag } from 'lucide-react';
import { formatLocalDate } from '@/lib/dateUtils';
import TransferModal from './TransferModal';
import StoreModal from './StoreModal';

export default function PlataWallet({ userId }) {
    const [balance, setBalance] = useState(0);
    const [users, setUsers] = useState([]);
    const [history, setHistory] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showStore, setShowStore] = useState(false);
    const [filter, setFilter] = useState('all'); // all, sent, received

    const safeJson = async (res, fallback = []) => {
        if (!res || !res.ok) return fallback;
        try {
            const text = await res.text();
            return text ? JSON.parse(text) : fallback;
        } catch {
            return fallback;
        }
    };

    const fetchData = async () => {
        if (!userId) return;
        const usersRes = await fetch('/api/users');
        const usersData = await safeJson(usersRes, []);
        const currentUser = Array.isArray(usersData) ? usersData.find(u => u.id === userId) : null;
        setBalance(currentUser?.plataBalance || 0);

        const recipientsRes = await fetch(`/api/plata/users?currentUserId=${userId}`);
        const recipientsData = await safeJson(recipientsRes, []);
        setUsers(Array.isArray(recipientsData) ? recipientsData : []);

        const historyRes = await fetch(`/api/plata/history?userId=${userId}`);
        const historyData = await safeJson(historyRes, []);
        setHistory(Array.isArray(historyData) ? historyData : []);
    };

    useEffect(() => {
        fetchData();
    }, [userId]);

    const handleTransferSuccess = async () => {
        setShowSuccess(true);
        await fetchData();
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const filteredHistory = history.filter(tx => {
        if (filter === 'sent') return tx.fromUserId === userId;
        if (filter === 'received') return tx.toUserId === userId;
        return true;
    });

    return (
        <div>
            <TransferModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                users={users}
                balance={balance}
                userId={userId}
                onSuccess={handleTransferSuccess}
            />

            <StoreModal
                isOpen={showStore}
                onClose={() => setShowStore(false)}
                userId={userId}
                balance={balance}
                onSuccess={fetchData}
            />

            {showSuccess && (
                <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#047857',
                    padding: '12px 16px',
                    borderRadius: 14,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.82rem',
                    fontWeight: 700
                }}>
                    <CheckCircle size={18} /> Transferência de Platas realizada com sucesso!
                </div>
            )}

            {/* Plata Digital Card */}
            <div style={{
                background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
                color: 'white',
                borderRadius: 20,
                padding: '20px',
                marginBottom: 16,
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700, color: '#d4d4d8' }}>
                        <Coins size={17} color="#fb923c" /> Saldo em Platas
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(255,255,255,0.12)', padding: '3px 8px', borderRadius: 999 }}>
                        Moeda Interna
                    </span>
                </div>

                <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16 }}>
                    {Number(balance).toFixed(0)} <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fb923c' }}>PLT</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        style={{
                            background: '#ea580c',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            padding: '11px 14px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer'
                        }}
                    >
                        <Send size={15} /> Transferir Platas
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowStore(true)}
                        style={{
                            background: 'rgba(255,255,255,0.14)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 12,
                            padding: '11px 14px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer'
                        }}
                    >
                        <ShoppingBag size={15} /> Loja Plata
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                    { id: 'all', label: 'Todas' },
                    { id: 'received', label: 'Recebidas' },
                    { id: 'sent', label: 'Enviadas' }
                ].map(f => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 10,
                            border: filter === f.id ? 'none' : '1px solid #e2e8f0',
                            background: filter === f.id ? '#ea580c' : '#f8fafc',
                            color: filter === f.id ? '#ffffff' : '#475569',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Statement List */}
            {filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: '0.82rem' }}>
                    Nenhuma movimentação de Platas encontrada.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredHistory.map((tx, idx) => {
                        const isSent = tx.fromUserId === userId;
                        return (
                            <div
                                key={tx.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 4px',
                                    borderBottom: idx === filteredHistory.length - 1 ? 'none' : '1px solid #f1f5f9'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 12,
                                        background: isSent ? '#fef2f2' : '#ecfdf5',
                                        color: isSent ? '#dc2626' : '#10b981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {isSent ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>
                                            {isSent ? `Enviado para ${tx.toUserName}` : `Recebido de ${tx.fromUserName}`}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                            {tx.description || formatLocalDate(String(tx.timestamp).split('T')[0])}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontWeight: 800,
                                    fontSize: '0.92rem',
                                    color: isSent ? '#dc2626' : '#15803d'
                                }}>
                                    {isSent ? '-' : '+'}{Number(tx.amount).toFixed(0)} PLT
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
