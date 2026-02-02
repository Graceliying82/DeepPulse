import { BaseVisualization } from './BaseVisualization';

/**
 * Hemodynamic Visualization Configuration
 * 
 * Uses a black background 'monitor' style or clean white background 
 * with stacked channels.
 */
export class HemodynamicVisualization extends BaseVisualization {
    constructor() {
        super();
        this.config = {
            ...this.config,
            layout: 'stacked', // Always stacked for distinct channels
            backgroundColor: '#ffffff', // Clean white background
            gridColor: '#e5e7eb',
            lineWidth: 1.5,
            channelHeight: 60, // Slightly taller for waveforms
            channelSpacing: 10,
            showScale: true
        };
    }

    /**
     * Get visualization configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Generate channel-specific display config
     */
    getChannelConfig(channel, index) {
        return {
            color: channel.color || '#2563eb',
            height: this.config.channelHeight,
            visible: true
        };
    }
}

export const hemodynamicVisualization = new HemodynamicVisualization();
