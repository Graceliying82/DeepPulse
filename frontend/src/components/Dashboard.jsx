import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import SignalViewer from './SignalViewer';
import { RefreshCw, Loader2 } from 'lucide-react';
import { captureSVGAsImage } from '../utils/signalCapture';

// All signal types in fallback priority order
const ALL_SIGNAL_TYPES = ['Cardiac', 'Neuro', 'Hemodynamic', 'Respiration'];

const CATEGORY_MAP = {
    'Cardiac': 'cardiac',
    'Neuro': 'neurological',
    'Hemodynamic': 'hemodynamic',
    'Respiration': 'respiration',
    'Motion': 'motion'
};

const Dashboard = ({
    signalType,
    setSignalType,
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
    const [fallbackNotice, setFallbackNotice] = useState(null);
    const skipNextSignalEffect = useRef(false);

    // Map signalType to category key
    const getCategoryKey = () => {
        return CATEGORY_MAP[signalType] || 'cardiac';
    };

    // Try to load a single record. Returns data on success, null on failure.
    const tryLoadRecord = async (category, recordPath) => {
        try {
            const res = await api.get(`/api/data/${category}/${encodeURIComponent(recordPath)}`);
            return res.data || null;
        } catch {
            return null;
        }
    };

    // Try all records across all databases for a given category.
    // Fallback order: patients in db1 -> patients in db2 -> ... -> null
    const tryLoadFromCategory = async (category, allRecords, dbList) => {
        for (const db of dbList) {
            const dbRecords = allRecords.filter(r => r.startsWith(db + '/'));
            for (const record of dbRecords) {
                const data = await tryLoadRecord(category, record);
                if (data) return { db, record, data };
            }
        }
        return null;
    };

    // Fetch category records from the API, parse into dbList + records
    const fetchCategoryRecords = async (category) => {
        const res = await api.get(`/api/data/category/${category}`);
        const allRecords = res.data.records || [];
        const dbSet = new Set();
        allRecords.forEach(r => {
            const parts = r.split('/');
            if (parts.length > 0) dbSet.add(parts[0]);
        });
        return { allRecords, dbList: Array.from(dbSet).sort() };
    };

    // Fetch databases and records for the current category
    const fetchDatabasesAndRecords = async (retryCount = 0, autoSelect = false) => {
        try {
            const category = getCategoryKey();
            const { allRecords, dbList } = await fetchCategoryRecords(category);

            setDatabases(dbList);
            setRecords(allRecords);

            if (!autoSelect) {
                setFallbackNotice(null);
                return;
            }

            // Step 1: Try all patients across all databases in THIS category
            if (dbList.length > 0) {
                setLoading(true);
                const result = await tryLoadFromCategory(category, allRecords, dbList);
                if (result) {
                    setSelectedDatabase(result.db);
                    setSelectedRecord(result.record);
                    setSignalData(result.data);
                    setFallbackNotice(null);
                    setLoading(false);
                    return; // Found working data in this category
                }
                setLoading(false);
            }

            // Step 2: All records in this category failed. Try other workspaces.
            for (const st of ALL_SIGNAL_TYPES) {
                if (st === signalType) continue;
                const otherCat = CATEGORY_MAP[st];
                try {
                    const other = await fetchCategoryRecords(otherCat);
                    if (other.dbList.length === 0) continue;
                    const result = await tryLoadFromCategory(otherCat, other.allRecords, other.dbList);
                    if (result) {
                        setFallbackNotice(`No data for ${signalType}. Switched to ${st}.`);
                        setDatabases(other.dbList);
                        setRecords(other.allRecords);
                        setSelectedDatabase(result.db);
                        setSelectedRecord(result.record);
                        setSignalData(result.data);
                        skipNextSignalEffect.current = true;
                        setSignalType(st);
                        return;
                    }
                } catch {
                    continue;
                }
            }

            // Step 3: Nothing works anywhere
            setFallbackNotice('No downloaded data found. Use the Database Manager to download datasets.');
        } catch (err) {
            console.error("Failed to fetch data", err);
            if (retryCount < 3) {
                setTimeout(() => fetchDatabasesAndRecords(retryCount + 1, autoSelect), 1000 * (retryCount + 1));
            }
        }
    };

    // Load databases on mount with auto-select
    useEffect(() => {
        fetchDatabasesAndRecords(0, true);
    }, []);

    // Reset and auto-select when signalType changes
    useEffect(() => {
        if (skipNextSignalEffect.current) {
            skipNextSignalEffect.current = false;
            return;
        }
        setSelectedDatabase('');
        setSelectedRecord('');
        setSignalData(null);
        fetchDatabasesAndRecords(0, true);
    }, [signalType]);

    // Get records filtered by selected database (show first 10)
    const getFilteredRecords = () => {
        if (!selectedDatabase) return [];
        return records
            .filter(r => r.startsWith(selectedDatabase + '/'))
            .slice(0, 10)
            .map(r => {
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
            const res = await api.get(`/api/data/${category}/${encodeURIComponent(recordPath)}`);
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
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
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
                    <option value="">Select Patient...</option>
                    {getFilteredRecords().map(r => (
                        <option key={r.fullPath} value={r.fullPath}>{r.displayName}</option>
                    ))}
                </select>



                <button className="action-btn" onClick={() => fetchDatabasesAndRecords(0)}>
                    <RefreshCw size={18} />
                </button>

                {fallbackNotice && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#eab308',
                        marginLeft: 'auto',
                        whiteSpace: 'nowrap'
                    }}>
                        <span>{fallbackNotice}</span>
                        <button
                            onClick={() => setFallbackNotice(null)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#eab308',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontSize: '16px',
                                lineHeight: 1
                            }}
                        >
                            x
                        </button>
                    </div>
                )}

            </div>

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
