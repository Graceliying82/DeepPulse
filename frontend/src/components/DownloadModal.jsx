import React, { useState } from 'react';
import api from '../utils/api';
import { Database, Sparkles, ChevronRight, Loader2, X } from 'lucide-react';
import RecordBrowser from './RecordBrowser';
import { useSettings } from '../contexts/SettingsContext';

const DownloadModal = ({ category, signalType, onClose, onDownloadComplete }) => {
    const [step, setStep] = useState('interest'); // 'interest' | 'recommendations' | 'browse'
    const [userInterest, setUserInterest] = useState('');
    const [userRole, setUserRole] = useState('medical_student');
    const [recommendations, setRecommendations] = useState([]);
    const [selectedDbForBrowse, setSelectedDbForBrowse] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { apiKey } = useSettings();

    const categoryInfo = {
        cardiac: {
            name: 'Cardiac Electrical Signals',
            examples: ['arrhythmia', 'atrial fibrillation', 'myocardial infarction', 'heart rate variability', 'ST elevation']
        },
        neurological: {
            name: 'Neurological Signals',
            examples: ['epilepsy', 'sleep disorders', 'motor imagery', 'cognitive tasks', 'evoked potentials']
        },
        hemodynamic: {
            name: 'Hemodynamic Signals',
            examples: ['blood pressure monitoring', 'arterial waveforms', 'cardiac output', 'sepsis', 'ICU patients']
        },
        respiration: {
            name: 'Oxygenation & Respiration',
            examples: ['sleep apnea', 'COPD', 'oxygen saturation', 'respiratory rate', 'ventilation']
        },
        motion: {
            name: 'Mechanical & Motion Data',
            examples: ['gait analysis', "Parkinson's disease", 'fall detection', 'activity recognition', 'balance']
        }
    };

    const info = categoryInfo[category] || categoryInfo.cardiac;

    const getRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/api/recommend-databases', {
                user_role: userRole,
                category: category,
                user_interest: userInterest || null,
                api_key: apiKey || null
            });

            const recs = response.data.recommendations;
            if (recs && recs.length > 0) {
                if (recs[0].error) {
                    setError(recs[0].message);
                } else {
                    setRecommendations(recs);
                    setStep('recommendations');
                }
            } else {
                setError('Failed to get recommendations. Please try again.');
            }
        } catch (err) {
            console.error('Failed to get recommendations:', err);
            setError('Failed to connect to AI service. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenBrowser = (slug) => {
        setSelectedDbForBrowse(slug);
        setStep('browse');
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(0, 0, 0, 0.3)',
        color: '#E3E3E3',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box'
    };

    const selectStyle = { ...inputStyle, cursor: 'pointer' };

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: 500,
        color: '#E3E3E3',
        marginBottom: '8px'
    };

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
                onClick={onClose}
            >
                <div
                    style={{
                        background: 'rgba(22, 27, 34, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '85vh',
                        height: step === 'browse' ? '600px' : 'auto',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
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
                                    {step === 'browse' ? `Browse ${selectedDbForBrowse}` : `Explore ${signalType} Data`}
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                                    {step === 'browse' ? 'Browse available records' : info.name}
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

                    {/* Body */}
                    <div style={{
                        flex: 1,
                        overflowY: step === 'browse' ? 'hidden' : 'auto',
                        padding: step === 'browse' ? 0 : '20px 24px'
                    }}>
                        {/* Step 1: Interest */}
                        {step === 'interest' && (
                            <div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={labelStyle}>I am a...</label>
                                    <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={selectStyle}>
                                        <option value="medical_student">Medical Student</option>
                                        <option value="resident">Resident / Fellow</option>
                                        <option value="clinician">Clinician / Physician</option>
                                        <option value="researcher">Researcher</option>
                                        <option value="educator">Educator</option>
                                        <option value="hobbyist">Hobbyist / Self-learner</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={labelStyle}>Interest (optional)</label>
                                    <input
                                        type="text"
                                        value={userInterest}
                                        onChange={(e) => setUserInterest(e.target.value)}
                                        placeholder="e.g., arrhythmia..."
                                        style={inputStyle}
                                    />
                                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {info.examples.map((ex, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setUserInterest(ex)}
                                                style={{
                                                    padding: '6px 12px', fontSize: '12px', borderRadius: '16px',
                                                    border: userInterest === ex ? '1px solid rgba(0, 242, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                    background: userInterest === ex ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                    color: userInterest === ex ? '#00f2ff' : '#a1a1aa',
                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                {ex}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {error && (
                                    <div style={{
                                        color: '#f87171', fontSize: '13px', marginBottom: '10px', padding: '10px',
                                        background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px',
                                        border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }}>
                                        {error}
                                    </div>
                                )}
                                <button
                                    onClick={getRecommendations}
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '12px',
                                        background: 'rgba(0, 242, 255, 0.15)',
                                        border: '1px solid rgba(0, 242, 255, 0.3)',
                                        color: '#00f2ff', borderRadius: '8px', cursor: 'pointer',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        gap: '8px', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s'
                                    }}
                                >
                                    {loading ? <Loader2 className="spin-animation" size={18} /> : <Sparkles size={18} />}
                                    Get Recommendations
                                </button>
                            </div>
                        )}

                        {/* Step 2: Recommendations */}
                        {step === 'recommendations' && (
                            <div>
                                <p style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '16px' }}>
                                    Select a database to browse its records:
                                </p>
                                {recommendations.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleOpenBrowser(rec.slug)}
                                        style={{
                                            padding: '14px 16px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: '10px', marginBottom: '10px',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            cursor: 'pointer', display: 'flex', gap: '12px', transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                            e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        }}
                                    >
                                        <div style={{
                                            width: '36px', height: '36px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'rgba(0, 242, 255, 0.1)',
                                            border: '1px solid rgba(0, 242, 255, 0.2)', borderRadius: '8px'
                                        }}>
                                            <Database size={18} color="#00f2ff" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#E3E3E3' }}>
                                                {rec.name}
                                                <span style={{ fontWeight: 400, color: '#a1a1aa', fontSize: '12px', marginLeft: '8px' }}>
                                                    ({rec.slug})
                                                </span>
                                            </div>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                                                {rec.description}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <ChevronRight size={16} color="#a1a1aa" />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setStep('interest')}
                                    style={{
                                        width: '100%', marginTop: '16px', padding: '12px 16px',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '8px', cursor: 'pointer',
                                        color: '#E3E3E3', fontSize: '14px', fontWeight: 500
                                    }}
                                >
                                    Back
                                </button>
                            </div>
                        )}

                        {/* Step 3: Browse records */}
                        {step === 'browse' && selectedDbForBrowse && (
                            <RecordBrowser
                                dbSlug={selectedDbForBrowse}
                                category={category}
                            />
                        )}

                        {step === 'browse' && (
                            <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <button
                                    onClick={() => setStep('recommendations')}
                                    style={{
                                        width: '100%', padding: '10px',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '8px', cursor: 'pointer',
                                        color: '#E3E3E3', fontSize: '14px', transition: 'all 0.2s'
                                    }}
                                >
                                    Back to Recommendations
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .spin-animation { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </>
    );
};

export default DownloadModal;
