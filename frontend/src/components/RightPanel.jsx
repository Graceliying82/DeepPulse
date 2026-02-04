import React, { useState, useEffect } from 'react';
import { MessageSquare, GraduationCap, FileText, X, ChevronRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import ChatAssistant from './ChatAssistant';
import EducationalPanel from './EducationalPanel';

// Clinical Notes Panel Component
const ClinicalNotesPanel = ({ signalData }) => {
    const [formattedNotes, setFormattedNotes] = useState(null);
    const [loading, setLoading] = useState(false);
    const notes = signalData?.comments || [];

    useEffect(() => {
        if (!notes.length) return;

        const formatNotes = async () => {
            setLoading(true);
            try {
                const response = await axios.post('/api/ai/format-notes', { notes });
                setFormattedNotes(response.data.formatted);
            } catch (error) {
                console.error('Failed to format notes:', error);
                setFormattedNotes(notes.map(n => ({ label: 'Note', value: n })));
            } finally {
                setLoading(false);
            }
        };

        // Reset when signal changes
        setFormattedNotes(null);
        formatNotes();
    }, [signalData]);

    if (!signalData) return <div className="empty-state">No data selected</div>;
    if (!notes.length) return (
        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
            <FileText size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
            <p>No clinical notes available for this record.</p>
        </div>
    );

    return (
        <div className="educational-content" style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#e3e3e3', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText className="text-blue-500" size={20} style={{ color: '#3b82f6' }} />
                Clinical Notes
            </h3>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p>AI is formatting notes...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {formattedNotes?.map((note, idx) => (
                        <div key={idx} style={{
                            backgroundColor: '#f9fafb',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                marginBottom: '4px'
                            }}>
                                {note.label}
                            </div>
                            <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5' }}>
                                {note.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const RightPanel = ({
    isOpen,
    onClose,
    activeTab,
    setActiveTab,
    signalType,
    signalData, // Needed for EducationalPanel & Notes
    preloadedImage // Needed for EducationalPanel
}) => {
    if (!isOpen) return null;

    return (
        <div className="right-panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header / Tabs */}
            <div className="glass-panel" style={{
                borderRadius: 0,
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
                    {[
                        { id: 'chat', label: 'Chat', icon: MessageSquare },
                        { id: 'learn', label: 'Learn', icon: GraduationCap },
                        { id: 'notes', label: 'Notes', icon: FileText },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#aaa',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="icon-btn"
                    title="Collapse Panel"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px'
                    }}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {activeTab === 'chat' && <ChatAssistant signalType={signalType} />}

                {activeTab === 'learn' && (
                    <div style={{ height: '100%', overflowY: 'auto' }}>
                        {signalData ? (
                            <EducationalPanel
                                signalData={signalData}
                                onClose={() => { }}
                                preloadedImage={preloadedImage}
                                isSidebarMode={true}
                            />
                        ) : (
                            <div className="empty-state" style={{ flexDirection: 'column', padding: '40px', textAlign: 'center' }}>
                                <GraduationCap size={48} style={{ color: '#374151', marginBottom: '16px' }} />
                                <p>Select a signal record.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'notes' && (
                    <ClinicalNotesPanel signalData={signalData} />
                )}
            </div>
        </div>
    );
};

export default RightPanel;
