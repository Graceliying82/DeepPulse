/**
 * BaseVisualization - Base class for signal visualization configurations
 *
 * Visualization configs define HOW to render a signal type.
 * They are separate from interpreters (WHAT the data means) to allow
 * multiple visualization options for the same data type.
 */

export class BaseVisualization {
    constructor(config = {}) {
        this.config = {
            // Layout options
            layout: 'overlay',        // 'overlay', 'stacked', 'grid'

            // Time axis
            timeWindow: 10,           // seconds to display
            timeScale: 1,             // pixels per second multiplier

            // Amplitude
            amplitudeScale: 1,        // amplitude scaling factor
            autoScale: true,          // auto-scale amplitude

            // Grid
            showGrid: true,
            gridColor: '#e5e7eb',
            gridOpacity: 0.5,
            majorGridLines: true,
            minorGridLines: true,

            // Channels
            channelHeight: 100,       // height per channel (stacked mode)
            channelSpacing: 10,       // spacing between channels
            channelColors: [],        // custom colors per channel

            // Labels
            showChannelLabels: true,
            labelPosition: 'left',    // 'left', 'right', 'top'
            labelWidth: 80,           // pixels for label area

            // Scale bar
            showScaleBar: true,
            scaleBarPosition: 'bottom-right',

            // Interaction
            enableZoom: true,
            enablePan: true,
            enableCrosshair: true,

            // Styling
            backgroundColor: '#ffffff',
            lineWidth: 1,

            ...config
        };
    }

    /**
     * Get the visualization type identifier
     */
    getType() {
        return 'base';
    }

    /**
     * Get complete configuration for rendering
     */
    getConfig() {
        return this.config;
    }

    /**
     * Calculate SVG dimensions based on container and data
     */
    calculateDimensions(containerWidth, containerHeight, numChannels) {
        const { layout, channelHeight, channelSpacing, labelWidth, showChannelLabels } = this.config;

        const effectiveLabelWidth = showChannelLabels ? labelWidth : 0;
        const plotWidth = containerWidth - effectiveLabelWidth - 20; // 20px padding

        let plotHeight;
        if (layout === 'stacked') {
            plotHeight = numChannels * (channelHeight + channelSpacing);
        } else {
            plotHeight = containerHeight - 40; // 40px for scale bar
        }

        return {
            width: containerWidth,
            height: Math.max(plotHeight + 60, containerHeight),
            plotWidth,
            plotHeight,
            labelWidth: effectiveLabelWidth,
            marginTop: 20,
            marginBottom: 40,
            marginLeft: effectiveLabelWidth + 10,
            marginRight: 10
        };
    }

    /**
     * Calculate scale for time axis
     */
    getTimeScale(numSamples, fs, plotWidth) {
        const duration = numSamples / fs;
        const timeWindow = Math.min(this.config.timeWindow, duration);
        const pixelsPerSecond = plotWidth / timeWindow;

        return {
            duration,
            timeWindow,
            pixelsPerSecond,
            samplesPerPixel: (fs * timeWindow) / plotWidth
        };
    }

    /**
     * Calculate scale for amplitude axis
     */
    getAmplitudeScale(signal, channelHeight) {
        if (!signal || signal.length === 0) {
            return { min: -1, max: 1, scale: channelHeight / 2 };
        }

        const min = Math.min(...signal);
        const max = Math.max(...signal);
        const range = max - min || 1;
        const scale = channelHeight / range;

        return { min, max, range, scale };
    }

    /**
     * Generate grid lines configuration
     */
    getGridConfig(dimensions, timeScale) {
        const { majorGridLines, minorGridLines, gridColor, gridOpacity } = this.config;
        const lines = [];

        if (!this.config.showGrid) return lines;

        // This should be overridden by subclasses for specific grid patterns
        return lines;
    }

    /**
     * Get CSS styles for the visualization
     */
    getStyles() {
        return {
            container: {
                backgroundColor: this.config.backgroundColor,
                overflow: 'auto'
            },
            svg: {
                display: 'block'
            },
            grid: {
                stroke: this.config.gridColor,
                strokeOpacity: this.config.gridOpacity
            },
            signal: {
                fill: 'none',
                strokeWidth: this.config.lineWidth
            },
            label: {
                fontSize: '12px',
                fontFamily: 'system-ui, sans-serif'
            }
        };
    }

    /**
     * Merge custom config with defaults
     */
    mergeConfig(customConfig) {
        return {
            ...this.config,
            ...customConfig
        };
    }
}
