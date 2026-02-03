import React from 'react';
import { Heart, Brain, Activity, Wind, Database, Settings } from 'lucide-react';

const Sidebar = ({ activeSignalType, setActiveSignalType, onDatabaseClick }) => {
    const menuItems = [
        { type: 'Cardiac', icon: Heart, label: 'Cardiac' },
        { type: 'Neuro', icon: Brain, label: 'Neuro' },
        { type: 'Hemodynamic', icon: Activity, label: 'Hemo' },
        { type: 'Respiration', icon: Wind, label: 'Resp' },
    ];

    return (
        <div className="sidebar">
            <div className="logo" style={{ marginBottom: 20 }}>
                <Activity size={32} color="#00f2ff" />
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
                        <Icon size={24} />
                    </div>
                )
            })}

            <div style={{ flex: 1 }} />

            <div className="nav-icon" onClick={onDatabaseClick} title="Database Manager">
                <Database size={24} />
            </div>
            <div className="nav-icon" title="Settings">
                <Settings size={24} />
            </div>
        </div>
    );
};

export default Sidebar;

