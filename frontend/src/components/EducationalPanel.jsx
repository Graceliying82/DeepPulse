import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { X, Lightbulb, Brain, GraduationCap, CheckCircle, Loader } from 'lucide-react';
import { captureSVGAsImage } from '../utils/signalCapture';

const EducationalPanel = ({ signalData, onClose, preloadedImage }) => {
    const [mode, setMode] = useState('hints');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cached image blob - use preloaded from parent, or capture if needed
    const [cachedImageBlob, setCachedImageBlob] = useState(preloadedImage || null);
    const [imageCapturing, setImageCapturing] = useState(false);

    // Session context - tracks all AI interactions for context continuity
    const [sessionContext, setSessionContext] = useState({
        hintsReceived: [],      // Array of hints the user has seen
        quizAttempts: [],       // Array of {question, userAnswer, correctAnswer, wasCorrect}
        userDiagnoses: [],      // Array of {diagnosis, feedback}
        interactionCount: 0     // Total number of AI interactions
    });

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

    // Update cached image if preloaded image changes
    useEffect(() => {
        if (preloadedImage && !cachedImageBlob) {
            setCachedImageBlob(preloadedImage);
            console.log('Using preloaded image from parent:', preloadedImage.size, 'bytes');
        }
    }, [preloadedImage]);

    // Fallback: capture image if not preloaded (should rarely happen)
    useEffect(() => {
        const captureImage = async () => {
            if (cachedImageBlob || preloadedImage) return; // Already have image

            setImageCapturing(true);
            try {
                const svgElement = document.querySelector('.signal-viewer-svg');
                if (svgElement) {
                    const blob = await captureSVGAsImage(svgElement);
                    setCachedImageBlob(blob);
                    console.log('Image captured as fallback:', blob.size, 'bytes');
                }
            } catch (err) {
                console.error('Failed to capture image:', err);
            } finally {
                setImageCapturing(false);
            }
        };

        // Small delay to allow any preloaded image to be set
        const timer = setTimeout(captureImage, 100);
        return () => clearTimeout(timer);
    }, [cachedImageBlob, preloadedImage]);

    // Build context string from session history
    const buildSessionContextString = () => {
        const parts = [];

        if (sessionContext.hintsReceived.length > 0) {
            parts.push(`Previous hints seen by user: ${sessionContext.hintsReceived.join('; ')}`);
        }

        if (sessionContext.quizAttempts.length > 0) {
            const quizSummary = sessionContext.quizAttempts.map((q, i) =>
                `Quiz ${i + 1}: User answered "${q.userAnswer}" (${q.wasCorrect ? 'correct' : 'incorrect'})`
            ).join('; ');
            parts.push(`Quiz history: ${quizSummary}`);
        }

        if (sessionContext.userDiagnoses.length > 0) {
            const diagnosisSummary = sessionContext.userDiagnoses.map((d, i) =>
                `Attempt ${i + 1}: "${d.diagnosis}"`
            ).join('; ');
            parts.push(`User's previous diagnosis attempts: ${diagnosisSummary}`);
        }

        if (parts.length === 0) {
            return null;
        }

        return `SESSION CONTEXT (user's learning journey): ${parts.join('. ')}`;
    };

    // Capture SVG and call AI analysis (uses cached image if available)
    const analyzeSignal = async (analysisMode, userNotes = null) => {
        setLoading(true);
        setError(null);

        try {
            let imageBlob = cachedImageBlob;

            // If no cached image, capture now
            if (!imageBlob) {
                const svgElement = document.querySelector('.signal-viewer-svg');
                if (!svgElement) {
                    throw new Error('Signal viewer not found. Please ensure a signal is loaded.');
                }
                imageBlob = await captureSVGAsImage(svgElement);
                setCachedImageBlob(imageBlob); // Cache for future use
                console.log('Image captured and cached on first analysis');
            } else {
                console.log('Using cached image for analysis');
            }

            // Build context from session history
            const sessionContextStr = buildSessionContextString();

            // Combine user notes with session context
            let combinedNotes = userNotes || '';
            if (sessionContextStr) {
                combinedNotes = sessionContextStr + (combinedNotes ? `\n\nUser's current input: ${combinedNotes}` : '');
            }

            // Prepare form data
            const formData = new FormData();
            formData.append('file', imageBlob, 'signal.png');
            formData.append('mode', analysisMode);
            formData.append('signal_type', 'Cardiac'); // Default, could be derived from signalData
            if (combinedNotes) {
                formData.append('user_notes', combinedNotes);
            }
            if (signalData.comments) {
                formData.append('metadata', JSON.stringify(signalData.comments));
            }

            // Call API
            const response = await axios.post('/api/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update interaction count
            setSessionContext(prev => ({
                ...prev,
                interactionCount: prev.interactionCount + 1
            }));

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

                // Save hints to session context
                const parsedHints = parseHints(result.response);
                setSessionContext(prev => ({
                    ...prev,
                    hintsReceived: [...prev.hintsReceived, ...parsedHints]
                }));
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

        // Save quiz attempt to session context
        if (quizData && quizData[selectedAnswer]) {
            const userChoice = quizData[selectedAnswer];
            const correctOption = quizData.find(q => q.is_correct);
            setSessionContext(prev => ({
                ...prev,
                quizAttempts: [...prev.quizAttempts, {
                    userAnswer: userChoice.diagnosis,
                    correctAnswer: correctOption?.diagnosis || 'Unknown',
                    wasCorrect: userChoice.is_correct
                }]
            }));
        }
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

                // Save diagnosis attempt to session context
                setSessionContext(prev => ({
                    ...prev,
                    userDiagnoses: [...prev.userDiagnoses, {
                        diagnosis: userDiagnosis,
                        feedback: result.response
                    }]
                }));
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                                    Learn & Practice
                                </h3>
                                {/* Image cache status indicator */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    color: cachedImageBlob ? '#10b981' : '#f59e0b',
                                    backgroundColor: cachedImageBlob ? '#f0fdf4' : '#fefce8',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    border: `1px solid ${cachedImageBlob ? '#bbf7d0' : '#fef08a'}`
                                }}>
                                    {cachedImageBlob ? (
                                        <>
                                            <CheckCircle size={12} />
                                            <span>Image Ready</span>
                                        </>
                                    ) : imageCapturing ? (
                                        <>
                                            <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                            <span>Capturing...</span>
                                        </>
                                    ) : (
                                        <span>Waiting</span>
                                    )}
                                </div>
                                {/* Session context indicator */}
                                {sessionContext.interactionCount > 0 && (
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#6b7280',
                                        backgroundColor: '#f3f4f6',
                                        padding: '2px 8px',
                                        borderRadius: '12px'
                                    }}>
                                        {sessionContext.interactionCount} interaction{sessionContext.interactionCount > 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
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
                                                <div className="markdown-content" style={{
                                                    fontSize: '14px',
                                                    color: idx <= revealedHints ? '#111827' : '#9ca3af',
                                                    lineHeight: '1.6'
                                                }}>
                                                    {idx <= revealedHints ? <ReactMarkdown>{hint}</ReactMarkdown> : '??? Click below to reveal'}
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
                                                            <div className="markdown-content" style={{
                                                                fontSize: '13px',
                                                                color: '#6b7280',
                                                                lineHeight: '1.5',
                                                                marginTop: '8px',
                                                                paddingTop: '8px',
                                                                borderTop: '1px solid #e5e7eb'
                                                            }}>
                                                                <ReactMarkdown>{option.explanation}</ReactMarkdown>
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
                                        <div className="markdown-content" style={{
                                            fontSize: '14px',
                                            color: '#111827',
                                            lineHeight: '1.7'
                                        }}>
                                            <ReactMarkdown>{advancedFeedback}</ReactMarkdown>
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
