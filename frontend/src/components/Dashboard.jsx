import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SignalViewer from './SignalViewer';
import { Download, RefreshCw } from 'lucide-react';

const Dashboard = ({ signalType }) => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [signalData, setSignalData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

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

                <button className="action-btn" onClick={fetchPatients}>
                    <RefreshCw size={18} />
                </button>

                <div style={{ flex: 1 }} />

                <button className="action-btn primary" onClick={downloadSample} disabled={loading}>
                    <Download size={18} style={{ marginRight: 8 }} />
                    Download Sample Data
                </button>
            </div>

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
