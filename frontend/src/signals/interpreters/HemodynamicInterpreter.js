import { BaseInterpreter } from './BaseInterpreter';

/**
 * HemodynamicSignal Interpreter
 * 
 * Handles hemodynamic signals like ABP, PAP, CVP, SpO2, etc.
 * These are typically displayed as stacked timelines.
 */
export class HemodynamicInterpreter extends BaseInterpreter {
    constructor() {
        super();
        this.type = 'hemodynamic';
    }

    getType() {
        return 'hemodynamic';
    }

    getDisplayName() {
        return 'Hemodynamic / Vital Signs';
    }

    /**
     * Parse raw backend data into normalized format
     * @param {Object} rawData - Backend response
     * @returns {Object} Normalized data structure
     */
    parse(rawData) {
        // Note: Do NOT call super.parse() as it throws 'Not Implemented'

        const channels = this.getChannels(rawData);
        const metadata = this.getMetadata(rawData);
        const fs = rawData.fs || 125;
        const signals = rawData.signals || [];

        // Process each channel
        const processedChannels = channels.map((channel, idx) => {
            // Extract column for this channel
            // signals is usually [sample_index][channel_index]
            let rawSignal = [];
            if (signals.length > 0) {
                if (Array.isArray(signals[0])) {
                    rawSignal = signals.map(row => row[idx]);
                } else {
                    // Fallback for single channel 1D array
                    rawSignal = signals;
                }
            }

            const timeAxis = this.getTimeAxis(rawSignal.length, fs);

            // Downsample for display if needed
            const displaySignal = this.downsample(rawSignal, 3000);

            return {
                ...channel,
                rawSignal,
                displaySignal,
                timeAxis,
                min: Math.min(...rawSignal),
                max: Math.max(...rawSignal)
            };
        });

        return {
            type: 'hemodynamic',
            channels: processedChannels,
            metadata: {
                ...metadata,
                signalType: 'Hemodynamic',
                description: 'Hemodynamic & Vital Signs'
            },
            rawData
        };
    }

    /**
     * Extract channel info and assign colors
     */
    getChannels(rawData) {
        const signalNames = rawData.sig_name || [];
        const units = rawData.units || [];

        return signalNames.map((name, idx) => {
            const upName = name ? name.toUpperCase() : 'UNKNOWN';
            let color = '#2563eb'; // Default Blue

            // Color conventions for hemodynamic signals
            if (upName.includes('ABP') || upName.includes('ART')) color = '#dc2626'; // Red
            else if (upName.includes('PAP')) color = '#eab308'; // Yellow/Gold
            else if (upName.includes('CVP')) color = '#3b82f6'; // Blue
            else if (upName.includes('RESP')) color = '#10b981'; // Green (Respiration)
            else if (upName.includes('PLETH') || upName.includes('SPO2')) color = '#8b5cf6'; // Purple

            // Also keep ECG leads if present in the mix
            else if (['I', 'II', 'III', 'AVR', 'AVL', 'AVF', 'V'].some(l => upName.startsWith(l))) {
                color = '#10b981'; // Greenish for ECG in monitor view
            }

            return {
                index: idx,
                name: name || `Channel ${idx + 1}`,
                displayName: name || `Ch ${idx + 1}`,
                color: color,
                unit: units[idx] || '',
                type: 'hemodynamic_channel'
            };
        });
    }

    /**
     * Get educational info for Hemodynamic signals
     */
    getEducationalInfo() {
        return {
            title: 'Hemodynamic Monitoring',
            description: 'Measurement of blood pressure and flow through the cardiovascular system.',
            details: {
                'ABP': 'Arterial Blood Pressure - Invasive blood pressure measurement',
                'PAP': 'Pulmonary Artery Pressure - Pressure in the pulmonary artery',
                'CVP': 'Central Venous Pressure - Pressure in the vena cava near the right atrium',
                'PLETH/SpO2': 'Oxygen Saturation - Peripheral capillary oxygen saturation',
                'RESP': 'Respiration - Impedance pneumography or airway flow'
            },
            clinicalRelevance: 'Critical for monitoring cardiovascular stability in ICU/OR settings.',
            normalRanges: {
                'ABP': '120/80 mmHg',
                'PAP': '25/10 mmHg',
                'CVP': '2-6 mmHg',
                'SpO2': '> 95%',
                'Resp Rate': '12-20 bpm'
            }
        };
    }
}

export const hemodynamicInterpreter = new HemodynamicInterpreter();
