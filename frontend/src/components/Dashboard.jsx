import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SignalViewer from './SignalViewer';
import EducationalPanel from './EducationalPanel';
import DownloadModal from './DownloadModal';
import { Download, RefreshCw, FileText, X, GraduationCap, Loader2 } from 'lucide-react';
import { captureSVGAsImage } from '../utils/signalCapture';

const Dashboard = ({ signalType }) => {
    const [databases, setDatabases] = useState([]);  // List of databases in category
    const [selectedDatabase, setSelectedDatabase] = useState('');
    const [records, setRecords] = useState([]);  // Records in selected database
    const [selectedRecord, setSelectedRecord] = useState('');
    const [signalData, setSignalData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showClinicalNotes, setShowClinicalNotes] = useState(false);
    const [formattedNotes, setFormattedNotes] = useState(null);
    const [notesLoading, setNotesLoading] = useState(false);
    const [showEducational, setShowEducational] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [cachedSignalImage, setCachedSignalImage] = useState(null); // Pre-captured image for Learn modal

    // Map signalType to category key
    const getCategoryKey = () => {
        const mapping = {
            'Cardiac': 'cardiac',
            'Neuro': 'neurological',
            'Hemodynamic': 'hemodynamic',
            'Respiration': 'respiration',
            'Motion': 'motion'
        };
        return mapping[signalType] || 'cardiac';
    };

    // Fetch databases and records for the current category
    const fetchDatabasesAndRecords = async (retryCount = 0) => {
        try {
            const category = getCategoryKey();
            const res = await axios.get(`/api/data/category/${category}`);
            const allRecords = res.data.records || [];

            // Parse records to extract unique database names
            // Records are in format: "dbname/recordpath" or "dbname/subdir/recordpath"
            const dbSet = new Set();
            allRecords.forEach(record => {
                const parts = record.split('/');
                if (parts.length > 0) {
                    dbSet.add(parts[0]);
                }
            });

            setDatabases(Array.from(dbSet).sort());
            setRecords(allRecords);
        } catch (err) {
            console.error("Failed to fetch data", err);
            if (retryCount < 3) {
                setTimeout(() => fetchDatabasesAndRecords(retryCount + 1), 1000 * (retryCount + 1));
            }
        }
    };

    // Load databases on mount
    useEffect(() => {
        fetchDatabasesAndRecords();
    }, []);

    // Reset selections when signalType changes
    useEffect(() => {
        setSelectedDatabase('');
        setSelectedRecord('');
        setSignalData(null);
        fetchDatabasesAndRecords();
    }, [signalType]);

    // Get records filtered by selected database
    const getFilteredRecords = () => {
        if (!selectedDatabase) return [];
        return records
            .filter(r => r.startsWith(selectedDatabase + '/'))
            .map(r => {
                // Get the part after the database name
                const recordPath = r.substring(selectedDatabase.length + 1);
                return { fullPath: r, displayName: recordPath };
            });
    };

    // Close clinical notes modal when record changes (notes pre-fetch is handled in handleSelectRecord)
    useEffect(() => {
        setShowClinicalNotes(false);
    }, [selectedRecord]);

    // Pre-capture signal image when signalData changes (for Learn modal)
    useEffect(() => {
        if (!signalData) {
            setCachedSignalImage(null);
            return;
        }

        // Delay capture to ensure SVG is rendered
        const timer = setTimeout(async () => {
            try {
                const svgElement = document.querySelector('.signal-viewer-container');
                if (svgElement) {
                    const blob = await captureSVGAsImage(svgElement);
                    setCachedSignalImage(blob);
                    console.log('Signal image pre-captured for Learn modal:', blob.size, 'bytes');
                }
            } catch (err) {
                console.error('Failed to pre-capture signal image:', err);
            }
        }, 500); // Wait for SVG to fully render

        return () => clearTimeout(timer);
    }, [signalData]);

    // Handle database selection
    const handleSelectDatabase = (db) => {
        setSelectedDatabase(db);
        setSelectedRecord('');
        setSignalData(null);
    };

    // Handle record selection and load data
    const handleSelectRecord = async (recordPath) => {
        if (!recordPath) return;
        setSelectedRecord(recordPath);
        setLoading(true);
        setFormattedNotes(null); // Clear previous notes
        try {
            const category = getCategoryKey();
            const res = await axios.get(`/api/data/${category}/${encodeURIComponent(recordPath)}`);
            setSignalData(res.data);

            // Pre-fetch notes in background if comments exist
            if (res.data.comments && res.data.comments.length > 0) {
                // Use setTimeout to give it low priority (after main render)
                setTimeout(() => {
                    formatNotesWithAI(res.data.comments);
                }, 100);
            }
        } catch (err) {
            console.error("Failed to load record:", err);
        } finally {
            setLoading(false);
        }
    };

    // Use AI to format clinical notes into human-readable format
    const formatNotesWithAI = async (comments) => {
        setNotesLoading(true);
        try {
            const response = await axios.post('/api/ai/format-notes', {
                notes: comments
            });
            setFormattedNotes(response.data.formatted);
        } catch (error) {
            console.error('Failed to format notes with AI:', error);
            // Fallback to raw display
            setFormattedNotes(comments.map(c => ({ label: 'Clinical Note', value: c })));
        } finally {
            setNotesLoading(false);
        }
    };

    // Open clinical notes modal (notes are pre-fetched when record is selected)
    const handleOpenClinicalNotes = () => {
        setShowClinicalNotes(true);
        // Only fetch if not already fetched or currently fetching
        if (signalData && signalData.comments && !formattedNotes && !notesLoading) {
            formatNotesWithAI(signalData.comments);
        }
    };

    return (
        <div className="dashboard-grid">
            {/* Top Bar: Selector & Actions */}
            <div className="glass-panel" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ margin: 0 }}>{signalType === 'Respiration' ? 'Oxygen & Respiration' : signalType} Workspace</h2>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        {signalType === 'Cardiac' && (
                            <>
                                <span style={{ marginRight: '12px' }}>Supported: <strong style={{ color: '#059669' }}>ECG, EGM</strong></span>
                                <span>Coming soon: <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Fetal ECG, VCG</span></span>
                            </>
                        )}
                        {signalType === 'Neuro' && (
                            <>
                                <span style={{ marginRight: '12px' }}>Supported: <strong style={{ color: '#059669' }}>EEG</strong></span>
                                <span>Coming soon: <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Evoked Potentials, EMG</span></span>
                            </>
                        )}
                        {signalType === 'Hemodynamic' && (
                            <>
                                <span style={{ marginRight: '12px' }}>Supported: <strong style={{ color: '#059669' }}>ABP</strong></span>
                                <span>Coming soon: <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>PAP, CVP, ICP</span></span>
                            </>
                        )}
                        {signalType === 'Respiration' && (
                            <>
                                <span>Coming soon: <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>PPG, Impedance Pneumography</span></span>
                            </>
                        )}
                    </div>
                </div>

                {/* Database Selector */}
                <select
                    className="patient-select"
                    value={selectedDatabase}
                    onChange={(e) => handleSelectDatabase(e.target.value)}
                    style={{ minWidth: '150px' }}
                >
                    <option value="">Select Database...</option>
                    {databases.map(db => <option key={db} value={db}>{db}</option>)}
                </select>

                {/* Record Selector - only show when database is selected */}
                <select
                    className="patient-select"
                    value={selectedRecord}
                    onChange={(e) => handleSelectRecord(e.target.value)}
                    disabled={!selectedDatabase}
                    style={{ minWidth: '200px' }}
                >
                    <option value="">Select Record...</option>
                    {getFilteredRecords().map(r => (
                        <option key={r.fullPath} value={r.fullPath}>{r.displayName}</option>
                    ))}
                </select>

                {/* Clinical Notes Badge - Only show if notes exist */}
                {signalData && signalData.comments && signalData.comments.length > 0 && (
                    <button
                        className="action-btn"
                        onClick={handleOpenClinicalNotes}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            position: 'relative'
                        }}
                        title="View clinical notes"
                    >
                        <FileText size={16} />
                        <span style={{ fontSize: '13px' }}>Notes</span>
                        <span style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            minWidth: '18px',
                            textAlign: 'center'
                        }}>
                            {signalData.comments.length}
                        </span>
                    </button>
                )}

                {/* Educational AI Assistant - Only show if signal is loaded */}
                {signalData && (
                    <button
                        className="action-btn"
                        onClick={() => setShowEducational(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title="Learn with AI assistance"
                    >
                        <GraduationCap size={16} />
                        <span style={{ fontSize: '13px' }}>Learn</span>
                    </button>
                )}

                <button className="action-btn" onClick={fetchDatabasesAndRecords}>
                    <RefreshCw size={18} />
                </button>

                <div style={{ flex: 1 }} />

                <button className="action-btn primary" onClick={() => setShowDownloadModal(true)} disabled={loading}>
                    <Download size={18} style={{ marginRight: 8 }} />
                    Download Data
                </button>
            </div>

            {/* Clinical Notes Modal */}
            {showClinicalNotes && signalData && signalData.comments && (
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
                        onClick={() => setShowClinicalNotes(false)}
                    >
                        {/* Modal Content */}
                        <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                maxWidth: '600px',
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
                                        Clinical Notes
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                        {selectedRecord} • {signalData.comments.length} {signalData.comments.length === 1 ? 'note' : 'notes'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowClinicalNotes(false)}
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
                                {notesLoading ? (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '40px',
                                        color: '#6b7280'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            border: '3px solid #e5e7eb',
                                            borderTop: '3px solid #3b82f6',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <p style={{ marginTop: '16px', fontSize: '14px' }}>
                                            AI is formatting clinical notes...
                                        </p>
                                    </div>
                                ) : formattedNotes ? (
                                    formattedNotes.map((note, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                backgroundColor: '#f9fafb',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                marginBottom: idx < formattedNotes.length - 1 ? '12px' : '0',
                                                border: '1px solid #e5e7eb'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#6b7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                marginBottom: '6px'
                                            }}>
                                                {note.label}
                                            </div>
                                            <div style={{
                                                fontSize: '14px',
                                                color: '#111827',
                                                lineHeight: '1.6',
                                                fontWeight: 500
                                            }}>
                                                {note.value}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px',
                                        color: '#9ca3af',
                                        fontSize: '14px'
                                    }}>
                                        No clinical notes available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Educational Panel Modal */}
            {showEducational && signalData && (
                <EducationalPanel
                    signalData={signalData}
                    onClose={() => setShowEducational(false)}
                    preloadedImage={cachedSignalImage}
                />
            )}

            {/* Download Modal */}
            {showDownloadModal && (
                <DownloadModal
                    category={getCategoryKey()}
                    signalType={signalType}
                    onClose={() => setShowDownloadModal(false)}
                    onDownloadComplete={() => fetchDatabasesAndRecords()}
                />
            )}

            {/* Main Signal View */}
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        gap: '16px'
                    }}>
                        <Loader2
                            size={48}
                            style={{
                                color: '#3b82f6',
                                animation: 'spin 1s linear infinite'
                            }}
                        />
                        <div style={{
                            fontSize: '16px',
                            fontWeight: 500,
                            color: '#374151'
                        }}>
                            Loading Signal Data...
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: '#6b7280'
                        }}>
                            Please wait while we fetch the record
                        </div>
                    </div>
                )}

                {!signalData && !loading && (
                    <div className="empty-state">
                        <p>Select a patient record to visualize {signalType} signals.</p>
                    </div>
                )}

                {signalData && !loading && (
                    <SignalViewer data={signalData} type={signalType} />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
