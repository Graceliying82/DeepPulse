import React, { createContext, useContext, useState, useEffect } from 'react';

const ApiKeyContext = createContext();

const STORAGE_KEY = 'deeppulse_gemini_api_key';

export function ApiKeyProvider({ children }) {
    const [apiKey, setApiKey] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load API key from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setApiKey(stored);
        }
        setIsLoaded(true);
    }, []);

    // Save API key to localStorage when it changes
    const saveApiKey = (key) => {
        if (key) {
            localStorage.setItem(STORAGE_KEY, key);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        setApiKey(key);
    };

    const clearApiKey = () => {
        localStorage.removeItem(STORAGE_KEY);
        setApiKey('');
    };

    const hasApiKey = Boolean(apiKey);

    return (
        <ApiKeyContext.Provider value={{
            apiKey,
            saveApiKey,
            clearApiKey,
            hasApiKey,
            isLoaded
        }}>
            {children}
        </ApiKeyContext.Provider>
    );
}

export function useApiKey() {
    const context = useContext(ApiKeyContext);
    if (!context) {
        throw new Error('useApiKey must be used within an ApiKeyProvider');
    }
    return context;
}
