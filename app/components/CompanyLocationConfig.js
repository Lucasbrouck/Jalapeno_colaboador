'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Save, Loader2, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function CompanyLocationConfig() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchingCoords, setFetchingCoords] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [config, setConfig] = useState({
        latitude: '',
        longitude: '',
        checkinRadius: 200
    });
    const [message, setMessage] = useState({ text: '', type: 'success' });

    useEffect(() => {
        if (user?.company_id) {
            fetchConfig();
        }
    }, [user?.company_id]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/companies/config?companyId=${user.company_id}`);
            if (res.ok) {
                const data = await res.json();
                setConfig({
                    latitude: data.latitude || '',
                    longitude: data.longitude || '',
                    checkinRadius: data.checkinRadius || 200
                });
            }
        } catch (error) {
            console.error('Error fetching company location:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        setFetchingCoords(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setConfig(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setFetchingCoords(false);
                setMessage({ text: 'Localização atual capturada!', type: 'success' });
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            },
            (error) => {
                console.error('Error getting location:', error);
                setFetchingCoords(false);
                setMessage({ text: 'Erro ao capturar localização. Verifique as permissões.', type: 'error' });
                setTimeout(() => setMessage({ text: '', type: '' }), 4000);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const res = await fetch('/api/companies/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: user.company_id,
                    ...config
                })
            });

            if (res.ok) {
                setMessage({ text: 'Localização salva com sucesso!', type: 'success' });
                setIsExpanded(false);
            } else {
                const data = await res.json();
                setMessage({ text: data.error || 'Erro ao salvar.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Erro de conexão.', type: 'error' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage({ text: '', type: '' }), 4000);
        }
    };

    if (loading) return null;

    return (
        <div className="card">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="config-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isExpanded ? 20 : 0 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        padding: 8,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <MapPin size={20} color="#38bdf8" />
                    </div>
                    <div>
                        <h3 className="h3" style={{ margin: 0 }}>Localização da Empresa (Geofencing)</h3>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="config-header-right">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div style={{ animation: 'fadeIn 0.3s ease', marginTop: 20 }}>
                    <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
                        Configure o local físico da empresa para restringir o check-in dos funcionários. Se as coordenadas estiverem vazias, o check-in não terá restrição geográfica.
                    </p>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            <div className="input-group">
                                <label className="input-label">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="input-field"
                                    value={config.latitude}
                                    onChange={e => setConfig({ ...config, latitude: e.target.value })}
                                    placeholder="-23.5505"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="input-field"
                                    value={config.longitude}
                                    onChange={e => setConfig({ ...config, longitude: e.target.value })}
                                    placeholder="-46.6333"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                Raio de Check-in (metros)
                                <div style={{ position: 'relative', display: 'inline-block' }} title="Distância máxima permitida para o funcionário bater o ponto">
                                    <Info size={14} className="text-secondary" />
                                </div>
                            </label>
                            <input
                                type="number"
                                className="input-field"
                                value={config.checkinRadius}
                                onChange={e => setConfig({ ...config, checkinRadius: parseInt(e.target.value) || 0 })}
                                placeholder="200"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button
                                type="button"
                                onClick={handleGetCurrentLocation}
                                className="btn"
                                style={{ flex: 1, background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}
                                disabled={fetchingCoords}
                            >
                                {fetchingCoords ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} style={{ marginRight: 8 }} />}
                                {fetchingCoords ? 'Capturando...' : 'Pegar Local Atual'}
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} style={{ marginRight: 8 }} />}
                                {saving ? 'Salvando...' : 'Salvar Local'}
                            </button>
                        </div>

                        {message.text && (
                            <div style={{
                                marginTop: 16,
                                padding: '10px 15px',
                                borderRadius: 8,
                                fontSize: '0.85rem',
                                background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: message.type === 'success' ? '#4ade80' : '#f87171',
                                border: '1px solid currentColor'
                            }}>
                                {message.text}
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
}
