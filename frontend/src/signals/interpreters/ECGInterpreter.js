/**
 * ECGInterpreter - Interpreter for ECG/Cardiac electrical signals
 *
 * Handles parsing and interpretation of ECG data including:
 * - Standard 12-lead ECG
 * - Holter monitor recordings
 * - Single/multi-lead recordings from PhysioNet
 */

import { BaseInterpreter } from './BaseInterpreter';

export class ECGInterpreter extends BaseInterpreter {
    constructor(config = {}) {
        super(config);

        // Standard ECG lead information
        this.leadInfo = {
            // Limb leads
            'I': { fullName: 'Lead I', region: 'Lateral', color: '#ef4444' },
            'II': { fullName: 'Lead II', region: 'Inferior', color: '#f97316' },
            'III': { fullName: 'Lead III', region: 'Inferior', color: '#eab308' },
            'AVR': { fullName: 'aVR', region: 'Right Arm', color: '#22c55e' },
            'AVL': { fullName: 'aVL', region: 'Lateral', color: '#06b6d4' },
            'AVF': { fullName: 'aVF', region: 'Inferior', color: '#3b82f6' },
            // Precordial leads
            'V1': { fullName: 'V1', region: 'Septal', color: '#8b5cf6' },
            'V2': { fullName: 'V2', region: 'Septal', color: '#a855f7' },
            'V3': { fullName: 'V3', region: 'Anterior', color: '#d946ef' },
            'V4': { fullName: 'V4', region: 'Anterior', color: '#ec4899' },
            'V5': { fullName: 'V5', region: 'Lateral', color: '#f43f5e' },
            'V6': { fullName: 'V6', region: 'Lateral', color: '#ef4444' },
            // PhysioNet common names
            'MLII': { fullName: 'Modified Lead II', region: 'Inferior', color: '#f97316' },
            'MLI': { fullName: 'Modified Lead I', region: 'Lateral', color: '#ef4444' },
            'MLIII': { fullName: 'Modified Lead III', region: 'Inferior', color: '#eab308' },
            'V': { fullName: 'Precordial', region: 'Anterior', color: '#8b5cf6' },
        };

        // ECG-specific configuration
        this.defaultConfig = {
            standardSpeed: 25, // mm/s (standard ECG paper speed)
            standardGain: 10,  // mm/mV (standard ECG amplitude)
            gridSpacing: {
                majorX: 0.2,   // 200ms (large box)
                minorX: 0.04,  // 40ms (small box)
                majorY: 0.5,   // 0.5mV (large box)
                minorY: 0.1    // 0.1mV (small box)
            }
        };
    }

    getType() {
        return 'ecg';
    }

    getDisplayName() {
        return 'ECG / Cardiac';
    }

    /**
     * Parse raw ECG data into normalized format
     */
    parse(rawData) {
        const channels = this.getChannels(rawData);
        const metadata = this.getMetadata(rawData);
        const fs = rawData.fs || 500;
        const signals = rawData.signals || [];

        // Process each channel
        const processedChannels = channels.map((channel, idx) => {
            const rawSignal = signals.map ? signals.map(row => row[idx]) : [];
            const timeAxis = this.getTimeAxis(rawSignal.length, fs);

            // Downsample if necessary for display
            const displaySignal = this.downsample(rawSignal, 3000);
            const displayTime = this.downsample(timeAxis, 3000);

            return {
                ...channel,
                rawSignal,
                displaySignal,
                timeAxis,
                displayTime,
                stats: this.calculateStats(rawSignal)
            };
        });

        return {
            type: 'ecg',
            channels: processedChannels,
            metadata,
            rawData,
            displayConfig: this.getDisplayConfig(rawData)
        };
    }

    /**
     * Get channel information
     */
    getChannels(rawData) {
        const signalNames = rawData.sig_name || [];
        const units = rawData.units || [];

        return signalNames.map((name, idx) => {
            const normalizedName = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const leadData = this.leadInfo[normalizedName] || this.findMatchingLead(normalizedName);

            return {
                index: idx,
                name: name,
                displayName: leadData?.fullName || name,
                region: leadData?.region || 'Unknown',
                color: leadData?.color || this.getDefaultColor(idx),
                unit: units[idx] || 'mV',
                type: 'ecg_lead'
            };
        });
    }

    /**
     * Find matching lead info for non-standard names
     */
    findMatchingLead(name) {
        for (const [key, value] of Object.entries(this.leadInfo)) {
            if (name.includes(key)) return value;
        }
        return null;
    }

    /**
     * Get default color for channel
     */
    getDefaultColor(index) {
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
        return colors[index % colors.length];
    }

    /**
     * Calculate signal statistics
     */
    calculateStats(signal) {
        if (!signal || signal.length === 0) return {};

        const min = Math.min(...signal);
        const max = Math.max(...signal);
        const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
        const variance = signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / signal.length;

        return {
            min,
            max,
            mean,
            std: Math.sqrt(variance),
            range: max - min
        };
    }

    /**
     * Get display configuration for ECG
     */
    getDisplayConfig(rawData) {
        const fs = rawData.fs || 500;
        const duration = rawData.signals ? rawData.signals.length / fs : 10;

        return {
            layout: 'overlay',          // ECG typically overlays or strips
            timeWindow: Math.min(10, duration),  // Show 10 seconds by default
            gridType: 'ecg',            // Use ECG-style grid (5mm boxes)
            showGrid: true,
            gridColor: '#fecaca',       // Light red grid (standard ECG paper)
            backgroundColor: '#fff',
            ...this.defaultConfig
        };
    }

    /**
     * Get ECG-specific metadata
     */
    getMetadata(rawData) {
        const baseMetadata = super.getMetadata(rawData);

        return {
            ...baseMetadata,
            signalType: 'ECG',
            leadConfiguration: this.detectLeadConfiguration(rawData),
            recommendedSpeed: '25 mm/s',
            recommendedGain: '10 mm/mV'
        };
    }

    /**
     * Detect lead configuration (12-lead, 3-lead, etc.)
     */
    detectLeadConfiguration(rawData) {
        const numChannels = rawData.sig_name?.length || 0;

        if (numChannels >= 12) return '12-lead ECG';
        if (numChannels >= 6) return '6-lead ECG';
        if (numChannels >= 3) return '3-lead ECG';
        if (numChannels >= 2) return '2-lead ECG';
        return 'Single-lead ECG';
    }

    /**
     * Get educational information about ECG
     */
    getEducationalInfo() {
        return {
            description: 'Electrocardiogram (ECG/EKG) records the electrical activity of the heart over time.',
            channelDescriptions: {
                'I': 'Lead I: Right arm to left arm, views lateral wall',
                'II': 'Lead II: Right arm to left leg, views inferior wall (rhythm strip)',
                'III': 'Lead III: Left arm to left leg, views inferior wall',
                'V1-V6': 'Precordial leads: View heart from anterior chest wall'
            },
            clinicalRelevance: 'Used for diagnosing arrhythmias, myocardial infarction, conduction abnormalities',
            normalRanges: {
                heartRate: '60-100 bpm',
                prInterval: '120-200 ms',
                qrsDuration: '< 120 ms',
                qtInterval: '< 440 ms (males), < 460 ms (females)'
            },
            waveforms: {
                'P wave': 'Atrial depolarization',
                'QRS complex': 'Ventricular depolarization',
                'T wave': 'Ventricular repolarization',
                'U wave': 'Late repolarization (sometimes seen)'
            }
        };
    }
}

// Export singleton instance
export const ecgInterpreter = new ECGInterpreter();
