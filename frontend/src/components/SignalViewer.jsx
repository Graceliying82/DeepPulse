import React, { useMemo, useState } from 'react';
import { processSignalData } from '../signals';

/**
 * Universal Medical Signal Viewer
 *
 * Supports multiple signal types through the modular signal architecture:
 * - ECG: Overlay/strip layout with ECG paper grid
 * - EEG: Stacked montage view for neurological interpretation
 * - Extensible for future signal types (PPG, EMG, etc.)
 *
 * The viewer automatically detects signal type and applies appropriate
 * visualization configuration.
 */
const SignalViewer = ({ data, type }) => {
    const [timeWindow, setTimeWindow] = useState(10); // seconds to display
    const [zoom, setZoom] = useState(30); // mm/sec, default standard for EEG

    // Process signal data through the modular architecture
    const { parsed, displayConfig, signalType } = useMemo(() => {
        if (!data || !data.signals) return {};
        return processSignalData(data, type);
    }, [data, type]);

    if (!parsed || !parsed.channels || parsed.channels.length === 0) {
        return (
            <div style={{ padding: 20, color: '#666', textAlign: 'center' }}>
                No signal data available
            </div>
        );
    }

    // Choose renderer based on layout type
    const layout = displayConfig?.layout || 'stacked';

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: displayConfig?.backgroundColor || '#ffffff',
        }}>
            {/* Header with signal info */}
            <SignalHeader
                parsed={parsed}
                signalType={signalType}
                timeWindow={timeWindow}
                onTimeWindowChange={setTimeWindow}
                zoom={zoom}
                onZoomChange={setZoom}
            />

            {/* Signal Display Area */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: 10,
            }}>
                {layout === 'stacked' ? (
                    <StackedMontageView
                        parsed={parsed}
                        displayConfig={displayConfig}
                        timeWindow={timeWindow}
                        zoom={zoom}
                    />
                ) : (
                    <OverlayStripView
                        parsed={parsed}
                        timeWindow={timeWindow}
                    />
                )}
            </div>
        </div>
    );
};

/**
 * Header component showing signal metadata and controls
 */
const SignalHeader = ({ parsed, signalType, timeWindow, onTimeWindowChange, zoom, onZoomChange }) => {
    const metadata = parsed?.metadata || {};
    const isEEG = signalType === 'eeg';

    return (
        <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
        }}>
            <div>
                <div style={{ fontSize: 14, color: '#374151' }}>
                    <strong>{isEEG ? '🧠 EEG' : '❤️ ECG'}</strong>
                    <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
                    <strong>Rate:</strong> {metadata.samplingRate} Hz
                    <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
                    <strong>Duration:</strong> {metadata.duration?.toFixed(1)}s
                    <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
                    <strong>Channels:</strong> {metadata.channelCount}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {isEEG ? (
                        <>
                            {metadata.montage?.name || 'Bipolar Montage'} • Channels organized by anatomical region
                        </>
                    ) : (
                        <>
                            {metadata.leadConfiguration} • Grid: 1mm (0.04s) minor, 5mm (0.2s) major
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Zoom control for EEG */}
                {isEEG && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Zoom:</span>
                        <select
                            value={zoom}
                            onChange={(e) => onZoomChange(Number(e.target.value))}
                            style={{
                                padding: '4px 8px',
                                fontSize: 12,
                                borderRadius: 4,
                                border: '1px solid #d1d5db',
                                backgroundColor: '#fff'
                            }}
                        >
                            <option value={15}>15 mm/s</option>
                            <option value={30}>30 mm/s</option>
                            <option value={60}>60 mm/s</option>
                        </select>
                    </div>
                )}

                {/* Time window control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Window:</span>
                    <select
                        value={timeWindow}
                        onChange={(e) => onTimeWindowChange(Number(e.target.value))}
                        style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid #d1d5db',
                            backgroundColor: '#fff'
                        }}
                    >
                        <option value={5}>5s</option>
                        <option value={10}>10s</option>
                        <option value={20}>20s</option>
                        <option value={30}>30s</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

/**
 * Stacked Montage View - For EEG and multi-channel signals
 * Each channel displayed in its own horizontal lane
 */
const StackedMontageView = ({ parsed, displayConfig, timeWindow, zoom }) => {
    const channels = parsed.channels || [];
    const fs = parsed.metadata?.samplingRate || 256;

    // Layout configuration
    const channelHeight = displayConfig?.channelHeight || 40;
    const channelSpacing = displayConfig?.channelSpacing || 4;
    const labelWidth = displayConfig?.labelWidth || 100;
    const marginRight = 20;
    const marginTop = 10;
    const marginBottom = 40;

    // Pixel calculation based on zoom (mm/s)
    // 96 DPI -> 1 inch = 25.4mm = 96px => 1mm = 3.78px
    const PX_PER_MM = 3.78;
    const pixelsPerSecond = zoom * PX_PER_MM;

    // Time scale
    const effectiveTimeWindow = Math.min(timeWindow, parsed.metadata?.duration || timeWindow);

    const plotWidth = effectiveTimeWindow * pixelsPerSecond;
    const containerWidth = Math.max(1200, plotWidth + labelWidth + marginRight); // Ensure at least 1200px
    const totalHeight = channels.length * (channelHeight + channelSpacing) + marginTop + marginBottom;

    // Generate grid lines
    const gridLines = [];
    const majorInterval = 1; // 1 second major lines
    const minorInterval = 0.2; // 200ms minor lines

    for (let t = 0; t <= effectiveTimeWindow; t += minorInterval) {
        const x = labelWidth + t * pixelsPerSecond;
        const isMajor = Math.abs(t % majorInterval) < 0.01;
        gridLines.push(
            <line
                key={`grid-${t}`}
                x1={x}
                y1={marginTop}
                x2={x}
                y2={totalHeight - marginBottom}
                stroke={isMajor ? '#d1d5db' : '#f3f4f6'}
                strokeWidth={isMajor ? 1 : 0.5}
            />
        );
    }

    // Time axis labels
    const timeLabels = [];
    for (let t = 0; t <= effectiveTimeWindow; t += 1) {
        const x = labelWidth + t * pixelsPerSecond;
        timeLabels.push(
            <text
                key={`time-${t}`}
                x={x}
                y={totalHeight - marginBottom + 15}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
            >
                {t}s
            </text>
        );
    }

    return (
        <svg
            className="signal-viewer-svg"
            width={containerWidth}
            height={totalHeight}
            style={{ display: 'block' }} // Remove minWidth constraint to allow true sizing
        >
            {/* Background */}
            <rect width={containerWidth} height={totalHeight} fill="#ffffff" />

            {/* Grid lines */}
            {gridLines}

            {/* Time labels */}
            {timeLabels}

            {/* Channel traces */}
            {channels.map((channel, idx) => {
                const yOffset = marginTop + idx * (channelHeight + channelSpacing);
                return (
                    <StackedChannelTrace
                        key={idx}
                        channel={channel}
                        yOffset={yOffset}
                        channelHeight={channelHeight}
                        labelWidth={labelWidth}
                        plotWidth={plotWidth}
                        pixelsPerSecond={pixelsPerSecond}
                        fs={fs}
                        timeWindow={effectiveTimeWindow}
                        isEEG={parsed.type === 'eeg'}
                    />
                );
            })}

            {/* Scale bar */}
            <ScaleBar
                x={labelWidth + plotWidth - 100} // Position relative to plot end, but inside
                y={totalHeight - 35}
                timeWidth={pixelsPerSecond}
                amplitudeHeight={20}
                timeLabel="1s"
                amplitudeLabel={parsed.type === 'eeg' ? '50μV' : '1mV'}
            />
        </svg>
    );
};

/**
 * Individual channel trace for stacked view
 */
const StackedChannelTrace = ({
    channel,
    yOffset,
    channelHeight,
    labelWidth,
    plotWidth,
    pixelsPerSecond,
    fs,
    timeWindow,
    isEEG
}) => {
    const signal = channel.displaySignal || channel.rawSignal || [];
    const centerY = yOffset + channelHeight / 2;

    // Get signal for display (limited to time window)
    const samplesToShow = Math.min(signal.length, Math.floor(fs * timeWindow));
    const displaySignal = signal.slice(0, samplesToShow);

    // Calculate amplitude scale (normalize to channel height)
    const padding = 5;
    const effectiveHeight = channelHeight - 2 * padding;

    // For normalized signals, use fixed range; otherwise auto-scale
    let min, max;
    if (displaySignal.length > 0) {
        min = Math.min(...displaySignal);
        max = Math.max(...displaySignal);
    } else {
        min = -1;
        max = 1;
    }
    const range = max - min || 1;
    const scale = effectiveHeight / range;

    // Downsample for performance
    const maxPoints = 2000;
    const step = Math.max(1, Math.floor(displaySignal.length / maxPoints));

    // Generate path
    let pathData = '';
    for (let i = 0; i < displaySignal.length; i += step) {
        const t = i / fs;
        const x = labelWidth + t * pixelsPerSecond;
        const y = centerY - (displaySignal[i] - (min + max) / 2) * scale;

        if (i === 0) {
            pathData = `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
        }
    }

    // Determine channel color
    const channelColor = channel.color || (isEEG ? '#1e40af' : '#dc2626');

    // Get region color for EEG
    const regionColors = {
        'left_temporal': '#dbeafe',
        'left_parasagittal': '#dcfce7',
        'right_parasagittal': '#fef3c7',
        'right_temporal': '#fce7f3',
        'midline': '#f3f4f6'
    };
    const bgColor = isEEG ? (regionColors[channel.montageChain] || 'transparent') : 'transparent';

    return (
        <g>
            {/* Channel background */}
            {bgColor !== 'transparent' && (
                <rect
                    x={labelWidth}
                    y={yOffset}
                    width={plotWidth}
                    height={channelHeight}
                    fill={bgColor}
                    opacity={0.3}
                />
            )}

            {/* Channel label */}
            <text
                x={labelWidth - 8}
                y={centerY}
                fontSize="11"
                fontWeight={channel.isFirstInChain ? 600 : 400}
                fill="#374151"
                textAnchor="end"
                dominantBaseline="middle"
            >
                {channel.name}
            </text>

            {/* Baseline */}
            <line
                x1={labelWidth}
                y1={centerY}
                x2={labelWidth + plotWidth}
                y2={centerY}
                stroke="#e5e7eb"
                strokeWidth={0.5}
                strokeDasharray="2 2"
            />

            {/* Signal trace */}
            {pathData && (
                <path
                    d={pathData}
                    fill="none"
                    stroke={channelColor}
                    strokeWidth={1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}

            {/* Channel boundary */}
            <line
                x1={labelWidth}
                y1={yOffset + channelHeight}
                x2={labelWidth + plotWidth}
                y2={yOffset + channelHeight}
                stroke="#e5e7eb"
                strokeWidth={0.5}
            />
        </g>
    );
};

/**
 * Overlay/Strip View - For ECG signals
 * Traditional ECG paper style with grid
 */
const OverlayStripView = ({ parsed, timeWindow }) => {
    const channels = parsed.channels || [];
    const fs = parsed.metadata?.samplingRate || 500;

    // ECG paper standards
    const MM_PER_SECOND = 25;
    const PX_PER_MM = 96 / 25.4; // ~3.78 px/mm

    // Layout
    const subplotHeight = 150;
    const marginLeft = 80;
    const marginRight = 20;
    const marginTop = 10;
    const marginBottom = 30;

    // Calculate dimensions
    const effectiveTimeWindow = Math.min(timeWindow, parsed.metadata?.duration || timeWindow);
    const widthMM = effectiveTimeWindow * MM_PER_SECOND;
    const widthPX = widthMM * PX_PER_MM;

    const totalWidth = widthPX + marginLeft + marginRight;
    const totalHeight = channels.length * (subplotHeight + marginTop) + marginBottom;

    return (
        <svg
            className="signal-viewer-svg"
            width={totalWidth}
            height={totalHeight}
            style={{ display: 'block' }}
        >
            <defs>
                {/* Minor grid - 1mm (0.04s, 0.1mV) */}
                <pattern
                    id="ecg-grid-minor"
                    width={PX_PER_MM}
                    height={PX_PER_MM}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${PX_PER_MM} 0 L 0 0 0 ${PX_PER_MM}`}
                        fill="none"
                        stroke="#FFB3B3"
                        strokeWidth="0.3"
                        opacity="0.3"
                    />
                </pattern>
                {/* Major grid - 5mm (0.2s, 0.5mV) */}
                <pattern
                    id="ecg-grid-major"
                    width={5 * PX_PER_MM}
                    height={5 * PX_PER_MM}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${5 * PX_PER_MM} 0 L 0 0 0 ${5 * PX_PER_MM}`}
                        fill="none"
                        stroke="#E60000"
                        strokeWidth="1.0"
                        opacity="0.8"
                    />
                </pattern>
            </defs>

            {channels.map((channel, idx) => {
                const yOffset = idx * (subplotHeight + marginTop);
                return (
                    <ECGLeadSubplot
                        key={idx}
                        channel={channel}
                        x={marginLeft}
                        y={yOffset}
                        width={widthPX}
                        height={subplotHeight}
                        fs={fs}
                        timeWindow={effectiveTimeWindow}
                        MM_PER_SECOND={MM_PER_SECOND}
                        PX_PER_MM={PX_PER_MM}
                        isLastLead={idx === channels.length - 1}
                    />
                );
            })}
        </svg>
    );
};

/**
 * Individual ECG lead subplot with medical grid
 */
const ECGLeadSubplot = ({
    channel,
    x,
    y,
    width,
    height,
    fs,
    timeWindow,
    MM_PER_SECOND,
    PX_PER_MM,
    isLastLead
}) => {
    const signal = channel.rawSignal || channel.displaySignal || [];
    const name = channel.name || channel.displayName || 'Lead';

    // Get samples for time window
    const samplesToShow = Math.min(signal.length, Math.floor(fs * timeWindow));
    const displaySignal = signal.slice(0, samplesToShow);

    // Center the signal
    const mean = displaySignal.reduce((a, b) => a + b, 0) / displaySignal.length || 0;
    const centered = displaySignal.map(v => v - mean);

    // Find amplitude range
    let maxAbs = 0;
    for (let i = 0; i < centered.length; i++) {
        maxAbs = Math.max(maxAbs, Math.abs(centered[i]));
    }
    maxAbs = maxAbs || 1;

    const yRangeMV = Math.ceil(maxAbs * 1.2 * 2) / 2;

    // Scale functions
    const xScale = (time) => time * MM_PER_SECOND * PX_PER_MM;
    const yScale = (mV) => height / 2 - (mV / yRangeMV) * (height / 2);

    // Downsample
    const maxPoints = 2000;
    const step = Math.max(1, Math.floor(displaySignal.length / maxPoints));

    // Generate path
    let pathData = '';
    for (let i = 0; i < centered.length; i += step) {
        const t = i / fs;
        const px = xScale(t);
        const py = yScale(centered[i]);

        if (i === 0) {
            pathData = `M ${px} ${py}`;
        } else {
            pathData += ` L ${px} ${py}`;
        }
    }

    // Time markers
    const timeMarkers = [];
    for (let t = 0; t <= timeWindow; t += 1) {
        const xPos = xScale(t);
        timeMarkers.push(
            <g key={t}>
                <line
                    x1={xPos}
                    y1={0}
                    x2={xPos}
                    y2={height}
                    stroke="#94a3b8"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                    opacity="0.4"
                />
                {isLastLead && (
                    <text x={xPos} y={height + 15} fontSize="9" fill="#6b7280" textAnchor="middle">
                        {t}s
                    </text>
                )}
            </g>
        );
    }

    return (
        <g transform={`translate(${x}, ${y})`}>
            {/* Background */}
            <rect width={width} height={height} fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />

            {/* Grids */}
            <rect width={width} height={height} fill="url(#ecg-grid-minor)" />
            <rect width={width} height={height} fill="url(#ecg-grid-major)" />

            {/* Time markers */}
            {timeMarkers}

            {/* Lead label */}
            <text
                x="10"
                y="20"
                fontSize="14"
                fontWeight="bold"
                fill={channel.color || '#16a34a'}
                style={{ textShadow: '0 0 3px white' }}
            >
                {name}
            </text>

            {/* Waveform */}
            {pathData && (
                <path
                    d={pathData}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}

            {/* Baseline */}
            <line
                x1="0"
                y1={height / 2}
                x2={width}
                y2={height / 2}
                stroke="#94a3b8"
                strokeWidth="0.5"
                strokeDasharray="4 2"
                opacity="0.3"
            />
        </g>
    );
};

/**
 * Scale bar component
 */
const ScaleBar = ({ x, y, timeWidth, amplitudeHeight, timeLabel, amplitudeLabel }) => (
    <g transform={`translate(${x}, ${y})`}>
        {/* Time bar */}
        <line x1={0} y1={0} x2={timeWidth} y2={0} stroke="#374151" strokeWidth={2} />
        <text x={timeWidth / 2} y={12} fontSize="10" fill="#374151" textAnchor="middle">
            {timeLabel}
        </text>

        {/* Amplitude bar */}
        <line x1={0} y1={0} x2={0} y2={-amplitudeHeight} stroke="#374151" strokeWidth={2} />
        <text x={-5} y={-amplitudeHeight / 2} fontSize="10" fill="#374151" textAnchor="end" dominantBaseline="middle">
            {amplitudeLabel}
        </text>
    </g>
);

export default SignalViewer;
