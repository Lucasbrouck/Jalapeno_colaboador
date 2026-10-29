'use client';

import { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    Search,
    Filter,
    Loader2,
    CheckCircle,
    AlertCircle,
    Tag,
    Eye
} from 'lucide-react';

export default function StoreConfig({ companyId }) {
    const [items, setItems] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [tab, setTab] = useState('purchases'); // purchases, items

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [icon, setIcon] = useState('Tag');
    const [active, setActive] = useState(true);

    useEffect(() => {
        if (companyId) {
            fetchData();
        }
    }, [companyId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsRes, purchasesRes] = await Promise.all([
                fetch(`/api/store/items?companyId=${companyId}&admin=true`),
                fetch(`/api/store/purchases?companyId=${companyId}`)
            ]);

            const [itemsData, purchasesData] = await Promise.all([
                itemsRes.json(),
                purchasesRes.json()
            ]);

            setItems(itemsData);
            setPurchases(purchasesData);
        } catch (error) {
            console.error('Error fetching admin store data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            id: editingItem?.id,
            name,
            description,
            price: Number(price),
            icon,
            active: active ? 1 : 0,
            company_id: companyId
        };

        try {
            const res = await fetch('/api/store/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchData();
                resetForm();
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao salvar item');
            }
        } catch (error) {
            alert('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setPrice('');
        setIcon('Tag');
        setActive(true);
        setEditingItem(null);
        setShowForm(false);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setName(item.name);
        setDescription(item.description || '');
        setPrice(item.price.toString());
        setIcon(item.icon || 'Tag');
        setActive(item.active === 1);
        setShowForm(true);
    };

    const handleUpdateStatus = async (purchaseId, status) => {
        if (!confirm(`Deseja ${status === 'APPROVED' ? 'APROVAR' : 'CANCELAR'} este pedido?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/store/purchases', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseId, status })
            });

            if (res.ok) {
                await fetchData();
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao atualizar pedido');
            }
        } catch (error) {
            alert('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const pendingPurchases = purchases.filter(p => p.status === 'PENDING');
    const processedPurchases = purchases.filter(p => p.status !== 'PENDING');

    return (
        <div className="store-config">
            <div className="config-header">
                <div className="title-section">
                    <ShoppingBag size={28} color="var(--accent-orange)" />
                    <div>
                        <h1>Configuração da Loja</h1>
                        <p>Gerencie produtos e valide pedidos dos colaboradores</p>
                    </div>
                </div>

                <div className="tab-nav">
                    <button className={tab === 'purchases' ? 'active' : ''} onClick={() => setTab('purchases')}>
                        Pedidos {pendingPurchases.length > 0 && <span className="badge">{pendingPurchases.length}</span>}
                    </button>
                    <button className={tab === 'items' ? 'active' : ''} onClick={() => setTab('items')}>
                        Gestão de Itens
                    </button>
                </div>
            </div>

            {loading && !showForm ? (
                <div className="loading-state">
                    <Loader2 className="animate-spin" size={32} />
                    <p>Atualizando dados...</p>
                </div>
            ) : tab === 'items' ? (
                <div className="items-view">
                    <div className="actions">
                        <button className="add-btn" onClick={() => setShowForm(true)}>
                            <Plus size={20} /> Novo Item
                        </button>
                    </div>

                    <div className="items-grid">
                        {items.length === 0 ? (
                            <div className="empty-state">Nenhum item cadastrado ainda.</div>
                        ) : (
                            items.map(item => (
                                <div key={item.id} className={`item-card ${item.active === 0 ? 'inactive' : ''}`}>
                                    <div className="item-icon-col">
                                        <Tag size={24} color={item.active ? "var(--accent-orange)" : "#64748b"} />
                                    </div>
                                    <div className="item-info-col">
                                        <h3>{item.name} {item.active === 0 && <small>(Inativo)</small>}</h3>
                                        <p>{item.description}</p>
                                        <div className="price">{Number(item.price).toFixed(2)} Platas</div>
                                    </div>
                                    <div className="item-actions-col">
                                        <button onClick={() => handleEdit(item)}><Edit2 size={18} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="purchases-view">
                    <section className="purchase-section">
                        <h2>Pendentes de Verificação</h2>
                        <div className="purchase-list">
                            {pendingPurchases.length === 0 ? (
                                <div className="empty-state">Não há pedidos aguardando verificação.</div>
                            ) : (
                                pendingPurchases.map(p => (
                                    <div key={p.id} className="purchase-row pending">
                                        <div className="u-info">
                                            <div className="avatar">{p.userName[0]}</div>
                                            <div>
                                                <strong>{p.userName}</strong>
                                                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="p-item">
                                            <strong>{p.itemName}</strong>
                                            <span>{Number(p.priceAtPurchase).toFixed(2)} Platas</span>
                                        </div>
                                        <div className="p-actions">
                                            <button className="approve" onClick={() => handleUpdateStatus(p.id, 'APPROVED')}>
                                                <Check size={18} /> Aprovar
                                            </button>
                                            <button className="cancel" onClick={() => handleUpdateStatus(p.id, 'CANCELLED')}>
                                                <X size={18} /> Recusar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="purchase-section">
                        <h2>Histórico de Pedidos</h2>
                        <div className="purchase-list">
                            {processedPurchases.map(p => (
                                <div key={p.id} className="purchase-row history">
                                    <div className="u-info">
                                        <span>{p.userName}</span>
                                    </div>
                                    <div className="p-item">
                                        <span>{p.itemName}</span>
                                    </div>
                                    <div className="p-status">
                                        <span className={`status-tag ${p.status.toLowerCase()}`}>
                                            {p.status === 'APPROVED' ? 'Aprovado' : 'Cancelado/Estornado'}
                                        </span>
                                    </div>
                                    <div className="p-date">
                                        {new Date(p.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <form className="item-form" onSubmit={handleSaveItem}>
                        <div className="form-header">
                            <h2>{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
                            <button type="button" onClick={resetForm}><X size={24} /></button>
                        </div>
                        <div className="form-body">
                            <div className="form-group">
                                <label>Nome do Produto</label>
                                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Café Starbucks, Boné Jala..." />
                            </div>
                            <div className="form-group">
                                <label>Descrição</label>
                                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Especifique o que o usuário ganhará..." />
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>Preço (Platas)</label>
                                    <input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} />
                                </div>
                                <div className="form-group flex-1">
                                    <label>Status</label>
                                    <div className="toggle-group" onClick={() => setActive(!active)}>
                                        <div className={`toggle ${active ? 'active' : ''}`}></div>
                                        <span>{active ? 'Ativo na Loja' : 'Inativo (Oculto)'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="form-footer">
                            <button type="button" className="cancel-btn" onClick={resetForm}>Cancelar</button>
                            <button type="submit" className="save-btn" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : 'Salvar Produto'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style jsx>{`
                .store-config { padding: 20px; }
                .config-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; border-bottom: 1px solid #f8fafc; padding-bottom: 16px; }
                .title-section h1 { margin: 0; font-size: 1.8rem; }
                .title-section p { margin: 4px 0 0 0; color: #94a3b8; font-size: 0.9rem; }
                
                .tab-nav { display: flex; gap: 8px; }
                .tab-nav button { 
                    background: #f8fafc; border: 1px solid #f8fafc; color: #94a3b8; padding: 10px 20px; 
                    border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600;
                    transition: all 0.2s;
                }
                .tab-nav button.active { background: var(--accent-orange); color: white; border-color: var(--accent-orange); }
                .badge { background: white; color: var(--accent-orange); padding: 2px 6px; border-radius: 6px; font-size: 0.75rem; }

                .action-btn { background: var(--accent-orange); color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px; }

                .items-view { animation: slideUp 0.3s ease; }
                .actions { margin-bottom: 24px; display: flex; justify-content: flex-end; }
                .add-btn { background: white; color: black; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
                
                .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px; }
                .item-card { background: #f8fafc; border: 1px solid #f8fafc; border-radius: 16px; padding: 16px; display: flex; gap: 16px; align-items: center; }
                .item-card.inactive { opacity: 0.6; }
                .item-info-col { flex: 1; }
                .item-info-col h3 { margin: 0; font-size: 1.1rem; }
                .item-info-col p { font-size: 0.85rem; color: #94a3b8; margin: 4px 0 8px 0; }
                .price { font-weight: 800; color: var(--accent-orange); }
                .item-actions-col button { background: #f8fafc; border: none; color: #94a3b8; padding: 8px; border-radius: 8px; cursor: pointer; }
                .item-actions-col button:hover { background: white; color: black; }

                .purchase-section h2 { font-size: 1.1rem; color: #94a3b8; margin: 32px 0 16px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                .purchase-list { display: flex; flex-direction: column; gap: 8px; }
                .purchase-row { background: #f8fafc; border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; }
                .purchase-row.pending { border-left: 4px solid var(--accent-orange); }
                .u-info { display: flex; align-items: center; gap: 12px; width: 220px; }
                .avatar { width: 36px; height: 36px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
                .u-info div { display: flex; flex-direction: column; }
                .u-info span { font-size: 0.75rem; color: #64748b; }
                .p-item { flex: 1; }
                .p-item strong { display: block; }
                .p-item span { color: var(--accent-orange); font-weight: 700; font-size: 0.9rem; }
                .p-actions { display: flex; gap: 8px; }
                .p-actions button { padding: 8px 16px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
                .approve { background: #22c55e; color: white; }
                .cancel { background: #334155; color: white; }
                
                .status-tag { font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; text-transform: uppercase; }
                .status-tag.approved { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
                .status-tag.cancelled { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

                /* Form Styles */
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2100; padding: 20px; }
                .item-form { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; width: 100%; max-width: 500px; overflow: hidden; }
                .form-header { padding: 24px; border-bottom: 1px solid #f8fafc; display: flex; justify-content: space-between; align-items: center; }
                .form-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group label { font-size: 0.9rem; font-weight: 600; color: #94a3b8; }
                .form-group input, .form-group textarea { background: #f8fafc; border: 2px solid transparent; border-radius: 10px; color: white; padding: 12px; outline: none; transition: all 0.2s; }
                .form-group input:focus, .form-group textarea:focus { border-color: var(--accent-orange); }
                .form-row { display: flex; gap: 16px; }
                .flex-1 { flex: 1; }
                .toggle-group { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: #f8fafc; border-radius: 10px; }
                .toggle { width: 40px; height: 20px; background: #334155; border-radius: 10px; position: relative; transition: all 0.3s; }
                .toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: all 0.3s; }
                .toggle.active { background: var(--accent-green); }
                .toggle.active::after { left: 22px; }
                .form-footer { padding: 24px; border-top: 1px solid #f8fafc; display: flex; justify-content: flex-end; gap: 12px; }
                .cancel-btn { background: none; border: none; color: #94a3b8; font-weight: 600; cursor: pointer; }
                .save-btn { background: var(--accent-orange); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }

                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .loading-state, .empty-state { text-align: center; padding: 80px 0; color: #64748b; }
            `}</style>
        </div>
    );
}
