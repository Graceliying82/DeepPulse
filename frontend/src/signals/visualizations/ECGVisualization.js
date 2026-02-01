/**
 * ECGVisualization - Visualization configuration for ECG/Cardiac signals
 *
 * ECG-specific display features:
 * - Standard ECG paper grid (5mm major boxes, 1mm minor boxes)
 * - Pink/red grid background (like real ECG paper)
 * - 25mm/s standard speed
 * - 10mm/mV standard gain
 * - Overlay or strip mode
 */

import { BaseVisualization } from './BaseVisualization';

export class ECGVisualization extends BaseVisualization {
    constructor(config = {}) {
        super({
            // ECG defaults
            layout: 'overlay',
            timeWindow: 10,
            showGrid: true,

            // ECG paper style grid
            gridColor: '#fecaca',        // Light red (ECG paper)
            gridOpacity: 0.8,
            majorGridColor: '#fca5a5',   // Darker red for major lines
            minorGridColor: '#fee2e2',   // Lighter red for minor lines

            // Standard ECG settings
            paperSpeed: 25,              // mm/s
            gain: 10,                    // mm/mV

            // Grid intervals (in time/voltage)
            majorTimeInterval: 0.2,      // 200ms (large box)
            minorTimeInterval: 0.04,     // 40ms (small box)
            majorVoltageInterval: 0.5,   // 0.5mV (large box)
            minorVoltageInterval: 0.1,   // 0.1mV (small box)

            // Display
            channelHeight: 200,
            lineWidth: 1.5,
            backgroundColor: '#fff5f5',  // Very light pink

            // Labels
            showChannelLabels: true,
            labelPosition: 'left',
            labelWidth: 60,

            // Scale bar
            showScaleBar: true,
            scaleBarPosition: 'bottom-right',

            ...config
        });
    }

    getType() {
        return 'ecg';
    }

    /**
     * Generate ECG-style grid lines
     */
    getGridConfig(dimensions, timeScale, fs) {
        const { plotWidth, plotHeight, marginLeft, marginTop } = dimensions;
        const { majorTimeInterval, minorTimeInterval, majorGridColor, minorGridColor } = this.config;

        const lines = [];
        const pixelsPerSecond = timeScale.pixelsPerSecond;

        // Minor vertical lines (every 40ms = 0.04s)
        const minorTimePixels = minorTimeInterval * pixelsPerSecond;
        for (let x = 0; x < plotWidth; x += minorTimePixels) {
            lines.push({
                type: 'vertical',
                x: marginLeft + x,
                y1: marginTop,
                y2: marginTop + plotHeight,
                color: minorGridColor,
                width: 0.5
            });
        }

        // Major vertical lines (every 200ms = 0.2s)
        const majorTimePixels = majorTimeInterval * pixelsPerSecond;
        for (let x = 0; x < plotWidth; x += majorTimePixels) {
            lines.push({
                type: 'vertical',
                x: marginLeft + x,
                y1: marginTop,
                y2: marginTop + plotHeight,
                color: majorGridColor,
                width: 1
            });
        }

        // Minor horizontal lines (every 0.1mV equivalent)
        const minorYPixels = plotHeight / 20; // 20 minor divisions
        for (let y = 0; y < plotHeight; y += minorYPixels) {
            lines.push({
                type: 'horizontal',
                x1: marginLeft,
                x2: marginLeft + plotWidth,
                y: marginTop + y,
                color: minorGridColor,
                width: 0.5
            });
        }

        // Major horizontal lines (every 0.5mV equivalent)
        const majorYPixels = plotHeight / 4; // 4 major divisions
        for (let y = 0; y <= plotHeight; y += majorYPixels) {
            lines.push({
                type: 'horizontal',
                x1: marginLeft,
                x2: marginLeft + plotWidth,
                y: marginTop + y,
                color: majorGridColor,
                width: 1
            });
        }

        return lines;
    }

    /**
     * Get scale bar configuration for ECG
     */
    getScaleBarConfig(dimensions) {
        const { plotWidth, plotHeight, marginLeft, marginTop } = dimensions;

        return {
            // 1 second time marker
            time: {
                x: marginLeft + plotWidth - 100,
                y: marginTop + plotHeight + 20,
                width: this.config.timeWindow > 5 ? 50 : 25, // Adjust based on zoom
                label: this.config.timeWindow > 5 ? '1s' : '0.5s'
            },
            // 1mV amplitude marker
            amplitude: {
                x: marginLeft + plotWidth - 30,
                y: marginTop + plotHeight - 50,
                height: 40, // This should be calibrated
                label: '1mV'
            }
        };
    }

    /**
     * Calculate dimensions with ECG-specific adjustments
     */
    calculateDimensions(containerWidth, containerHeight, numChannels) {
        const base = super.calculateDimensions(containerWidth, containerHeight, numChannels);

        // For ECG, ensure minimum height for proper waveform display
        const minHeight = this.config.layout === 'overlay' ? 300 : numChannels * 150;

        return {
            ...base,
            plotHeight: Math.max(base.plotHeight, minHeight)
        };
    }

    /**
     * Get channel display configuration for ECG
     */
    getChannelConfig(channel, index, totalChannels) {
        const colors = [
            '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
            '#0891b2', '#2563eb', '#7c3aed', '#db2777'
        ];

        return {
            color: channel.color || colors[index % colors.length],
            lineWidth: this.config.lineWidth,
            visible: true,
            // In overlay mode, all channels share the same Y space
            // In strip mode, each gets its own lane
            yOffset: this.config.layout === 'stacked' ? index * this.config.channelHeight : 0
        };
    }

    /**
     * Get styles specific to ECG visualization
     */
    getStyles() {
        const baseStyles = super.getStyles();

        return {
            ...baseStyles,
            container: {
                ...baseStyles.container,
                backgroundColor: this.config.backgroundColor
            },
            grid: {
                ...baseStyles.grid,
                stroke: this.config.gridColor
            },
            scaleBar: {
                stroke: '#374151',
                strokeWidth: 2,
                fontSize: '11px',
                fontWeight: 500
            }
        };
    }
}

// Export singleton instance
export const ecgVisualization = new ECGVisualization();
