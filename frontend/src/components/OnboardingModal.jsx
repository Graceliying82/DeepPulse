import React, { useState } from 'react';
import { useSettings, USER_ROLES } from '../contexts/SettingsContext';
import geminiIcon from '../assets/gemini.png';
import onboardingImg from '../assets/onboarding.png';

const OnboardingModal = ({ onComplete }) => {
    const { saveApiKey, saveUserRole, userRole } = useSettings();
    const [step, setStep] = useState(0);
    const [selectedRole, setSelectedRole] = useState(userRole);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showKey, setShowKey] = useState(false);

    const handleFinish = () => {
        saveUserRole(selectedRole);
        if (apiKeyInput.trim()) {
            saveApiKey(apiKeyInput.trim());
        }
        onComplete();
    };

    return (
        <div className="modal-overlay">
            <div className={`onboarding-modal glass-panel ${step === 0 ? 'onboarding-wide' : ''}`}>
                {step === 0 && (
                    <>
                        <div className="onboarding-header">
                            <img src={geminiIcon} alt="DeepPulse" className="onboarding-logo" />
                            <h2>Welcome to DeepPulse</h2>
                            <p className="onboarding-subtitle">
                                Explore medical signals with AI-powered assistance.
                                Here's a quick look at what you'll find.
                            </p>
                        </div>

                        <div className="onboarding-section">
                            <img
                                src={onboardingImg}
                                alt="App overview showing workspaces, signal viewer, AI chat, and learning tools"
                                className="onboarding-overview-img"
                            />
                        </div>

                        <button className="btn-primary onboarding-start" onClick={() => setStep(1)}>
                            Continue
                        </button>
                    </>
                )}

                {step === 1 && (
                    <>
                        <div className="onboarding-header">
                            <h2>Set Up Your Profile</h2>
                            <p className="onboarding-subtitle">
                                Pick your experience level to get started.
                            </p>
                        </div>

                        <div className="onboarding-section">
                            <h4>I am a...</h4>
                            <div className="persona-grid">
                                {USER_ROLES.map(role => (
                                    <div
                                        key={role.id}
                                        className={`persona-card ${selectedRole === role.id ? 'active' : ''}`}
                                        onClick={() => setSelectedRole(role.id)}
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

                        <div className="onboarding-section">
                            <h4>Gemini API Key <span className="optional-tag">optional</span></h4>
                            <p className="onboarding-hint">
                                Get a free key from{' '}
                                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                                    Google AI Studio
                                </a>
                                . You can add it later in Settings.
                            </p>
                            <div className="input-group">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    placeholder="Paste your API key here"
                                    className="settings-input"
                                />
                                <button
                                    className="icon-btn"
                                    onClick={() => setShowKey(!showKey)}
                                >
                                    {showKey ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <div className="onboarding-nav">
                            <button className="btn-secondary" onClick={() => setStep(0)}>
                                Back
                            </button>
                            <button className="btn-primary onboarding-start" onClick={handleFinish}>
                                Get Started
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default OnboardingModal;
