import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import geminiIcon from '../assets/gemini.png';

const ChatAssistant = ({ signalType }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hello! I am your ${signalType} Research Assistant. How can I help you analyze the data?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Auto-update welcome message when type changes (optional, or just append)
    useEffect(() => {
        // Optional: Add a system note or just let the context shifting happen silently
        // setMessages(prev => [...prev, {role: 'system', content: `Context switched to ${signalType}`}])
    }, [signalType]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Prepare history for API
            const response = await axios.post('/api/chat', {
                messages: [...messages, userMsg],
                signal_context: `Active Signal Domain: ${signalType}`
            });

            const botMsg = { role: 'assistant', content: response.data.content };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Error connecting effectively to AI agent." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header glass-panel">
                <img src={geminiIcon} alt="AI" className="header-icon" />
                <h3>AI Assistant</h3>
            </div>

            <div className="chat-messages" ref={scrollRef}>
                {messages.map((m, idx) => (
                    <div key={idx} className={`message ${m.role}`}>
                        {m.role === 'assistant' && (
                            <div className="avatar">
                                <img src={geminiIcon} alt="AI" />
                            </div>
                        )}
                        <div className="bubble">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="message assistant">
                        <div className="avatar">
                            <img src={geminiIcon} alt="AI" />
                        </div>
                        <div className="bubble"><span className="typing-dot">...</span></div>
                    </div>
                )}
            </div>

            <div className="chat-input-area glass-panel">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about the signal..."
                />
                <button onClick={handleSend} disabled={loading}>
                    <span className="material-symbols-outlined">send</span>
                </button>
            </div>
        </div>
    );
};

export default ChatAssistant;
