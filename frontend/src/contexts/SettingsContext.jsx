import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

const API_KEY_STORAGE_KEY = 'deeppulse_gemini_api_key';
const USER_ROLE_STORAGE_KEY = 'deeppulse_user_role';

export const USER_ROLES = [
    { id: 'hobbyist', label: 'Hobbyist', description: 'Simple explanations, no jargon.' },
    { id: 'student', label: 'Student', description: 'Educational focus, definitions, quizzes.' },
    { id: 'researcher', label: 'Researcher', description: 'Data-heavy, database recommendations.' },
    { id: 'expert', label: 'Expert', description: 'Clinical guidelines, concise, advanced analysis.' }
];

export function SettingsProvider({ children }) {
    const [apiKey, setApiKey] = useState('');
    const [userRole, setUserRole] = useState('student'); // Default to student
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasServerKey, setHasServerKey] = useState(false);

    // Load settings from localStorage on mount + check backend key status
    useEffect(() => {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        const storedRole = localStorage.getItem(USER_ROLE_STORAGE_KEY);

        if (storedKey) setApiKey(storedKey);
        if (storedRole) setUserRole(storedRole);

        setIsLoaded(true);

        // Check if the backend has a server-side API key configured
        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        fetch(`${backendUrl}/api/key-status`)
            .then(res => res.json())
            .then(data => setHasServerKey(Boolean(data.has_server_key)))
            .catch(() => setHasServerKey(false));
    }, []);

    // Save API key
    const saveApiKey = (key) => {
        if (key) {
            localStorage.setItem(API_KEY_STORAGE_KEY, key);
        } else {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
        }
        setApiKey(key);
    };

    const clearApiKey = () => {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        setApiKey('');
    };

    // Save User Role
    const saveUserRole = (role) => {
        localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
        setUserRole(role);
    };

    const hasApiKey = Boolean(apiKey) || hasServerKey;

    return (
        <SettingsContext.Provider value={{
            apiKey,
            saveApiKey,
            clearApiKey,
            hasApiKey,
            userRole,
            saveUserRole,
            isLoaded
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
