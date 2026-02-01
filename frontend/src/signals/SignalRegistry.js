/**
 * Signal Registry - Central hub for signal type management
 *
 * This registry maps signal types to their interpreters and visualization configs.
 * New signal types can be added by registering an interpreter and visualization config.
 *
 * Usage:
 *   import { SignalRegistry } from './signals/SignalRegistry';
 *
 *   // Register a new signal type
 *   SignalRegistry.register('mySignalType', myInterpreter, myVizConfig);
 *
 *   // Get interpreter and config for a signal type
 *   const { interpreter, visualization } = SignalRegistry.get('cardiac');
 */

class SignalRegistryClass {
    constructor() {
        this.interpreters = new Map();
        this.visualizations = new Map();
        this.categoryMap = new Map(); // Maps category keys to signal types
    }

    /**
     * Register a signal type with its interpreter and visualization config
     * @param {string} signalType - Unique identifier for the signal type
     * @param {Object} interpreter - Interpreter instance with parse/normalize methods
     * @param {Object} visualization - Visualization configuration object
     * @param {string[]} categories - Category keys that map to this signal type (e.g., ['cardiac', 'hemodynamic'])
     */
    register(signalType, interpreter, visualization, categories = []) {
        this.interpreters.set(signalType, interpreter);
        this.visualizations.set(signalType, visualization);

        // Map categories to this signal type
        categories.forEach(category => {
            this.categoryMap.set(category, signalType);
        });
    }

    /**
     * Get interpreter and visualization for a signal type
     * @param {string} signalType - Signal type identifier
     * @returns {{ interpreter: Object, visualization: Object }}
     */
    get(signalType) {
        // Check if it's a category key first
        const mappedType = this.categoryMap.get(signalType.toLowerCase()) || signalType;

        return {
            interpreter: this.interpreters.get(mappedType),
            visualization: this.visualizations.get(mappedType)
        };
    }

    /**
     * Get interpreter for a signal type
     * @param {string} signalType - Signal type identifier
     * @returns {Object} Interpreter instance
     */
    getInterpreter(signalType) {
        const mappedType = this.categoryMap.get(signalType.toLowerCase()) || signalType;
        return this.interpreters.get(mappedType);
    }

    /**
     * Get visualization config for a signal type
     * @param {string} signalType - Signal type identifier
     * @returns {Object} Visualization configuration
     */
    getVisualization(signalType) {
        const mappedType = this.categoryMap.get(signalType.toLowerCase()) || signalType;
        return this.visualizations.get(mappedType);
    }

    /**
     * Check if a signal type is registered
     * @param {string} signalType - Signal type identifier
     * @returns {boolean}
     */
    has(signalType) {
        const mappedType = this.categoryMap.get(signalType.toLowerCase()) || signalType;
        return this.interpreters.has(mappedType);
    }

    /**
     * Get all registered signal types
     * @returns {string[]}
     */
    getRegisteredTypes() {
        return Array.from(this.interpreters.keys());
    }

    /**
     * Detect signal type from raw data characteristics
     * @param {Object} rawData - Raw signal data with signals, sig_name, fs, etc.
     * @returns {string} Detected signal type
     */
    detectSignalType(rawData) {
        const signalNames = rawData.sig_name || [];
        const fs = rawData.fs || 0;

        // EEG detection: look for 10-20 system electrode names
        const eegPatterns = ['FP1', 'FP2', 'F3', 'F4', 'F7', 'F8', 'C3', 'C4', 'T7', 'T8', 'P3', 'P4', 'O1', 'O2', 'FZ', 'CZ', 'PZ'];
        const hasEEGChannels = signalNames.some(name =>
            eegPatterns.some(pattern => name.toUpperCase().includes(pattern))
        );
        if (hasEEGChannels) return 'eeg';

        // ECG detection: look for lead names or typical ECG sampling rates
        const ecgPatterns = ['I', 'II', 'III', 'AVR', 'AVL', 'AVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'MLI', 'MLII', 'MLIII'];
        const hasECGChannels = signalNames.some(name =>
            ecgPatterns.some(pattern => name.toUpperCase() === pattern || name.toUpperCase().includes(pattern))
        );
        if (hasECGChannels) return 'ecg';

        // PPG/Respiration detection
        const ppgPatterns = ['PLETH', 'PPG', 'SPO2', 'RESP'];
        const hasPPGChannels = signalNames.some(name =>
            ppgPatterns.some(pattern => name.toUpperCase().includes(pattern))
        );
        if (hasPPGChannels) return 'ppg';

        // Default to ECG if no specific detection
        return 'ecg';
    }
}

// Singleton instance
export const SignalRegistry = new SignalRegistryClass();
