import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, Lightbulb, Brain, GraduationCap } from 'lucide-react';
import { captureSVGAsImage } from '../utils/signalCapture';

const EducationalPanel = ({ signalData, onClose }) => {
    const [mode, setMode] = useState('hints');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Hints mode state
    const [hintsResponse, setHintsResponse] = useState(null);
    const [revealedHints, setRevealedHints] = useState(0);

    // Quiz mode state
    const [quizData, setQuizData] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    // Advanced mode state
    const [userDiagnosis, setUserDiagnosis] = useState('');
    const [advancedFeedback, setAdvancedFeedback] = useState(null);

    const svgRef = useRef(null);

    // Capture SVG and call AI analysis
    const analyzeSignal = async (analysisMode, userNotes = null) => {
        setLoading(true);
        setError(null);

        try {
            // Find the SVG element in the signal viewer
            const svgElement = document.querySelector('.signal-viewer-svg');
            if (!svgElement) {
                throw new Error('Signal viewer not found. Please ensure a signal is loaded.');
            }

            // Capture SVG as image
            const imageBlob = await captureSVGAsImage(svgElement);

            // Prepare form data
            const formData = new FormData();
            formData.append('file', imageBlob, 'signal.png');
            formData.append('mode', analysisMode);
            formData.append('signal_type', 'Cardiac'); // Default, could be derived from signalData
            if (userNotes) {
                formData.append('user_notes', userNotes);
            }
            if (signalData.comments) {
                formData.append('metadata', JSON.stringify(signalData.comments));
            }

            // Call API
            const response = await axios.post('/api/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            return response.data;
        } catch (err) {
            console.error('Analysis failed:', err);
            const errorMessage = err.response?.data?.detail || err.message || 'Unknown error occurred';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Hints mode handler
    const handleGetHints = async () => {
        try {
            const result = await analyzeSignal('hints');
            if (result.error) {
                setError(result.message || 'Failed to get hints');
            } else {
                setHintsResponse(result.response);
                setRevealedHints(0); // Reset revealed hints
            }
        } catch (err) {
            console.error('Hints mode error:', err);
            setError(err.message || 'Failed to get hints. Please check console for details.');
        }
    };

    // Parse hints from AI response
    const parseHints = (responseText) => {
        if (!responseText) return [];

        // Try to split by numbered list (1., 2., 3. or 1), 2), 3))
        const hintPatterns = [
            /(?:^|\n)\s*(\d+)[.)]\s*(.+?)(?=\n\s*\d+[.)]|\n*$)/gs,
            /(?:^|\n)\s*(?:Hint|HINT)\s*(\d+)[:\-\s]+(.+?)(?=\n\s*(?:Hint|HINT)\s*\d+|$)/gis,
        ];

        for (const pattern of hintPatterns) {
            const matches = [...responseText.matchAll(pattern)];
            if (matches.length >= 3) {
                return matches.map(m => m[2].trim());
            }
        }

        // Fallback: split by newlines and take first 3 non-empty lines
        const lines = responseText.split('\n').filter(line => line.trim().length > 10);
        return lines.slice(0, 3);
    };

    // Quiz mode handler
    const handleStartQuiz = async () => {
        try {
            const result = await analyzeSignal('quiz');
            if (result.error) {
                setError(result.message || 'Failed to start quiz');
            } else if (Array.isArray(result)) {
                // Shuffle quiz options to randomize
                const shuffled = [...result].sort(() => Math.random() - 0.5);
                setQuizData(shuffled);
                setSelectedAnswer(null);
                setQuizSubmitted(false);
            } else {
                setError('Invalid quiz response format');
            }
        } catch (err) {
            console.error('Quiz mode error:', err);
            setError(err.message || 'Failed to start quiz. Please check console for details.');
        }
    };

    const handleSubmitQuiz = () => {
        if (selectedAnswer === null) {
            setError('Please select an answer');
            return;
        }
        setQuizSubmitted(true);
    };

    // Advanced mode handler
    const handleGetFeedback = async () => {
        if (!userDiagnosis.trim()) {
            setError('Please enter your diagnosis first');
            return;
        }

        try {
            const result = await analyzeSignal('full', userDiagnosis);
            if (result.error) {
                setError(result.message || 'Failed to get feedback');
            } else {
                setAdvancedFeedback(result.response);
            }
        } catch (err) {
            console.error('Advanced mode error:', err);
            setError(err.message || 'Failed to get feedback. Please check console for details.');
        }
    };

    // Mode change handler - reset state
    const handleModeChange = (newMode) => {
        setMode(newMode);
        setError(null);
        // Don't reset data - let user switch between modes without losing progress
    };

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
                onClick={onClose}
            >
                {/* Modal Content */}
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxWidth: '700px',
                        width: '100%',
                        maxHeight: '85vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                                Learn & Practice
                            </h3>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: '#6b7280',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    e.currentTarget.style.color = '#111827';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#6b7280';
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mode Tabs */}
                        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                            <button
                                className={`mode-tab ${mode === 'hints' ? 'active' : ''}`}
                                onClick={() => handleModeChange('hints')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px 6px 0 0',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    backgroundColor: mode === 'hints' ? '#3b82f6' : 'transparent',
                                    color: mode === 'hints' ? 'white' : '#6b7280',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Lightbulb size={16} />
                                Hints
                            </button>
                            <button
                                className={`mode-tab ${mode === 'quiz' ? 'active' : ''}`}
                                onClick={() => handleModeChange('quiz')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px 6px 0 0',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    backgroundColor: mode === 'quiz' ? '#3b82f6' : 'transparent',
                                    color: mode === 'quiz' ? 'white' : '#6b7280',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Brain size={16} />
                                Quiz
                            </button>
                            <button
                                className={`mode-tab ${mode === 'advanced' ? 'active' : ''}`}
                                onClick={() => handleModeChange('advanced')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px 6px 0 0',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    backgroundColor: mode === 'advanced' ? '#3b82f6' : 'transparent',
                                    color: mode === 'advanced' ? 'white' : '#6b7280',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <GraduationCap size={16} />
                                Advanced
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div style={{
                        padding: '24px',
                        overflowY: 'auto',
                        flex: 1
                    }}>
                        {/* Error Display */}
                        {error && (
                            <div style={{
                                backgroundColor: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '12px',
                                marginBottom: '16px',
                                color: '#991b1b',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '40px',
                                color: '#6b7280'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    border: '3px solid #e5e7eb',
                                    borderTop: '3px solid #3b82f6',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                <p style={{ marginTop: '16px', fontSize: '14px' }}>
                                    AI is analyzing the signal...
                                </p>
                            </div>
                        )}

                        {/* Hints Mode */}
                        {mode === 'hints' && !loading && (
                            <div>
                                {!hintsResponse ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                        <Lightbulb size={48} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                            Get progressive hints to help you identify patterns in the signal without revealing the diagnosis.
                                        </p>
                                        <button
                                            onClick={handleGetHints}
                                            style={{
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '10px 20px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                        >
                                            Get Hints
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {parseHints(hintsResponse).map((hint, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    backgroundColor: idx <= revealedHints ? '#f0f9ff' : '#f9fafb',
                                                    border: `1px solid ${idx <= revealedHints ? '#3b82f6' : '#e5e7eb'}`,
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    marginBottom: '12px',
                                                    opacity: idx <= revealedHints ? 1 : 0.5,
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: '#3b82f6',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    marginBottom: '8px'
                                                }}>
                                                    Hint {idx + 1}
                                                </div>
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: idx <= revealedHints ? '#111827' : '#9ca3af',
                                                    lineHeight: '1.6'
                                                }}>
                                                    {idx <= revealedHints ? hint : '??? Click below to reveal'}
                                                </div>
                                            </div>
                                        ))}

                                        {revealedHints < parseHints(hintsResponse).length - 1 && (
                                            <button
                                                onClick={() => setRevealedHints(prev => prev + 1)}
                                                style={{
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '10px 20px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    marginTop: '8px',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                            >
                                                Reveal Next Hint
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setHintsResponse(null);
                                                setRevealedHints(0);
                                            }}
                                            style={{
                                                backgroundColor: 'transparent',
                                                color: '#6b7280',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                padding: '10px 20px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                marginTop: '8px',
                                                marginLeft: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                                e.currentTarget.style.borderColor = '#9ca3af';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.borderColor = '#d1d5db';
                                            }}
                                        >
                                            Start Over
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quiz Mode */}
                        {mode === 'quiz' && !loading && (
                            <div>
                                {!quizData ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                        <Brain size={48} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                            Test your knowledge with a multiple-choice question. Select your answer and see immediate feedback.
                                        </p>
                                        <button
                                            onClick={handleStartQuiz}
                                            style={{
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '10px 20px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                        >
                                            Start Quiz
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                                            What is the most likely diagnosis based on this signal?
                                        </p>

                                        {quizData.map((option, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => !quizSubmitted && setSelectedAnswer(idx)}
                                                style={{
                                                    border: `2px solid ${
                                                        quizSubmitted
                                                            ? option.is_correct
                                                                ? '#10b981'
                                                                : selectedAnswer === idx
                                                                ? '#ef4444'
                                                                : '#e5e7eb'
                                                            : selectedAnswer === idx
                                                            ? '#3b82f6'
                                                            : '#e5e7eb'
                                                    }`,
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    marginBottom: '12px',
                                                    cursor: quizSubmitted ? 'default' : 'pointer',
                                                    backgroundColor: quizSubmitted
                                                        ? option.is_correct
                                                            ? '#f0fdf4'
                                                            : selectedAnswer === idx
                                                            ? '#fef2f2'
                                                            : 'white'
                                                        : selectedAnswer === idx
                                                        ? '#eff6ff'
                                                        : 'white',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                    <input
                                                        type="radio"
                                                        checked={selectedAnswer === idx}
                                                        onChange={() => !quizSubmitted && setSelectedAnswer(idx)}
                                                        disabled={quizSubmitted}
                                                        style={{ marginTop: '2px' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{
                                                            fontSize: '14px',
                                                            fontWeight: 500,
                                                            color: '#111827',
                                                            marginBottom: quizSubmitted ? '8px' : '0'
                                                        }}>
                                                            {option.diagnosis}
                                                            {quizSubmitted && option.is_correct && (
                                                                <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ Correct</span>
                                                            )}
                                                            {quizSubmitted && !option.is_correct && selectedAnswer === idx && (
                                                                <span style={{ color: '#ef4444', marginLeft: '8px' }}>✗ Incorrect</span>
                                                            )}
                                                        </div>
                                                        {quizSubmitted && option.explanation && (
                                                            <div style={{
                                                                fontSize: '13px',
                                                                color: '#6b7280',
                                                                lineHeight: '1.5',
                                                                marginTop: '8px',
                                                                paddingTop: '8px',
                                                                borderTop: '1px solid #e5e7eb'
                                                            }}>
                                                                {option.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {!quizSubmitted ? (
                                            <button
                                                onClick={handleSubmitQuiz}
                                                disabled={selectedAnswer === null}
                                                style={{
                                                    backgroundColor: selectedAnswer !== null ? '#3b82f6' : '#9ca3af',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '10px 20px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    cursor: selectedAnswer !== null ? 'pointer' : 'not-allowed',
                                                    marginTop: '8px',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => selectedAnswer !== null && (e.currentTarget.style.backgroundColor = '#2563eb')}
                                                onMouseLeave={(e) => selectedAnswer !== null && (e.currentTarget.style.backgroundColor = '#3b82f6')}
                                            >
                                                Submit Answer
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setQuizData(null);
                                                    setSelectedAnswer(null);
                                                    setQuizSubmitted(false);
                                                }}
                                                style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '10px 20px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    marginTop: '8px',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                            >
                                                Try Another Quiz
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Advanced Mode */}
                        {mode === 'advanced' && !loading && (
                            <div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        marginBottom: '8px'
                                    }}>
                                        Enter your diagnosis:
                                    </label>
                                    <textarea
                                        value={userDiagnosis}
                                        onChange={(e) => setUserDiagnosis(e.target.value)}
                                        placeholder="Describe what you observe in the signal and your diagnostic conclusion..."
                                        style={{
                                            width: '100%',
                                            minHeight: '120px',
                                            padding: '12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontFamily: 'inherit',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleGetFeedback}
                                    disabled={!userDiagnosis.trim()}
                                    style={{
                                        backgroundColor: userDiagnosis.trim() ? '#3b82f6' : '#9ca3af',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '10px 20px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: userDiagnosis.trim() ? 'pointer' : 'not-allowed',
                                        marginBottom: '16px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => userDiagnosis.trim() && (e.currentTarget.style.backgroundColor = '#2563eb')}
                                    onMouseLeave={(e) => userDiagnosis.trim() && (e.currentTarget.style.backgroundColor = '#3b82f6')}
                                >
                                    Get AI Feedback
                                </button>

                                {advancedFeedback && (
                                    <div style={{
                                        backgroundColor: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginTop: '16px'
                                    }}>
                                        <div style={{
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            marginBottom: '12px'
                                        }}>
                                            AI Expert Feedback
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#111827',
                                            lineHeight: '1.7',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {advancedFeedback}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default EducationalPanel;
