import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import geminiIcon from '../assets/gemini.png';

// Welcome message from Pulse
const WELCOME_MESSAGE = {
    role: 'assistant',
    content: `👋 Hi! I'm **Pulse**, your DeepPulse guide!

I can help you:
- 📊 Understand medical signals (ECG, EEG, etc.)
- 🗄️ Find the right PhysioNet database
- 🎓 Practice with Learn mode
- 💡 Navigate DeepPulse features

What would you like to explore?`
};

// Default suggestions for new conversations
const DEFAULT_SUGGESTIONS = [
    "🎯 How do I get started?",
    "📂 What databases are available?",
    "🎓 How do I practice reading signals?"
];

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

const ChatAssistant = ({ signalType }) => {
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Update context note when signal type changes
    useEffect(() => {
        if (signalType && messages.length > 1) {
            // Only add context note if conversation has progressed
            const contextNote = {
                role: 'assistant',
                content: `📍 *Context updated: Now viewing **${signalType}** signals*`
            };
            setMessages(prev => [...prev, contextNote]);

            // Update suggestions based on new context
            updateSuggestionsForContext(signalType);
        }
    }, [signalType]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Update suggestions based on signal context
    const updateSuggestionsForContext = (context) => {
        if (!context) {
            setSuggestions(DEFAULT_SUGGESTIONS);
            return;
        }

        const contextLower = context.toLowerCase();
        if (contextLower.includes('cardiac')) {
            setSuggestions([
                "🎓 How do I practice ECG reading?",
                "💓 Explain the ECG grid",
                "📝 How do I use Clinical Notes?"
            ]);
        } else if (contextLower.includes('neurological')) {
            setSuggestions([
                "🧠 What do the frequency bands mean?",
                "🎓 Practice with Quiz mode",
                "📊 Why are channels stacked?"
            ]);
        } else {
            setSuggestions(DEFAULT_SUGGESTIONS);
        }
    };

    // Handle sending a message
    const handleSend = async (messageText = null) => {
        const textToSend = messageText || input.trim();
        if (!textToSend) return;

        const userMsg = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setSuggestions([]); // Clear suggestions while loading

        try {
            const response = await axios.post('/api/chat', {
                messages: [...messages, userMsg],
                signal_context: signalType ? `Active Signal Domain: ${signalType}` : 'No signal loaded',
                include_suggestions: true
            });

            const botMsg = { role: 'assistant', content: response.data.content };
            setMessages(prev => [...prev, botMsg]);

            // Update suggestions from API response
            if (response.data.suggestions && response.data.suggestions.length > 0) {
                setSuggestions(response.data.suggestions);
            } else {
                updateSuggestionsForContext(signalType);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = {
                role: 'assistant',
                content: "😅 Oops! I had trouble connecting. Please check your internet connection and try again."
            };
            setMessages(prev => [...prev, errorMsg]);
            setSuggestions(["🔄 Try again", "❓ What can you help with?"]);
        } finally {
            setLoading(false);
        }
    };

    // Handle suggestion chip click
    const handleSuggestionClick = (suggestion) => {
        // Remove emoji prefix for cleaner message (optional)
        const cleanedMessage = suggestion.replace(/^[^\s]+\s/, '');
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
                <img src={geminiIcon} alt="Pulse" className="header-icon" />
                <div className="header-text">
                    <h3>Pulse</h3>
                    <span className="header-subtitle">DeepPulse Assistant</span>
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

            {/* Suggestion Chips */}
            {!loading && suggestions.length > 0 && (
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
                    placeholder="Ask Pulse anything..."
                    disabled={loading}
                />
                <button
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim()}
                    className={loading ? 'loading' : ''}
                >
                    <span className="material-symbols-outlined">
                        {loading ? 'hourglass_empty' : 'send'}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default ChatAssistant;
