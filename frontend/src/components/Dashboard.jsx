import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SignalViewer from './SignalViewer';
import EducationalPanel from './EducationalPanel';
import { Download, RefreshCw, FileText, X, GraduationCap } from 'lucide-react';

const Dashboard = ({ signalType }) => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [signalData, setSignalData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showClinicalNotes, setShowClinicalNotes] = useState(false);
    const [formattedNotes, setFormattedNotes] = useState(null);
    const [notesLoading, setNotesLoading] = useState(false);
    const [showEducational, setShowEducational] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    // Reset clinical notes panel when patient changes
    useEffect(() => {
        setShowClinicalNotes(false);
        setFormattedNotes(null); // Clear formatted notes cache
    }, [selectedPatient]);

    const fetchPatients = async () => {
        try {
            const res = await axios.get('/api/data');
            setPatients(res.data.records);
        } catch (err) {
            console.error("Failed to fetch patients", err);
        }
    };

    const handleSelectPatient = async (pid) => {
        setSelectedPatient(pid);
        setLoading(true);
        try {
            // Need to handle path encoding if slashes exist
            const res = await axios.get(`/api/data/${encodeURIComponent(pid)}`);
            setSignalData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const downloadSample = async () => {
        // Hardcoded logic for MVP demo
        const slug = signalType === 'Neuro' ? 'eegmmidb' : 'ptbdb';
        setLoading(true);
        try {
            await axios.post('/api/data/download', { db_slug: slug, num_records: 2 });
            await fetchPatients();
        } catch (err) {
            alert("Download failed");
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

    // Open clinical notes modal and format with AI
    const handleOpenClinicalNotes = () => {
        setShowClinicalNotes(true);
        if (signalData && signalData.comments && !formattedNotes) {
            formatNotesWithAI(signalData.comments);
        }
    };

    return (
        <div className="dashboard-grid">
            {/* Top Bar: Selector & Actions */}
            <div className="glass-panel" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <h2>{signalType} Workspace</h2>

                <select
                    className="patient-select"
                    value={selectedPatient || ''}
                    onChange={(e) => handleSelectPatient(e.target.value)}
                >
                    <option value="">Select a Record...</option>
                    {patients.map(p => <option key={p} value={p}>{p}</option>)}
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

                <button className="action-btn" onClick={fetchPatients}>
                    <RefreshCw size={18} />
                </button>

                <div style={{ flex: 1 }} />

                <button className="action-btn primary" onClick={downloadSample} disabled={loading}>
                    <Download size={18} style={{ marginRight: 8 }} />
                    Download Sample Data
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
                                        {selectedPatient} • {signalData.comments.length} {signalData.comments.length === 1 ? 'note' : 'notes'}
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
                />
            )}

            {/* Main Signal View */}
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                {loading && <div className="loading-overlay">Loading Data...</div>}

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
