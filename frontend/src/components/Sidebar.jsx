import React from 'react';
import { Heart, Brain, Activity, Wind, Database, Settings } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const Sidebar = ({ activeSignalType, setActiveSignalType, onDatabaseClick, onSettingsClick }) => {
    const { hasApiKey } = useSettings();
    const menuItems = [
        { type: 'Cardiac', icon: Heart, label: 'Cardiac' },
        { type: 'Neuro', icon: Brain, label: 'Neuro' },
        { type: 'Hemodynamic', icon: Activity, label: 'Hemo' },
        { type: 'Respiration', icon: Wind, label: 'Resp' },
    ];

    return (
        <div className="sidebar">
            <div className="logo" style={{ marginBottom: 12 }}>
                <Activity size={28} color="#00f2ff" />
                <span className="logo-text">DeepPulse</span>
            </div>

            {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSignalType === item.type;
                return (
                    <div
                        key={item.type}
                        className={`nav-icon ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveSignalType(item.type)}
                        title={item.label}
                    >
                        <Icon size={22} />
                        <span className="nav-label">{item.label}</span>
                    </div>
                )
            })}

            <div style={{ flex: 1 }} />

            <div className="nav-icon" onClick={onDatabaseClick} title="Database Manager">
                <Database size={22} />
                <span className="nav-label">Data</span>
            </div>
            <div className="nav-icon" onClick={onSettingsClick} title="Settings" style={{ position: 'relative' }}>
                <Settings size={22} />
                <span className="nav-label">Settings</span>
                <span
                    className={`api-key-dot ${hasApiKey ? 'set' : 'unset'}`}
                    title={hasApiKey ? 'API key configured' : 'No API key set'}
                />
            </div>
        </div>
    );
};

export default Sidebar;

