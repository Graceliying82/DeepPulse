/**
 * EEGInterpreter - Interpreter for EEG/Neurological signals
 *
 * Handles parsing and interpretation of EEG data including:
 * - Standard 10-20 system electrode placements
 * - Bipolar and referential montages
 * - Epilepsy monitoring data (CHB-MIT, etc.)
 */

import { BaseInterpreter } from './BaseInterpreter';

export class EEGInterpreter extends BaseInterpreter {
    constructor(config = {}) {
        super(config);

        // 10-20 System electrode information
        this.electrodeInfo = {
            // Frontal
            'FP1': { fullName: 'Frontal Pole Left', region: 'Frontal', hemisphere: 'left', color: '#ef4444' },
            'FP2': { fullName: 'Frontal Pole Right', region: 'Frontal', hemisphere: 'right', color: '#f97316' },
            'F3': { fullName: 'Frontal Left', region: 'Frontal', hemisphere: 'left', color: '#eab308' },
            'F4': { fullName: 'Frontal Right', region: 'Frontal', hemisphere: 'right', color: '#84cc16' },
            'F7': { fullName: 'Frontal-Temporal Left', region: 'Frontal', hemisphere: 'left', color: '#22c55e' },
            'F8': { fullName: 'Frontal-Temporal Right', region: 'Frontal', hemisphere: 'right', color: '#10b981' },
            'FZ': { fullName: 'Frontal Midline', region: 'Frontal', hemisphere: 'midline', color: '#14b8a6' },
            // Central
            'C3': { fullName: 'Central Left', region: 'Central', hemisphere: 'left', color: '#06b6d4' },
            'C4': { fullName: 'Central Right', region: 'Central', hemisphere: 'right', color: '#0ea5e9' },
            'CZ': { fullName: 'Central Midline (Vertex)', region: 'Central', hemisphere: 'midline', color: '#3b82f6' },
            // Temporal
            'T7': { fullName: 'Temporal Left (T3)', region: 'Temporal', hemisphere: 'left', color: '#6366f1' },
            'T8': { fullName: 'Temporal Right (T4)', region: 'Temporal', hemisphere: 'right', color: '#8b5cf6' },
            'T3': { fullName: 'Temporal Left', region: 'Temporal', hemisphere: 'left', color: '#6366f1' },
            'T4': { fullName: 'Temporal Right', region: 'Temporal', hemisphere: 'right', color: '#8b5cf6' },
            // Parietal
            'P3': { fullName: 'Parietal Left', region: 'Parietal', hemisphere: 'left', color: '#a855f7' },
            'P4': { fullName: 'Parietal Right', region: 'Parietal', hemisphere: 'right', color: '#d946ef' },
            'P7': { fullName: 'Parietal-Temporal Left (T5)', region: 'Parietal', hemisphere: 'left', color: '#ec4899' },
            'P8': { fullName: 'Parietal-Temporal Right (T6)', region: 'Parietal', hemisphere: 'right', color: '#f43f5e' },
            'PZ': { fullName: 'Parietal Midline', region: 'Parietal', hemisphere: 'midline', color: '#fb7185' },
            // Occipital
            'O1': { fullName: 'Occipital Left', region: 'Occipital', hemisphere: 'left', color: '#f87171' },
            'O2': { fullName: 'Occipital Right', region: 'Occipital', hemisphere: 'right', color: '#fbbf24' },
            'OZ': { fullName: 'Occipital Midline', region: 'Occipital', hemisphere: 'midline', color: '#a3e635' },
            // Additional
            'FT9': { fullName: 'Fronto-Temporal Left', region: 'Temporal', hemisphere: 'left', color: '#34d399' },
            'FT10': { fullName: 'Fronto-Temporal Right', region: 'Temporal', hemisphere: 'right', color: '#2dd4bf' },
        };

        // Standard montages for EEG display
        this.montages = {
            'longitudinal_bipolar': {
                name: 'Longitudinal Bipolar (Double Banana)',
                chains: [
                    // Left temporal chain
                    ['FP1-F7', 'F7-T7', 'T7-P7', 'P7-O1'],
                    // Left parasagittal chain
                    ['FP1-F3', 'F3-C3', 'C3-P3', 'P3-O1'],
                    // Right parasagittal chain
                    ['FP2-F4', 'F4-C4', 'C4-P4', 'P4-O2'],
                    // Right temporal chain
                    ['FP2-F8', 'F8-T8', 'T8-P8', 'P8-O2'],
                    // Midline
                    ['FZ-CZ', 'CZ-PZ']
                ]
            },
            'transverse_bipolar': {
                name: 'Transverse Bipolar',
                chains: [
                    ['F7-FP1', 'FP1-FP2', 'FP2-F8'],
                    ['T7-C3', 'C3-CZ', 'CZ-C4', 'C4-T8'],
                    ['P7-P3', 'P3-PZ', 'PZ-P4', 'P4-P8'],
                    ['O1-O2']
                ]
            }
        };

        // EEG frequency bands
        this.frequencyBands = {
            delta: { range: [0.5, 4], color: '#8b5cf6', description: 'Deep sleep, encephalopathy' },
            theta: { range: [4, 8], color: '#3b82f6', description: 'Drowsiness, focal dysfunction' },
            alpha: { range: [8, 13], color: '#22c55e', description: 'Relaxed awake (posterior)' },
            beta: { range: [13, 30], color: '#f97316', description: 'Alert, anxiety, medications' },
            gamma: { range: [30, 100], color: '#ef4444', description: 'Cognitive processing' }
        };

        this.defaultConfig = {
            standardSpeed: 30,    // mm/s (standard EEG paper speed)
            standardSensitivity: 7, // μV/mm
            timeWindow: 10,       // seconds per screen
            channelHeight: 40     // pixels per channel
        };
    }

    getType() {
        return 'eeg';
    }

    getDisplayName() {
        return 'EEG / Neurological';
    }

    /**
     * Parse raw EEG data into normalized format
     */
    parse(rawData) {
        const channels = this.getChannels(rawData);
        const metadata = this.getMetadata(rawData);
        const fs = rawData.fs || 256;
        const signals = rawData.signals || [];

        // Organize channels by montage (anatomical ordering)
        const organizedChannels = this.organizeByMontage(channels);

        // Process each channel
        const processedChannels = organizedChannels.map((channel, idx) => {
            const rawSignal = signals.map ? signals.map(row => row[channel.index]) : [];
            const timeAxis = this.getTimeAxis(rawSignal.length, fs);

            // Apply basic filtering for EEG (0.5-70 Hz typical)
            const filteredSignal = this.bandpassFilter(rawSignal, 0.5, 70, fs);

            // Normalize for display (each channel independently)
            const normalizedSignal = this.normalizeSignal(filteredSignal, {
                method: 'zscore'
            });

            // Downsample if necessary
            const displaySignal = this.downsample(normalizedSignal, 3000);
            const displayTime = this.downsample(timeAxis, 3000);

            return {
                ...channel,
                displayIndex: idx,  // Order for display
                rawSignal,
                filteredSignal,
                displaySignal,
                timeAxis,
                displayTime,
                stats: this.calculateStats(rawSignal)
            };
        });

        return {
            type: 'eeg',
            channels: processedChannels,
            metadata,
            rawData,
            displayConfig: this.getDisplayConfig(rawData),
            montageInfo: this.detectMontage(rawData)
        };
    }

    /**
     * Get channel information with 10-20 system details
     */
    getChannels(rawData) {
        const signalNames = rawData.sig_name || [];
        const units = rawData.units || [];

        return signalNames.map((name, idx) => {
            const channelInfo = this.parseChannelName(name);

            return {
                index: idx,
                name: name,
                displayName: channelInfo.displayName,
                electrodes: channelInfo.electrodes,
                region: channelInfo.region,
                hemisphere: channelInfo.hemisphere,
                color: channelInfo.color,
                unit: units[idx] || 'μV',
                type: channelInfo.type,
                montageChain: channelInfo.montageChain
            };
        });
    }

    /**
     * Parse channel name to extract electrode information
     */
    parseChannelName(name) {
        const upperName = name.toUpperCase();

        // Check if bipolar (contains '-')
        if (name.includes('-')) {
            const [electrode1, electrode2] = name.split('-').map(e => e.trim().toUpperCase());
            const info1 = this.electrodeInfo[electrode1];
            const info2 = this.electrodeInfo[electrode2];

            return {
                displayName: name,
                electrodes: [electrode1, electrode2],
                region: info1?.region || info2?.region || 'Unknown',
                hemisphere: info1?.hemisphere || 'Unknown',
                color: info1?.color || '#6b7280',
                type: 'bipolar',
                montageChain: this.getMontageChain(electrode1, electrode2)
            };
        }

        // Single electrode (referential)
        const electrode = upperName.replace(/[^A-Z0-9]/g, '');
        const info = this.electrodeInfo[electrode];

        return {
            displayName: info?.fullName || name,
            electrodes: [electrode],
            region: info?.region || 'Unknown',
            hemisphere: info?.hemisphere || 'Unknown',
            color: info?.color || '#6b7280',
            type: 'referential',
            montageChain: null
        };
    }

    /**
     * Determine which montage chain a bipolar pair belongs to
     */
    getMontageChain(e1, e2) {
        const pairName = `${e1}-${e2}`;

        // Left temporal
        if (['FP1-F7', 'F7-T7', 'T7-P7', 'P7-O1'].includes(pairName)) return 'left_temporal';
        // Left parasagittal
        if (['FP1-F3', 'F3-C3', 'C3-P3', 'P3-O1'].includes(pairName)) return 'left_parasagittal';
        // Right parasagittal
        if (['FP2-F4', 'F4-C4', 'C4-P4', 'P4-O2'].includes(pairName)) return 'right_parasagittal';
        // Right temporal
        if (['FP2-F8', 'F8-T8', 'T8-P8', 'P8-O2'].includes(pairName)) return 'right_temporal';
        // Midline
        if (['FZ-CZ', 'CZ-PZ'].includes(pairName)) return 'midline';

        return 'other';
    }

    /**
     * Organize channels by anatomical montage order
     */
    organizeByMontage(channels) {
        // Define the standard order
        const montageOrder = [
            // Left temporal chain
            'FP1-F7', 'F7-T7', 'T7-P7', 'P7-O1',
            // Left parasagittal chain
            'FP1-F3', 'F3-C3', 'C3-P3', 'P3-O1',
            // Right parasagittal chain
            'FP2-F4', 'F4-C4', 'C4-P4', 'P4-O2',
            // Right temporal chain
            'FP2-F8', 'F8-T8', 'T8-P8', 'P8-O2',
            // Midline
            'FZ-CZ', 'CZ-PZ'
        ];

        // Sort channels by montage order
        const sorted = [...channels].sort((a, b) => {
            const aIdx = montageOrder.indexOf(a.name.toUpperCase());
            const bIdx = montageOrder.indexOf(b.name.toUpperCase());

            if (aIdx === -1 && bIdx === -1) return a.index - b.index;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
        });

        return sorted;
    }

    /**
     * Detect the montage type from channel names
     */
    detectMontage(rawData) {
        const names = rawData.sig_name || [];
        const hasBipolar = names.some(n => n.includes('-'));

        if (!hasBipolar) {
            return { type: 'referential', name: 'Referential Montage' };
        }

        // Check for longitudinal bipolar pattern
        const longitudinalPattern = ['FP1-F7', 'F7-T7', 'FP1-F3', 'F3-C3'];
        const hasLongitudinal = longitudinalPattern.some(p =>
            names.some(n => n.toUpperCase().includes(p))
        );

        if (hasLongitudinal) {
            return { type: 'longitudinal_bipolar', name: 'Longitudinal Bipolar (Double Banana)' };
        }

        return { type: 'bipolar', name: 'Bipolar Montage' };
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
            range: max - min,
            amplitude: (max - min) // Peak-to-peak amplitude
        };
    }

    /**
     * Get display configuration for EEG
     */
    getDisplayConfig(rawData) {
        const fs = rawData.fs || 256;
        const duration = rawData.signals ? rawData.signals.length / fs : 30;
        const numChannels = rawData.sig_name?.length || 8;

        return {
            layout: 'stacked',          // EEG uses stacked channels
            timeWindow: Math.min(10, duration),
            gridType: 'eeg',            // Use EEG-style grid
            showGrid: true,
            gridColor: '#e5e7eb',
            backgroundColor: '#fff',
            channelHeight: Math.max(30, Math.min(60, 400 / numChannels)),
            channelSpacing: 5,
            showChannelLabels: true,
            labelPosition: 'left',
            showScaleBar: true,
            scaleBarAmplitude: 50,      // μV
            scaleBarTime: 1,            // second
            ...this.defaultConfig
        };
    }

    /**
     * Get EEG-specific metadata
     */
    getMetadata(rawData) {
        const baseMetadata = super.getMetadata(rawData);

        return {
            ...baseMetadata,
            signalType: 'EEG',
            electrodeSystem: '10-20 International System',
            montage: this.detectMontage(rawData),
            frequencyBands: this.frequencyBands,
            recommendedSensitivity: '7 μV/mm',
            recommendedSpeed: '30 mm/s'
        };
    }

    /**
     * Get educational information about EEG
     */
    getEducationalInfo() {
        return {
            description: 'Electroencephalogram (EEG) records electrical activity of the brain via scalp electrodes.',
            channelDescriptions: {
                'Frontal (F)': 'Executive function, motor planning, personality',
                'Central (C)': 'Motor and sensory cortex',
                'Temporal (T)': 'Hearing, memory, language (common seizure origin)',
                'Parietal (P)': 'Sensory integration, spatial awareness',
                'Occipital (O)': 'Visual processing (alpha rhythm origin)'
            },
            clinicalRelevance: 'Used for diagnosing epilepsy, sleep disorders, encephalopathy, brain death',
            frequencyBands: this.frequencyBands,
            keyFindings: {
                'Spike': 'Sharp transient < 70ms, suggests epileptiform activity',
                'Sharp wave': 'Sharp transient 70-200ms, suggests epileptiform activity',
                'Slowing': 'Delta/theta in awake patient suggests dysfunction',
                'Alpha rhythm': 'Normal 8-13 Hz, posterior, eyes closed',
                'Phase reversal': 'Localizes epileptiform focus'
            },
            montageExplanation: {
                'Bipolar': 'Measures voltage between adjacent electrodes, good for localization',
                'Referential': 'Measures voltage relative to common reference, shows absolute amplitude'
            }
        };
    }
}

// Export singleton instance
export const eegInterpreter = new EEGInterpreter();
