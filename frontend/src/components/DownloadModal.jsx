import React, { useState } from 'react';
import axios from 'axios';
import { X, Download, Sparkles, Loader2, Database, ChevronRight } from 'lucide-react';

const DownloadModal = ({ category, signalType, onClose, onDownloadComplete }) => {
    const [step, setStep] = useState('interest'); // 'interest' | 'recommendations' | 'downloading'
    const [userInterest, setUserInterest] = useState('');
    const [userRole, setUserRole] = useState('medical_student');
    const [recommendations, setRecommendations] = useState([]);
    const [selectedDatabases, setSelectedDatabases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, currentDb: '' });
    const [error, setError] = useState(null);

    // Download options
    const [numRecords, setNumRecords] = useState(3);
    const [shuffleRecords, setShuffleRecords] = useState(true);

    // Category display names and example interests
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
            examples: ['gait analysis', 'Parkinson\'s disease', 'fall detection', 'activity recognition', 'balance']
        }
    };

    const info = categoryInfo[category] || categoryInfo.cardiac;

    // Get AI recommendations
    const getRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('/api/recommend-databases', {
                user_role: userRole,
                category: category,
                user_interest: userInterest || null
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

    // Toggle database selection
    const toggleDatabase = (slug) => {
        setSelectedDatabases(prev =>
            prev.includes(slug)
                ? prev.filter(s => s !== slug)
                : [...prev, slug]
        );
    };

    // Download selected databases
    const downloadDatabases = async () => {
        if (selectedDatabases.length === 0) return;

        setStep('downloading');
        setDownloadProgress({ current: 0, total: selectedDatabases.length, currentDb: '' });

        for (let i = 0; i < selectedDatabases.length; i++) {
            const slug = selectedDatabases[i];
            setDownloadProgress({ current: i + 1, total: selectedDatabases.length, currentDb: slug });

            try {
                await axios.post('/api/data/download', {
                    db_slug: slug,
                    num_records: numRecords,
                    random_shuffle: shuffleRecords,
                    category: category
                });
            } catch (err) {
                console.error(`Failed to download ${slug}:`, err);
                // Continue with next database even if one fails
            }
        }

        // Complete
        if (onDownloadComplete) {
            onDownloadComplete();
        }
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
                onClick={onClose}
            >
                {/* Modal Content */}
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxWidth: '550px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                                Download {signalType} Data
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                {info.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#6b7280',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.color = '#111827';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#6b7280';
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div style={{
                        padding: '20px 24px',
                        overflowY: 'auto',
                        flex: 1
                    }}>
                        {/* Step 1: Interest Input */}
                        {step === 'interest' && (
                            <div>
                                {/* Role Selection */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        marginBottom: '8px'
                                    }}>
                                        I am a...
                                    </label>
                                    <select
                                        value={userRole}
                                        onChange={(e) => setUserRole(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px',
                                            color: '#111827',
                                            backgroundColor: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="medical_student">Medical Student</option>
                                        <option value="resident">Resident / Fellow</option>
                                        <option value="clinician">Clinician / Physician</option>
                                        <option value="researcher">Researcher</option>
                                        <option value="educator">Educator</option>
                                        <option value="hobbyist">Hobbyist / Self-learner</option>
                                    </select>
                                </div>

                                {/* Interest Input */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        marginBottom: '8px'
                                    }}>
                                        What specific area interests you? (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={userInterest}
                                        onChange={(e) => setUserInterest(e.target.value)}
                                        placeholder="e.g., arrhythmia detection, sleep analysis..."
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px',
                                            color: '#111827',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <div style={{
                                        marginTop: '8px',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '6px'
                                    }}>
                                        {info.examples.map((example, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setUserInterest(example)}
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '12px',
                                                    backgroundColor: userInterest === example ? '#dbeafe' : '#f3f4f6',
                                                    color: userInterest === example ? '#1d4ed8' : '#6b7280',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {example}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: '#fef2f2',
                                        borderRadius: '8px',
                                        color: '#dc2626',
                                        fontSize: '13px',
                                        marginBottom: '16px'
                                    }}>
                                        {error}
                                    </div>
                                )}

                                {/* Get Recommendations Button */}
                                <button
                                    onClick={getRecommendations}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        opacity: loading ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                            Getting AI Recommendations...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Get AI Recommendations
                                            <ChevronRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Step 2: Recommendations */}
                        {step === 'recommendations' && (
                            <div>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    marginBottom: '16px'
                                }}>
                                    Based on your interests, here are recommended databases:
                                </p>

                                {recommendations.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => toggleDatabase(rec.slug)}
                                        style={{
                                            padding: '14px 16px',
                                            backgroundColor: selectedDatabases.includes(rec.slug) ? '#eff6ff' : '#f9fafb',
                                            borderRadius: '8px',
                                            marginBottom: '10px',
                                            border: selectedDatabases.includes(rec.slug) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '4px',
                                                border: selectedDatabases.includes(rec.slug) ? '2px solid #3b82f6' : '2px solid #d1d5db',
                                                backgroundColor: selectedDatabases.includes(rec.slug) ? '#3b82f6' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: '2px'
                                            }}>
                                                {selectedDatabases.includes(rec.slug) && (
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                        <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginBottom: '4px'
                                                }}>
                                                    <Database size={14} style={{ color: '#6b7280' }} />
                                                    <span style={{
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        color: '#111827'
                                                    }}>
                                                        {rec.name}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: '#9ca3af',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        ({rec.slug})
                                                    </span>
                                                </div>
                                                <p style={{
                                                    fontSize: '13px',
                                                    color: '#6b7280',
                                                    margin: 0,
                                                    lineHeight: '1.5'
                                                }}>
                                                    {rec.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Download Options */}
                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    marginTop: '16px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#374151',
                                        marginBottom: '12px'
                                    }}>
                                        Download Options
                                    </div>

                                    {/* Number of Records */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px'
                                    }}>
                                        <label style={{
                                            fontSize: '13px',
                                            color: '#6b7280'
                                        }}>
                                            Records per database
                                        </label>
                                        <select
                                            value={numRecords}
                                            onChange={(e) => setNumRecords(Number(e.target.value))}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #d1d5db',
                                                fontSize: '13px',
                                                color: '#111827',
                                                backgroundColor: 'white',
                                                cursor: 'pointer',
                                                minWidth: '80px'
                                            }}
                                        >
                                            <option value={1}>1</option>
                                            <option value={2}>2</option>
                                            <option value={3}>3</option>
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </select>
                                    </div>

                                    {/* Shuffle Toggle */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <label style={{
                                                fontSize: '13px',
                                                color: '#6b7280',
                                                display: 'block'
                                            }}>
                                                Shuffle records
                                            </label>
                                            <span style={{
                                                fontSize: '11px',
                                                color: '#9ca3af'
                                            }}>
                                                {shuffleRecords ? 'Random selection' : 'First records in order'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setShuffleRecords(!shuffleRecords)}
                                            style={{
                                                width: '44px',
                                                height: '24px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                backgroundColor: shuffleRecords ? '#3b82f6' : '#d1d5db',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <span style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: shuffleRecords ? '22px' : '2px',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                backgroundColor: 'white',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                transition: 'left 0.2s'
                                            }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    marginTop: '20px'
                                }}>
                                    <button
                                        onClick={() => setStep('interest')}
                                        style={{
                                            flex: 1,
                                            padding: '12px 16px',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={downloadDatabases}
                                        disabled={selectedDatabases.length === 0}
                                        style={{
                                            flex: 2,
                                            padding: '12px 16px',
                                            backgroundColor: selectedDatabases.length === 0 ? '#9ca3af' : '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: selectedDatabases.length === 0 ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Download size={18} />
                                        Download {selectedDatabases.length > 0 ? `${selectedDatabases.length * numRecords} records` : ''}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Downloading */}
                        {step === 'downloading' && (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px'
                            }}>
                                <Loader2
                                    size={48}
                                    style={{
                                        color: '#3b82f6',
                                        animation: 'spin 1s linear infinite',
                                        marginBottom: '20px'
                                    }}
                                />
                                <h4 style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: '#111827'
                                }}>
                                    Downloading Data...
                                </h4>
                                <p style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '14px',
                                    color: '#6b7280'
                                }}>
                                    {downloadProgress.currentDb} ({downloadProgress.current} of {downloadProgress.total})
                                </p>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                                        height: '100%',
                                        backgroundColor: '#3b82f6',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DownloadModal;
