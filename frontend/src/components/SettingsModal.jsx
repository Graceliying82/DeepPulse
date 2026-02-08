import React, { useState } from 'react';
import { useSettings, USER_ROLES } from '../contexts/SettingsContext';

const SettingsModal = ({ isOpen, onClose, onShowOnboarding }) => {
    const { apiKey, saveApiKey, clearApiKey, hasApiKey, userRole, saveUserRole } = useSettings();
    const [inputKey, setInputKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (inputKey.trim()) {
            saveApiKey(inputKey.trim());
            setInputKey('');
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2000);
        }
    };

    const handleClear = () => {
        clearApiKey();
        setInputKey('');
        setSaveStatus('cleared');
        setTimeout(() => setSaveStatus(''), 2000);
    };

    const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="settings-modal glass-panel" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        ⚙️ Settings
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: hasApiKey ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: hasApiKey ? '#22c55e' : '#f59e0b',
                            border: `1px solid ${hasApiKey ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        }}>
                            {hasApiKey ? 'API Key Set' : 'No API Key'}
                        </span>
                    </h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-content">
                    <section className="settings-section">
                        <h3>🔑 Gemini API Key</h3>
                        <p className="settings-description">
                            DeepPulse uses Google's Gemini AI for signal analysis and chat.
                            Enter your own API key to use these features.
                        </p>

                        <div className="settings-subsection">
                            <h4>👤 User Persona</h4>
                            <div className="persona-grid">
                                {USER_ROLES.map(role => (
                                    <div
                                        key={role.id}
                                        className={`persona-card ${userRole === role.id ? 'active' : ''}`}
                                        onClick={() => saveUserRole(role.id)}
                                    >
                                        <div className="persona-header">
                                            <span className="radio-indicator"></span>
                                            <span className="persona-label">{role.label}</span>
                                        </div>
                                        <span className="persona-desc">{role.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {hasApiKey ? (
                            <div className="api-key-status">
                                <div className="current-key">
                                    <span className="status-icon success">✓</span>
                                    <span className="key-display">
                                        {showKey ? apiKey : maskedKey}
                                    </span>
                                    <button
                                        className="icon-btn"
                                        onClick={() => setShowKey(!showKey)}
                                        title={showKey ? 'Hide key' : 'Show key'}
                                    >
                                        {showKey ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <button className="btn btn-danger" onClick={handleClear}>
                                    Remove Key
                                </button>
                            </div>
                        ) : (
                            <div className="api-key-input">
                                <div className="input-group">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={inputKey}
                                        onChange={(e) => setInputKey(e.target.value)}
                                        placeholder="Enter your Gemini API key"
                                        className="settings-input"
                                    />
                                    <button
                                        className="icon-btn"
                                        onClick={() => setShowKey(!showKey)}
                                        title={showKey ? 'Hide' : 'Show'}
                                    >
                                        {showKey ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={!inputKey.trim()}
                                >
                                    Save Key
                                </button>
                            </div>
                        )}

                        {saveStatus && (
                            <div className={`save-status ${saveStatus}`}>
                                {saveStatus === 'saved' ? '✓ API key saved!' : 'API key removed'}
                            </div>
                        )}

                        <div className="api-key-help">
                            <h4>How to get an API key:</h4>
                            <ol>
                                <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                                <li>Sign in with your Google account</li>
                                <li>Click "Create API Key"</li>
                                <li>Copy and paste the key here</li>
                            </ol>
                            <p className="note">
                                ℹ️ The free tier includes 15 requests/minute and 1 million tokens/month.
                                Your key is stored locally in your browser and never sent to our servers.
                            </p>
                        </div>
                    </section>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: '#71717a',
                        padding: '12px 16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        marginTop: '8px'
                    }}>
                        <span>DeepPulse is an educational and research tool.</span>
                        <button
                            onClick={onShowOnboarding}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#a1a1aa',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Onboard Again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
