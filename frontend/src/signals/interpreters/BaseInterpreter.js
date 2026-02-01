/**
 * BaseInterpreter - Abstract base class for signal interpreters
 *
 * All signal interpreters should extend this class and implement the required methods.
 * The interpreter is responsible for:
 * 1. Parsing raw signal data into a normalized format
 * 2. Extracting channel information and metadata
 * 3. Providing domain-specific knowledge about the signal type
 */

export class BaseInterpreter {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Get the signal type identifier
     * @returns {string}
     */
    getType() {
        throw new Error('getType() must be implemented by subclass');
    }

    /**
     * Get human-readable name for this signal type
     * @returns {string}
     */
    getDisplayName() {
        throw new Error('getDisplayName() must be implemented by subclass');
    }

    /**
     * Parse raw signal data into normalized format
     * @param {Object} rawData - Raw data from backend { signals, fs, sig_name, units, comments }
     * @returns {Object} Normalized signal data
     */
    parse(rawData) {
        throw new Error('parse() must be implemented by subclass');
    }

    /**
     * Get channel information with display properties
     * @param {Object} rawData - Raw signal data
     * @returns {Array<Object>} Array of channel info objects
     */
    getChannels(rawData) {
        throw new Error('getChannels() must be implemented by subclass');
    }

    /**
     * Get metadata about the recording
     * @param {Object} rawData - Raw signal data
     * @returns {Object} Metadata object
     */
    getMetadata(rawData) {
        return {
            samplingRate: rawData.fs || 0,
            duration: rawData.signals ? rawData.signals.length / (rawData.fs || 1) : 0,
            channelCount: rawData.sig_name ? rawData.sig_name.length : 0,
            comments: rawData.comments || [],
            units: rawData.units || []
        };
    }

    /**
     * Normalize signal amplitude for display
     * @param {Array} signal - Raw signal array
     * @param {Object} options - Normalization options
     * @returns {Array} Normalized signal
     */
    normalizeSignal(signal, options = {}) {
        if (!signal || signal.length === 0) return [];

        const { method = 'minmax', targetRange = [-1, 1] } = options;

        if (method === 'minmax') {
            const min = Math.min(...signal);
            const max = Math.max(...signal);
            const range = max - min || 1;
            return signal.map(v =>
                targetRange[0] + ((v - min) / range) * (targetRange[1] - targetRange[0])
            );
        }

        if (method === 'zscore') {
            const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
            const std = Math.sqrt(signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / signal.length) || 1;
            return signal.map(v => (v - mean) / std);
        }

        return signal;
    }

    /**
     * Get time axis values for the signal
     * @param {number} numSamples - Number of samples
     * @param {number} fs - Sampling frequency
     * @param {number} startTime - Start time in seconds (default 0)
     * @returns {Array<number>} Time values in seconds
     */
    getTimeAxis(numSamples, fs, startTime = 0) {
        const dt = 1 / fs;
        return Array.from({ length: numSamples }, (_, i) => startTime + i * dt);
    }

    /**
     * Downsample signal for display (when too many points)
     * @param {Array} signal - Signal array
     * @param {number} maxPoints - Maximum points to display
     * @returns {Array} Downsampled signal
     */
    downsample(signal, maxPoints = 2000) {
        if (signal.length <= maxPoints) return signal;

        const factor = Math.ceil(signal.length / maxPoints);
        const result = [];

        for (let i = 0; i < signal.length; i += factor) {
            // Use LTTB-like approach: keep min and max in each bucket
            const bucket = signal.slice(i, Math.min(i + factor, signal.length));
            const min = Math.min(...bucket);
            const max = Math.max(...bucket);
            result.push(min, max);
        }

        return result;
    }

    /**
     * Apply bandpass filter (simple moving average approximation)
     * @param {Array} signal - Signal array
     * @param {number} lowCut - Low cutoff frequency (Hz)
     * @param {number} highCut - High cutoff frequency (Hz)
     * @param {number} fs - Sampling frequency
     * @returns {Array} Filtered signal
     */
    bandpassFilter(signal, lowCut, highCut, fs) {
        // Simple high-pass filter (remove DC and very low frequencies)
        const windowSize = Math.round(fs / lowCut);
        let filtered = [...signal];

        if (windowSize > 1 && windowSize < signal.length) {
            // Subtract moving average (high-pass)
            const movingAvg = [];
            let sum = 0;
            for (let i = 0; i < signal.length; i++) {
                sum += signal[i];
                if (i >= windowSize) sum -= signal[i - windowSize];
                movingAvg.push(sum / Math.min(i + 1, windowSize));
            }
            filtered = signal.map((v, i) => v - movingAvg[i]);
        }

        return filtered;
    }

    /**
     * Get domain-specific annotations or landmarks
     * @param {Object} rawData - Raw signal data
     * @returns {Array<Object>} Array of annotation objects { time, label, type }
     */
    getAnnotations(rawData) {
        return []; // Override in subclass if applicable
    }

    /**
     * Get educational information about this signal type
     * @returns {Object} Educational content
     */
    getEducationalInfo() {
        return {
            description: 'Signal data',
            channelDescriptions: {},
            clinicalRelevance: '',
            normalRanges: {}
        };
    }
}
