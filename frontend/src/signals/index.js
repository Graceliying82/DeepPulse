/**
 * Signal Processing Module - Main Entry Point
 *
 * This module provides a modular, extensible architecture for handling
 * different types of medical waveform data. It cleanly separates:
 *
 * 1. Data Interpretation - Understanding what the raw data means
 * 2. Visualization Configuration - How to display the data
 *
 * Usage:
 *   import { SignalRegistry, getSignalHandler } from './signals';
 *
 *   // Get handler for a signal type
 *   const { interpreter, visualization } = getSignalHandler('eeg');
 *
 *   // Parse raw data
 *   const parsed = interpreter.parse(rawData);
 *
 *   // Get visualization config
 *   const config = visualization.getConfig();
 */

// Core registry
export { SignalRegistry } from './SignalRegistry';

// Base classes (for extending)
export { BaseInterpreter } from './interpreters/BaseInterpreter';
export { BaseVisualization } from './visualizations/BaseVisualization';

// Signal interpreters
export { ECGInterpreter, ecgInterpreter } from './interpreters/ECGInterpreter';
export { EEGInterpreter, eegInterpreter } from './interpreters/EEGInterpreter';

// Visualization configurations
export { ECGVisualization, ecgVisualization } from './visualizations/ECGVisualization';
export { EEGVisualization, eegVisualization } from './visualizations/EEGVisualization';

// ============================================================================
// Register all built-in signal types
// ============================================================================

import { SignalRegistry } from './SignalRegistry';
import { ecgInterpreter } from './interpreters/ECGInterpreter';
import { eegInterpreter } from './interpreters/EEGInterpreter';
import { ecgVisualization } from './visualizations/ECGVisualization';
import { eegVisualization } from './visualizations/EEGVisualization';
import { hemodynamicInterpreter } from './interpreters/HemodynamicInterpreter';
import { hemodynamicVisualization } from './visualizations/HemodynamicVisualization';

// Register ECG/Cardiac signals
SignalRegistry.register(
    'ecg',
    ecgInterpreter,
    ecgVisualization,
    ['cardiac', 'Cardiac', 'ecg', 'ECG']
);

// Register EEG/Neurological signals
SignalRegistry.register(
    'eeg',
    eegInterpreter,
    eegVisualization,
    ['neurological', 'Neurological', 'neuro', 'Neuro', 'eeg', 'EEG']
);

// Register Hemodynamic signals
SignalRegistry.register(
    'hemodynamic',
    hemodynamicInterpreter,
    hemodynamicVisualization,
    ['hemodynamic', 'Hemodynamic', 'abp', 'pressure', 'vital']
);

// ============================================================================
// Convenience functions
// ============================================================================

/**
 * Get interpreter and visualization for a signal type
 * @param {string} signalType - Signal type identifier or category
 * @returns {{ interpreter: Object, visualization: Object }}
 */
export function getSignalHandler(signalType) {
    return SignalRegistry.get(signalType);
}

/**
 * Parse raw signal data and get display configuration
 * @param {Object} rawData - Raw signal data from backend
 * @param {string} signalType - Optional signal type (auto-detected if not provided)
 * @returns {{ parsed: Object, displayConfig: Object, interpreter: Object, visualization: Object }}
 */
export function processSignalData(rawData, signalType = null) {
    // Auto-detect signal type if not provided
    const detectedType = signalType || SignalRegistry.detectSignalType(rawData);

    const { interpreter, visualization } = SignalRegistry.get(detectedType);

    if (!interpreter || !visualization) {
        console.warn(`No handler registered for signal type: ${detectedType}, falling back to ECG`);
        const fallback = SignalRegistry.get('ecg');
        return {
            parsed: fallback.interpreter.parse(rawData),
            displayConfig: fallback.visualization.getConfig(),
            interpreter: fallback.interpreter,
            visualization: fallback.visualization,
            signalType: 'ecg'
        };
    }

    return {
        parsed: interpreter.parse(rawData),
        displayConfig: visualization.getConfig(),
        interpreter,
        visualization,
        signalType: interpreter.getType() // Use the actual type from interpreter (e.g., 'eeg', not 'Neurological')
    };
}

/**
 * Get educational information for a signal type
 * @param {string} signalType - Signal type identifier
 * @returns {Object} Educational content
 */
export function getEducationalInfo(signalType) {
    const { interpreter } = SignalRegistry.get(signalType);
    if (interpreter && interpreter.getEducationalInfo) {
        return interpreter.getEducationalInfo();
    }
    return null;
}

/**
 * Check if a signal type is supported
 * @param {string} signalType - Signal type identifier
 * @returns {boolean}
 */
export function isSignalTypeSupported(signalType) {
    return SignalRegistry.has(signalType);
}

/**
 * Get all registered signal types
 * @returns {string[]}
 */
export function getRegisteredSignalTypes() {
    return SignalRegistry.getRegisteredTypes();
}
