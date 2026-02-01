/**
 * EEGVisualization - Visualization configuration for EEG/Neurological signals
 *
 * EEG-specific display features:
 * - Stacked channel montage view (essential for neurological interpretation)
 * - Channels organized by anatomical location (10-20 system)
 * - 30mm/s standard speed
 * - 7μV/mm standard sensitivity
 * - Clear channel labels on left
 * - Scale bar showing time and amplitude
 * - Chain separators for montage grouping
 */

import { BaseVisualization } from './BaseVisualization';

export class EEGVisualization extends BaseVisualization {
    constructor(config = {}) {
        super({
            // EEG defaults - STACKED is essential
            layout: 'stacked',
            timeWindow: 10,
            showGrid: true,

            // EEG paper style grid
            gridColor: '#e5e7eb',
            gridOpacity: 0.6,
            majorGridColor: '#d1d5db',
            minorGridColor: '#f3f4f6',

            // Standard EEG settings
            paperSpeed: 30,              // mm/s
            sensitivity: 7,              // μV/mm

            // Grid intervals
            majorTimeInterval: 1.0,      // 1 second (major vertical)
            minorTimeInterval: 0.2,      // 200ms (minor vertical)

            // Channel display - CRITICAL for EEG
            channelHeight: 40,           // Height per channel
            channelSpacing: 4,           // Gap between channels
            channelPadding: 5,           // Padding within channel

            // Line style
            lineWidth: 1,
            backgroundColor: '#ffffff',

            // Labels - ESSENTIAL for EEG
            showChannelLabels: true,
            labelPosition: 'left',
            labelWidth: 100,             // Wider for electrode pair names
            labelFontSize: 11,

            // Montage chain separators
            showChainSeparators: true,
            chainSeparatorColor: '#9ca3af',
            chainSeparatorWidth: 2,

            // Scale bar
            showScaleBar: true,
            scaleBarAmplitude: 50,       // μV
            scaleBarTime: 1,             // second
            scaleBarPosition: 'bottom-right',

            // Amplitude scaling
            amplitudeMode: 'fixed',      // 'fixed', 'auto', 'channel'
            fixedAmplitude: 100,         // μV (full scale)

            // Region color coding
            regionColors: {
                'left_temporal': '#dbeafe',
                'left_parasagittal': '#dcfce7',
                'right_parasagittal': '#fef3c7',
                'right_temporal': '#fce7f3',
                'midline': '#f3f4f6'
            },

            ...config
        });
    }

    getType() {
        return 'eeg';
    }

    /**
     * Calculate dimensions for stacked EEG montage
     */
    calculateDimensions(containerWidth, containerHeight, numChannels) {
        const { channelHeight, channelSpacing, labelWidth, showChannelLabels } = this.config;

        const effectiveLabelWidth = showChannelLabels ? labelWidth : 0;
        const plotWidth = containerWidth - effectiveLabelWidth - 40; // Extra padding

        // Total height = all channels + spacing + margins
        const plotHeight = numChannels * channelHeight + (numChannels - 1) * channelSpacing;

        return {
            width: containerWidth,
            height: plotHeight + 100, // Extra for scale bar and margins
            plotWidth,
            plotHeight,
            labelWidth: effectiveLabelWidth,
            marginTop: 30,
            marginBottom: 60,
            marginLeft: effectiveLabelWidth + 20,
            marginRight: 20,
            channelHeight,
            channelSpacing
        };
    }

    /**
     * Generate EEG-style grid lines
     */
    getGridConfig(dimensions, timeScale, fs) {
        const { plotWidth, marginLeft, marginTop, channelHeight, channelSpacing } = dimensions;
        const { majorTimeInterval, minorTimeInterval, majorGridColor, minorGridColor } = this.config;

        const lines = [];
        const pixelsPerSecond = timeScale.pixelsPerSecond;
        const totalHeight = dimensions.plotHeight;

        // Minor vertical lines (every 200ms)
        const minorTimePixels = minorTimeInterval * pixelsPerSecond;
        for (let x = 0; x < plotWidth; x += minorTimePixels) {
            lines.push({
                type: 'vertical',
                x: marginLeft + x,
                y1: marginTop,
                y2: marginTop + totalHeight,
                color: minorGridColor,
                width: 0.5
            });
        }

        // Major vertical lines (every 1 second)
        const majorTimePixels = majorTimeInterval * pixelsPerSecond;
        for (let x = 0; x <= plotWidth; x += majorTimePixels) {
            lines.push({
                type: 'vertical',
                x: marginLeft + x,
                y1: marginTop,
                y2: marginTop + totalHeight,
                color: majorGridColor,
                width: 1
            });
        }

        return lines;
    }

    /**
     * Get channel layout configuration for stacked view
     */
    getChannelLayout(channels, dimensions) {
        const { channelHeight, channelSpacing, marginTop, marginLeft, plotWidth } = dimensions;
        const { regionColors, showChainSeparators } = this.config;

        let currentY = marginTop;
        let previousChain = null;
        const layout = [];

        channels.forEach((channel, index) => {
            const chain = channel.montageChain || 'other';

            // Add chain separator if chain changed
            const isNewChain = chain !== previousChain && previousChain !== null && showChainSeparators;
            if (isNewChain) {
                currentY += channelSpacing * 2; // Extra spacing between chains
            }

            layout.push({
                index,
                channel,
                y: currentY,
                height: channelHeight,
                x: marginLeft,
                width: plotWidth,
                centerY: currentY + channelHeight / 2,
                backgroundColor: regionColors[chain] || 'transparent',
                isFirstInChain: chain !== previousChain,
                chain
            });

            currentY += channelHeight + channelSpacing;
            previousChain = chain;
        });

        return layout;
    }

    /**
     * Get configuration for channel labels
     */
    getChannelLabelConfig(channelLayout, dimensions) {
        const { labelFontSize, labelWidth } = this.config;

        return channelLayout.map(layout => ({
            x: dimensions.marginLeft - 10,
            y: layout.centerY,
            text: layout.channel.name,
            fontSize: labelFontSize,
            textAnchor: 'end',
            alignmentBaseline: 'middle',
            color: layout.channel.color || '#374151',
            fontWeight: layout.isFirstInChain ? 600 : 400
        }));
    }

    /**
     * Get chain separator lines
     */
    getChainSeparators(channelLayout, dimensions) {
        if (!this.config.showChainSeparators) return [];

        const separators = [];
        let previousChain = null;

        channelLayout.forEach((layout, index) => {
            if (layout.chain !== previousChain && previousChain !== null) {
                separators.push({
                    x1: dimensions.marginLeft - this.config.labelWidth,
                    x2: dimensions.marginLeft + dimensions.plotWidth,
                    y: layout.y - dimensions.channelSpacing,
                    color: this.config.chainSeparatorColor,
                    width: this.config.chainSeparatorWidth,
                    chainLabel: this.getChainLabel(layout.chain)
                });
            }
            previousChain = layout.chain;
        });

        return separators;
    }

    /**
     * Get human-readable chain label
     */
    getChainLabel(chain) {
        const labels = {
            'left_temporal': 'Left Temporal',
            'left_parasagittal': 'Left Parasagittal',
            'right_parasagittal': 'Right Parasagittal',
            'right_temporal': 'Right Temporal',
            'midline': 'Midline'
        };
        return labels[chain] || '';
    }

    /**
     * Get scale bar configuration for EEG
     */
    getScaleBarConfig(dimensions) {
        const { plotWidth, plotHeight, marginLeft, marginTop } = dimensions;
        const { scaleBarAmplitude, scaleBarTime, sensitivity, paperSpeed } = this.config;

        // Calculate pixel sizes based on standard settings
        const timeBarPixels = scaleBarTime * (paperSpeed * 2); // Approximate
        const amplitudeBarPixels = scaleBarAmplitude / sensitivity;

        return {
            position: {
                x: marginLeft + plotWidth - 120,
                y: marginTop + plotHeight + 20
            },
            time: {
                width: timeBarPixels,
                label: `${scaleBarTime}s`
            },
            amplitude: {
                height: amplitudeBarPixels,
                label: `${scaleBarAmplitude}μV`
            },
            style: {
                strokeWidth: 2,
                color: '#374151',
                fontSize: '11px'
            }
        };
    }

    /**
     * Get amplitude scale for a single channel
     */
    getChannelAmplitudeScale(signal, channelHeight) {
        const { amplitudeMode, fixedAmplitude } = this.config;
        const padding = this.config.channelPadding;
        const effectiveHeight = channelHeight - 2 * padding;

        if (amplitudeMode === 'fixed') {
            // Fixed amplitude range (e.g., ±100μV)
            return {
                min: -fixedAmplitude,
                max: fixedAmplitude,
                scale: effectiveHeight / (2 * fixedAmplitude)
            };
        }

        // Auto-scale based on signal
        if (!signal || signal.length === 0) {
            return { min: -100, max: 100, scale: effectiveHeight / 200 };
        }

        const min = Math.min(...signal);
        const max = Math.max(...signal);
        const range = max - min || 200;
        const scale = effectiveHeight / range;

        return { min, max, range, scale };
    }

    /**
     * Get styles specific to EEG visualization
     */
    getStyles() {
        const baseStyles = super.getStyles();

        return {
            ...baseStyles,
            container: {
                ...baseStyles.container,
                backgroundColor: this.config.backgroundColor,
                overflowY: 'auto'  // Allow vertical scrolling for many channels
            },
            channelBackground: {
                opacity: 0.3
            },
            channelLabel: {
                fontSize: `${this.config.labelFontSize}px`,
                fontFamily: 'system-ui, -apple-system, sans-serif'
            },
            chainSeparator: {
                stroke: this.config.chainSeparatorColor,
                strokeWidth: this.config.chainSeparatorWidth,
                strokeDasharray: '4,4'
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
export const eegVisualization = new EEGVisualization();
