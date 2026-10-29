'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag, Search, Tag, CheckCircle, AlertCircle, Loader2, Download, Printer, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';

export default function StoreModal({ isOpen, onClose, userId, balance, onSuccess }) {
    const [items, setItems] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [view, setView] = useState('browse'); // browse, history
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [buyingId, setBuyingId] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [userCompanyId, setUserCompanyId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchUserAndStoreData();
        }
    }, [isOpen]);

    const fetchUserAndStoreData = async () => {
        setLoading(true);
        try {
            // 1. Get User to find companyId
            const usersRes = await fetch('/api/users');
            const usersData = await usersRes.json();
            const currentUser = usersData.find(u => u.id === userId);
            const companyId = currentUser?.company_id;
            setUserCompanyId(companyId);

            if (companyId) {
                // 2. Get Items
                const itemsRes = await fetch(`/api/store/items?companyId=${companyId}`);
                const itemsData = await itemsRes.json();
                setItems(itemsData);

                // 3. Get History
                const historyRes = await fetch(`/api/store/purchases?companyId=${companyId}&userId=${userId}`);
                const historyData = await historyRes.json();
                setPurchases(historyData);
            }
        } catch (error) {
            console.error('Error fetching store data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (item) => {
        if (balance < item.price) {
            alert('Saldo insuficiente!');
            return;
        }

        if (!confirm(`Deseja comprar "${item.name}" por ${item.price} Platas?`)) return;

        setBuyingId(item.id);
        try {
            const res = await fetch('/api/store/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    itemId: item.id,
                    companyId: userCompanyId
                })
            });

            if (res.ok) {
                const purchase = await res.json();
                await fetchUserAndStoreData();
                onSuccess(); // Refresh balance in parent
                setSelectedReceipt(purchase);
                alert('Pedido realizado com sucesso! Aguarde a verificação do administrador.');
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao realizar compra');
            }
        } catch (error) {
            alert('Erro de conexão');
        } finally {
            setBuyingId(null);
        }
    };

    if (!isOpen) return null;

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <div className="header-title">
                        <ShoppingBag size={24} color="var(--accent-orange)" />
                        <h2>JalaBank Shop</h2>
                    </div>
                    <button onClick={onClose} className="close-btn"><X size={24} /></button>
                </div>

                <div className="view-tabs">
                    <button
                        className={view === 'browse' ? 'active' : ''}
                        onClick={() => setView('browse')}
                    >
                        Explorar Itens
                    </button>
                    <button
                        className={view === 'history' ? 'active' : ''}
                        onClick={() => setView('history')}
                    >
                        Meus Pedidos
                    </button>
                </div>

                <div className="modal-body">
                    {view === 'browse' ? (
                        <>
                            <div className="search-bar">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="O que você está procurando?"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <div className="balance-tag">
                                    Seu Saldo: <strong>{Number(balance).toFixed(2)}</strong>
                                </div>
                            </div>

                            {loading ? (
                                <div className="loading-state">
                                    <Loader2 className="animate-spin" size={32} />
                                    <p>Carregando itens...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="empty-state">
                                    <ShoppingBag size={48} />
                                    <p>Nenhum item disponível no momento.</p>
                                </div>
                            ) : (
                                <div className="items-grid">
                                    {filteredItems.map(item => (
                                        <div key={item.id} className="item-card">
                                            <div className="item-icon-wrapper">
                                                <div className="item-icon-bg">
                                                    <Tag size={32} color="var(--accent-orange)" />
                                                </div>
                                                <span className="price-badge">{Number(item.price).toFixed(2)} Platas</span>
                                            </div>
                                            <div className="item-info">
                                                <h3>{item.name}</h3>
                                                <p>{item.description}</p>
                                            </div>
                                            <button
                                                className="buy-btn"
                                                onClick={() => handleBuy(item)}
                                                disabled={buyingId === item.id || balance < item.price}
                                            >
                                                {buyingId === item.id ? <Loader2 className="animate-spin" size={18} /> : 'Comprar Agora'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="history-list">
                            {purchases.length === 0 ? (
                                <div className="empty-state">
                                    <p>Você não realizou nenhuma compra ainda.</p>
                                </div>
                            ) : (
                                purchases.map(p => (
                                    <div key={p.id} className="purchase-card">
                                        <div className="p-icon">
                                            <ShoppingBag size={20} />
                                        </div>
                                        <div className="p-details">
                                            <div className="p-header">
                                                <strong>{p.itemName}</strong>
                                                <span>{Number(p.priceAtPurchase).toFixed(2)} Platas</span>
                                            </div>
                                            <div className="p-footer">
                                                <span className={`status-tag ${p.status.toLowerCase()}`}>
                                                    {p.status === 'PENDING' ? 'Aguardando Verificação' :
                                                        p.status === 'APPROVED' ? 'Pedido Aprovado' : 'Cancelado'}
                                                </span>
                                                <span className="date">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                        {p.status === 'APPROVED' && (
                                            <button className="receipt-btn" onClick={() => setSelectedReceipt(p)}>
                                                <Download size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedReceipt && (
                <ReceiptModal
                    purchase={selectedReceipt}
                    onClose={() => setSelectedReceipt(null)}
                />
            )}

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 20px;
                }
                .modal-content {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 800px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px #f1f5f9;
                    overflow: hidden;
                    animation: modalIn 0.3s ease-out;
                }
                @keyframes modalIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .modal-header {
                    padding: 24px;
                    border-bottom: 1px solid #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header-title { display: flex; align-items: center; gap: 12px; }
                .header-title h2 { margin: 0; font-size: 1.5rem; letter-spacing: -0.5px; }
                .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; transition: color 0.2s; }
                .close-btn:hover { color: white; }

                .view-tabs { display: flex; padding: 0 24px; border-bottom: 1px solid #f8fafc; }
                .view-tabs button {
                    background: none; border: none; color: #64748b; padding: 16px 20px; cursor: pointer;
                    font-weight: 600; border-bottom: 2px solid transparent; transition: all 0.2s;
                }
                .view-tabs button.active { color: var(--accent-orange); border-bottom-color: var(--accent-orange); }

                .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
                
                .search-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; background: #f8fafc; padding: 8px 16px; border-radius: 12px; }
                .search-bar input { background: none; border: none; color: white; flex: 1; padding: 8px 0; outline: none; }
                .balance-tag { background: rgba(249, 115, 22, 0.1); color: var(--accent-orange); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; }

                .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
                .item-card { 
                    background: #f8fafc; border: 1px solid #f8fafc; border-radius: 16px; padding: 16px; 
                    display: flex; flex-direction: column; transition: transform 0.2s;
                }
                .item-card:hover { transform: translateY(-4px); border-color: rgba(249,115,22,0.3); }
                .item-icon-wrapper { height: 120px; background: #f1f5f9; border-radius: 12px; margin-bottom: 16px; position: relative; display: flex; align-items: center; justify-content: center; }
                .price-badge { position: absolute; bottom: 8px; right: 8px; background: var(--accent-orange); color: white; font-size: 0.75rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; }
                .item-info h3 { margin: 0 0 4px 0; font-size: 1rem; }
                .item-info p { font-size: 0.8rem; color: #94a3b8; margin: 0 0 16px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .buy-btn { width: 100%; padding: 10px; border-radius: 10px; border: none; background: white; color: black; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .buy-btn:hover:not(:disabled) { background: var(--accent-orange); color: white; }
                .buy-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .history-list { display: flex; flex-direction: column; gap: 12px; }
                .purchase-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; }
                .p-icon { width: 40px; height: 40px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
                .p-details { flex: 1; }
                .p-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .p-header strong { font-size: 0.95rem; }
                .p-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; }
                .status-tag { padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
                .status-tag.pending { background: rgba(249, 115, 22, 0.15); color: #fb923c; }
                .status-tag.approved { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
                .status-tag.cancelled { background: rgba(239, 68, 68, 0.15); color: #f87171; }
                .receipt-btn { background: #f8fafc; border: none; color: #94a3b8; padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .receipt-btn:hover { background: white; color: black; }

                .loading-state, .empty-state { text-align: center; padding: 60px 0; color: #64748b; }
                .empty-state p { margin-top: 16px; }

                @media (max-width: 600px) {
                    .items-grid { grid-template-columns: 1fr; }
                    .modal-content { border-radius: 0; max-height: 100vh; height: 100vh; }
                }
            `}</style>
        </div>
    );
}

function ReceiptModal({ purchase, onClose }) {
    return (
        <div className="receipt-overlay">
            <div className="receipt-content">
                <div className="receipt-body" id="printable-receipt">
                    <div className="receipt-header">
                        <ShoppingBag size={32} color="black" />
                        <h2>JalaBank Shop</h2>
                        <p>Recibo de Compra Virtual</p>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-info">
                        <div className="row"><span>ID da Transação:</span> <strong>{purchase.id}</strong></div>
                        <div className="row"><span>Data:</span> <strong>{new Date(purchase.createdAt).toLocaleString('pt-BR')}</strong></div>
                        <div className="row"><span>Cliente:</span> <strong>{purchase.userName}</strong></div>
                        <div className="row"><span>Empresa:</span> <strong>Jalapeño</strong></div>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-item">
                        <div className="item-main">
                            <span>{purchase.itemName}</span>
                            <strong>{Number(purchase.priceAtPurchase).toFixed(2)} Platas</strong>
                        </div>
                        <p className="item-desc">{purchase.itemDescription}</p>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-total">
                        <span>Total Pago:</span>
                        <h2>{Number(purchase.priceAtPurchase).toFixed(2)} Platas</h2>
                    </div>

                    <div className="receipt-footer">
                        <CheckCircle size={20} color="#22c55e" />
                        <p>Pedido Verificado e Aprovado</p>
                        <small>Este é um comprovante digital de movimentação interna.</small>
                    </div>
                </div>

                <div className="receipt-actions">
                    <button className="btn-share" onClick={async () => {
                        const node = document.getElementById('printable-receipt');
                        if (!node) return;

                        try {
                            const dataUrl = await toPng(node, { backgroundcolor: 'var(--text-primary)', quality: 0.95 });

                            // Check if navigator.share is available
                            if (navigator.share && navigator.canShare) {
                                const response = await fetch(dataUrl);
                                const blob = await response.blob();
                                const file = new File([blob], `recibo-${purchase.id}.png`, { type: 'image/png' });

                                if (navigator.canShare({ files: [file] })) {
                                    await navigator.share({
                                        files: [file],
                                        title: 'Recibo JalaBank',
                                        text: `Recibo de compra: ${purchase.itemName}`
                                    });
                                } else {
                                    throw new Error('Share not supported');
                                }
                            } else {
                                // Fallback: Download image
                                const link = document.createElement('a');
                                link.download = `recibo-${purchase.id}.png`;
                                link.href = dataUrl;
                                link.click();
                            }
                        } catch (error) {
                            console.error('Error sharing receipt:', error);
                            alert('Erro ao compartilhar recibo. Tente novamente.');
                        }
                    }}>
                        <Share2 size={18} /> Compartilhar Recibo
                    </button>
                    <button className="btn-close" onClick={onClose}>Fechar</button>
                </div>
            </div>

            <style jsx>{`
                .receipt-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.9); z-index: 3000;
                    display: flex; align-items: center; justify-content: center; padding: 20px;
                }
                .receipt-content { width: 100%; max-width: 380px; animation: modalIn 0.3s ease-out; }
                .receipt-body { background: white; color: black; border-radius: 12px; padding: 32px; box-shadow: 0 10px 40px #f1f5f9; }
                .receipt-header { text-align: center; margin-bottom: 24px; }
                .receipt-header h2 { margin: 8px 0 0 0; font-size: 1.5rem; color: #ffffff; }
                .receipt-header p { margin: 0; font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                
                .receipt-divider { height: 1px; border-top: 2px dashed #e2e8f0; margin: 20px 0; }
                
                .receipt-info { font-size: 0.85rem; display: flex; flex-direction: column; gap: 8px; }
                .receipt-info .row { display: flex; justify-content: space-between; }
                .receipt-info span { color: #64748b; }

                .receipt-item { margin: 20px 0; }
                .item-main { display: flex; justify-content: space-between; font-size: 1rem; margin-bottom: 4px; }
                .item-desc { font-size: 0.75rem; color: #64748b; margin: 0; }

                .receipt-total { text-align: center; margin-top: 24px; }
                .receipt-total span { font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 700; }
                .receipt-total h2 { margin: 4px 0 0 0; color: var(--accent-orange); font-size: 2rem; }

                .receipt-footer { text-align: center; margin-top: 32px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
                .receipt-footer p { margin: 0; font-weight: 700; font-size: 0.9rem; color: #15803d; }
                .receipt-footer small { font-size: 0.65rem; color: #94a3b8; max-width: 200px; display: block; }

                .receipt-actions { display: flex; gap: 12px; margin-top: 24px; }
                .receipt-actions button { flex: 1; padding: 12px; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .btn-share { background: var(--accent-orange); color: white; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .btn-close { background: #334155; color: white; }
                
                @media print {
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible; }
                    #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; border-radius: 0; box-shadow: none; }
                }
            `}</style>
        </div>
    );
}
