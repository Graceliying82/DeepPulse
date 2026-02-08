import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2 } from 'lucide-react';
import geminiIcon from '../assets/gemini.png';
import { useSettings } from '../contexts/SettingsContext';

// Welcome message from Pulse
const WELCOME_MESSAGE = {
    role: 'assistant',
    content: `What would you like to explore?`
};

// Suggestions per signal category (keys must match Sidebar signalType values)
const CATEGORY_SUGGESTIONS = {
    Cardiac: [
        "Explain this ECG signal",
        "What does a normal P-wave look like?",
        "How do I use Learn mode for ECG?"
    ],
    Neuro: [
        "What do alpha and beta waves mean?",
        "How do I identify seizure patterns in EEG?",
        "Explain this EEG recording"
    ],
    Hemodynamic: [
        "Explain blood pressure waveforms",
        "What is pulse pressure?",
        "How do I read ABP signals?"
    ],
    Respiration: [
        "What is a normal breathing rate?",
        "Explain respiratory signal features",
        "How do I interpret this waveform?"
    ],
};

// Fallback default
const DEFAULT_SUGGESTIONS = [
    "How do I get started?",
    "What databases are available?",
    "Help me read a signal"
];

/**
 * Convert a Blob to a base64 string (without the data:... prefix).
 */
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Strip the "data:image/png;base64," prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Suggestion Chips Component
 * Displays clickable suggestion buttons
 */
const SuggestionChips = ({ suggestions, onSelect, disabled }) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className="suggestion-chips">
            {suggestions.map((suggestion, idx) => (
                <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => onSelect(suggestion)}
                    disabled={disabled}
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
};

/**
 * Typing Indicator Component
 */
const TypingIndicator = () => (
    <div className="message assistant">
        <div className="avatar">
            <img src={geminiIcon} alt="Pulse" />
        </div>
        <div className="bubble typing-bubble">
            <span className="typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
            </span>
        </div>
    </div>
);

const ChatAssistant = ({ signalType, signalData, preloadedImage }) => {
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [suggestions, setSuggestions] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasUserSent, setHasUserSent] = useState(false);
    const scrollRef = useRef(null);
    const { apiKey, userRole } = useSettings();

    // Stable key for the current patient/record
    const recordKey = signalData
        ? `${signalData.database || ''}-${signalData.record_name || ''}`
        : null;

    // Pick initial suggestions based on signal category
    const getInitialSuggestions = useCallback(() => {
        if (signalType && CATEGORY_SUGGESTIONS[signalType]) {
            return CATEGORY_SUGGESTIONS[signalType];
        }
        return DEFAULT_SUGGESTIONS;
    }, [signalType]);

    // Reset conversation when patient/record changes
    useEffect(() => {
        setMessages([WELCOME_MESSAGE]);
        setSuggestions(getInitialSuggestions());
        setInput('');
        setHasUserSent(false);
    }, [recordKey]);

    // Build signal metadata object from signalData
    const buildSignalMetadata = useCallback(() => {
        if (!signalData) return null;
        return {
            channel_names: signalData.channel_names || null,
            sampling_frequency: signalData.sampling_frequency || null,
            record_name: signalData.record_name || null,
            database: signalData.database || null,
            comments: signalData.comments || null,
        };
    }, [signalData]);

    // Update context note when signal type changes
    useEffect(() => {
        if (signalType && messages.length > 1) {
            const contextNote = {
                role: 'assistant',
                content: `*Context updated: Now viewing **${signalType}** signals*`
            };
            setMessages(prev => [...prev, contextNote]);
        }
        // Update initial suggestions if user hasn't chatted yet
        if (!hasUserSent && signalType) {
            setSuggestions(CATEGORY_SUGGESTIONS[signalType] || DEFAULT_SUGGESTIONS);
        }
    }, [signalType]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Handle sending a message
    const handleSend = async (messageText = null) => {
        const textToSend = messageText || input.trim();
        if (!textToSend) return;

        const userMsg = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setHasUserSent(true);
        setSuggestions([]); // Clear suggestions while loading

        try {
            // Convert cached image to base64 if available
            let signalImageB64 = null;
            if (preloadedImage) {
                try {
                    signalImageB64 = await blobToBase64(preloadedImage);
                } catch (err) {
                    console.warn('Failed to encode signal image:', err);
                }
            }

            const payload = {
                messages: [...messages, userMsg],
                signal_context: signalType ? `Active Signal Domain: ${signalType}` : 'No signal loaded',
                include_suggestions: true,
                api_key: apiKey || undefined,
                user_role: userRole,
                signal_image: signalImageB64 || undefined,
                signal_metadata: buildSignalMetadata() || undefined,
            };

            const response = await api.post('/api/chat', payload);

            const botMsg = { role: 'assistant', content: response.data.content };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            let errorContent = "Oops! I had trouble connecting. Please check your internet connection and try again.";

            // Check if it's an API key error
            if (error.response?.data?.detail?.includes('API Key') || !apiKey) {
                errorContent = "To chat with me, please add your Gemini API key in Settings (gear icon at bottom-right). It's free!";
            }

            const errorMsg = {
                role: 'assistant',
                content: errorContent
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    // Handle suggestion chip click
    const handleSuggestionClick = (suggestion) => {
        handleSend(suggestion);
    };

    // Handle Enter key press
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-container">
            {/* Header */}
            <div className="chat-header glass-panel">
                <img src={geminiIcon} alt="Gemini" className="header-icon" />
                <div className="header-text">
                    <h3>Gemini Assistant</h3>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={scrollRef}>
                {messages.map((m, idx) => (
                    <div key={idx} className={`message ${m.role}`}>
                        {m.role === 'assistant' && (
                            <div className="avatar">
                                <img src={geminiIcon} alt="Pulse" />
                            </div>
                        )}
                        <div className="bubble">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {loading && <TypingIndicator />}
            </div>

            {/* Suggestion Chips - only before first user message */}
            {!hasUserSent && !loading && suggestions.length > 0 && (
                <div className="suggestions-container">
                    <SuggestionChips
                        suggestions={suggestions}
                        onSelect={handleSuggestionClick}
                        disabled={loading}
                    />
                </div>
            )}

            {/* Input Area */}
            <div className="chat-input-area glass-panel">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    disabled={loading}
                />
                <button
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim()}
                >
                    {loading ? <Loader2 className="spin-animation" size={20} /> : <Send size={20} />}
                </button>
            </div>
        </div>
    );
};

export default ChatAssistant;
