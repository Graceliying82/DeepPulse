import React, { useState } from 'react';
import { useApiKey } from '../contexts/ApiKeyContext';

const SettingsModal = ({ isOpen, onClose }) => {
    const { apiKey, saveApiKey, clearApiKey, hasApiKey } = useApiKey();
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
                    <h2>⚙️ Settings</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-content">
                    <section className="settings-section">
                        <h3>🔑 Gemini API Key</h3>
                        <p className="settings-description">
                            DeepPulse uses Google's Gemini AI for signal analysis and chat.
                            Enter your own API key to use these features.
                        </p>

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
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
