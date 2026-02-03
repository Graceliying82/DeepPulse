import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Check, Loader2, Cloud, RefreshCw, Search } from 'lucide-react';

const RecordBrowser = ({ dbSlug, category, onClose, onDownloadComplete }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchInventory = async (forceSync = false) => {
        setLoading(!forceSync);
        setIsSyncing(forceSync);
        try {
            const url = forceSync
                ? `/api/inventory/${dbSlug}?sync=true`
                : `/api/inventory/${dbSlug}`;

            const response = await axios.get(url);
            setRecords(response.data.records);
        } catch (error) {
            console.error("Failed to fetch inventory:", error);
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        if (dbSlug) {
            fetchInventory();
        }
    }, [dbSlug]);

    const handleDownload = async (recordName) => {
        setDownloadingId(recordName);
        try {
            await axios.post('/api/data/download-record', {
                db_slug: dbSlug,
                record_name: recordName,
                category: category
            });

            setRecords(prev => prev.map(r =>
                r.record_name === recordName
                    ? { ...r, status: 'downloaded' }
                    : r
            ));

            if (onDownloadComplete) onDownloadComplete();

        } catch (error) {
            console.error(`Failed to download ${recordName}:`, error);
            alert("Download failed. Check console.");
        } finally {
            setDownloadingId(null);
        }
    };

    const filteredRecords = records.filter(r =>
        r.record_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            background: 'rgba(22, 27, 34, 0.5)'
        }}>
            {/* Header / Search */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
            }}>
                <div style={{
                    position: 'relative',
                    flex: 1
                }}>
                    <Search size={16} style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#a1a1aa'
                    }} />
                    <input
                        type="text"
                        placeholder={`Search ${records.length} records...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 38px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: '#E3E3E3',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
                <button
                    onClick={() => fetchInventory(true)}
                    disabled={isSyncing}
                    title="Sync with PhysioNet"
                    style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        color: '#a1a1aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    <RefreshCw size={16} className={isSyncing ? "spin-animation" : ""} />
                </button>
            </div>

            {/* List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1px'
            }}>
                {loading ? (
                    <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                        <Loader2 className="spin-animation" size={28} style={{ color: '#00f2ff' }} />
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#a1a1aa', fontSize: '14px' }}>
                        No records found.
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: '10px',
                        padding: '16px'
                    }}>
                        {filteredRecords.map(record => (
                            <div key={record.record_name} style={{
                                border: record.status === 'downloaded'
                                    ? '1px solid rgba(0, 242, 255, 0.4)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                background: record.status === 'downloaded'
                                    ? 'rgba(0, 242, 255, 0.08)'
                                    : 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '10px',
                                padding: '14px 10px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s',
                            }}>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: record.status === 'downloaded' ? '#00f2ff' : '#E3E3E3',
                                    textAlign: 'center',
                                    wordBreak: 'break-all'
                                }}>
                                    {record.record_name}
                                </span>

                                {record.status === 'downloaded' ? (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#34d399',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginTop: 'auto'
                                    }}>
                                        <Check size={14} />
                                        <span>Ready</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleDownload(record.record_name)}
                                        disabled={downloadingId === record.record_name}
                                        style={{
                                            marginTop: 'auto',
                                            padding: '6px 14px',
                                            fontSize: '12px',
                                            background: downloadingId === record.record_name
                                                ? 'rgba(161, 161, 170, 0.3)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            color: downloadingId === record.record_name
                                                ? '#a1a1aa'
                                                : '#E3E3E3',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: '14px',
                                            cursor: downloadingId === record.record_name ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {downloadingId === record.record_name ? (
                                            <Loader2 size={12} className="spin-animation" />
                                        ) : (
                                            <Download size={12} />
                                        )}
                                        Get
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
                .spin-animation { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default RecordBrowser;
