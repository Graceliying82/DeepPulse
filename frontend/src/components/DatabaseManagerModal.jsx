import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Database, Loader2, X, RefreshCw, HardDrive, AlertCircle } from 'lucide-react';

const DatabaseManagerModal = ({ onClose }) => {
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const DB_METADATA = {
        'ptbdb': { name: 'PTB Diagnostic ECG', category: 'cardiac', description: 'Conventional and Frank XYZ leads ECG records' },
        'mitdb': { name: 'MIT-BIH Arrhythmia', category: 'cardiac', description: '48 half-hour 2-channel ambulatory ECG recordings' },
        'afdb': { name: 'MIT-BIH Atrial Fibrillation', category: 'cardiac', description: '25 long-term ECG recordings with atrial fibrillation' },
        'iafdb': { name: 'Intracardiac AF', category: 'cardiac', description: 'Intracardiac electrograms during atrial fibrillation' },
        'nsrdb': { name: 'Normal Sinus Rhythm', category: 'cardiac', description: 'Long-term ECG recordings from healthy subjects' },
        'mitbih': { name: 'MIT-BIH Long-Term', category: 'cardiac', description: 'Long-term ECG database' },
        'eegmmidb': { name: 'EEG Motor Movement', category: 'neurological', description: 'EEG recordings of motor and imagery tasks' },
        'chbmit': { name: 'CHB-MIT Scalp EEG', category: 'neurological', description: 'Pediatric subjects with intractable seizures' },
        'emgdb': { name: 'EMG Database', category: 'neurological', description: 'Electromyography recordings' },
        'fantasia': { name: 'Fantasia', category: 'respiration', description: 'ECG and respiration from healthy subjects watching Fantasia' },
        'gaitndd': { name: 'Gait in Neurodegenerative Disease', category: 'motion', description: "Gait recordings from patients with Parkinson's, Huntington's, ALS" },
    };

    useEffect(() => {
        fetchDatabaseStatus();
    }, []);

    const fetchDatabaseStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const results = await Promise.all(
                Object.keys(DB_METADATA).map(async (slug) => {
                    try {
                        const res = await api.get(`/api/inventory/${slug}`);
                        const records = res.data.records || [];
                        return { slug, total: records.length };
                    } catch {
                        return { slug, total: 0, error: true };
                    }
                })
            );
            setDatabases(results);
        } catch {
            setError('Failed to fetch database status');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryColor = (category) => {
        const colors = {
            cardiac: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
            neurological: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
            respiration: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
            motion: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
            hemodynamic: { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' }
        };
        return colors[category] || colors.cardiac;
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'rgba(22, 27, 34, 0.95)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    maxWidth: '800px', width: '100%', maxHeight: '85vh',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.1) 0%, rgba(22, 27, 34, 0.5) 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: 'rgba(0, 242, 255, 0.15)',
                            border: '1px solid rgba(0, 242, 255, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Database size={22} color="#00f2ff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#E3E3E3' }}>
                                Database Manager
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                                Available PhysioNet datasets
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer', padding: '8px', borderRadius: '8px',
                        color: '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Summary */}
                <div style={{
                    padding: '12px 24px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex', gap: '24px', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={16} color="#a1a1aa" />
                        <span style={{ fontSize: '13px', color: '#E3E3E3' }}>
                            <strong style={{ color: '#00f2ff' }}>{databases.reduce((sum, db) => sum + db.total, 0)}</strong> records available
                        </span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={fetchDatabaseStatus}
                        disabled={loading}
                        style={{
                            padding: '6px 12px', fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            color: '#E3E3E3', transition: 'all 0.2s'
                        }}
                    >
                        <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {loading && databases.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <Loader2 size={32} className="spin-animation" color="#00f2ff" />
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
                            <AlertCircle size={32} style={{ marginBottom: '8px' }} />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {databases.map((db) => {
                                const meta = DB_METADATA[db.slug] || { name: db.slug, category: 'cardiac', description: '' };
                                const catColor = getCategoryColor(meta.category);

                                return (
                                    <div key={db.slug} style={{
                                        padding: '16px',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        display: 'flex', alignItems: 'center', gap: '16px'
                                    }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '10px',
                                            background: catColor.bg, border: `1px solid ${catColor.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <Database size={20} color={catColor.text} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#E3E3E3' }}>{meta.name}</span>
                                                <span style={{
                                                    padding: '2px 8px', fontSize: '11px', fontWeight: 500,
                                                    borderRadius: '4px', background: catColor.bg,
                                                    color: catColor.text, border: `1px solid ${catColor.border}`,
                                                    textTransform: 'capitalize'
                                                }}>{meta.category}</span>
                                            </div>
                                            <p style={{
                                                margin: '4px 0 0 0', fontSize: '12px', color: '#a1a1aa',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {meta.description}
                                            </p>
                                        </div>
                                        <div style={{
                                            padding: '6px 12px', fontSize: '13px', color: '#00f2ff',
                                            background: 'rgba(0, 242, 255, 0.1)',
                                            border: '1px solid rgba(0, 242, 255, 0.2)',
                                            borderRadius: '6px', fontWeight: 500, flexShrink: 0
                                        }}>
                                            {db.total} records
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .spin-animation { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default DatabaseManagerModal;
