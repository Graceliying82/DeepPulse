import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SignalViewer from './SignalViewer';
import DownloadModal from './DownloadModal';
import { Download, RefreshCw, FileText, X, GraduationCap, Loader2 } from 'lucide-react';
import { captureSVGAsImage } from '../utils/signalCapture';

const Dashboard = ({
    signalType,
    selectedDatabase,
    setSelectedDatabase,
    selectedRecord,
    setSelectedRecord,
    signalData,
    setSignalData,
    setCachedSignalImage
}) => {
    const [databases, setDatabases] = useState([]);  // List of databases in category
    const [records, setRecords] = useState([]);  // Records in selected database
    const [loading, setLoading] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);

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

        try {
            const category = getCategoryKey();
            const res = await axios.get(`/api/data/${category}/${encodeURIComponent(recordPath)}`);
            setSignalData(res.data);


        } catch (err) {
            console.error("Failed to load record:", err);
        } finally {
            setLoading(false);
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



                <button className="action-btn" onClick={() => fetchDatabasesAndRecords(0)}>
                    <RefreshCw size={18} />
                </button>

                <div style={{ flex: 1 }} />

                <button className="action-btn primary" onClick={() => setShowDownloadModal(true)} disabled={loading}>
                    <Download size={18} style={{ marginRight: 8 }} />
                    Download Data
                </button>
            </div>



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
