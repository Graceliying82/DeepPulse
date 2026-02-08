import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Check, Loader2, Search } from 'lucide-react';

const RecordBrowser = ({ dbSlug, category }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (dbSlug) {
            fetchInventory();
        }
    }, [dbSlug]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/inventory/${dbSlug}`);
            setRecords(response.data.records || []);
        } catch (error) {
            console.error("Failed to fetch inventory:", error);
        } finally {
            setLoading(false);
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
            {/* Search */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{
                        position: 'absolute', left: '12px', top: '50%',
                        transform: 'translateY(-50%)', color: '#a1a1aa'
                    }} />
                    <input
                        type="text"
                        placeholder={`Search ${records.length} records...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px 10px 38px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px', fontSize: '14px',
                            background: 'rgba(0, 0, 0, 0.3)', color: '#E3E3E3',
                            outline: 'none', boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1px' }}>
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
                        gap: '10px', padding: '16px'
                    }}>
                        {filteredRecords.map(record => (
                            <div key={record.record_name} style={{
                                border: '1px solid rgba(0, 242, 255, 0.4)',
                                background: 'rgba(0, 242, 255, 0.08)',
                                borderRadius: '10px',
                                padding: '14px 10px',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: '10px'
                            }}>
                                <span style={{
                                    fontSize: '14px', fontWeight: 500,
                                    color: '#00f2ff', textAlign: 'center', wordBreak: 'break-all'
                                }}>
                                    {record.record_name}
                                </span>
                                <div style={{
                                    fontSize: '12px', color: '#34d399',
                                    display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto'
                                }}>
                                    <Check size={14} />
                                    <span>Available</span>
                                </div>
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
