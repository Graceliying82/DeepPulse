import React, { useMemo, useState, useRef, useEffect } from 'react';
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

            {/* Signal Display Area - Split Pane for Fixed Labels */}
            <div style={{
                flex: 1,
                overflow: 'hidden', // Manage scrolling internally in views
                position: 'relative'
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
    const isHemodynamic = signalType === 'hemodynamic';

    let title = '❤️ ECG';
    if (isEEG) title = '🧠 EEG';
    else if (isHemodynamic) title = '💉 Hemodynamic';

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
                    <strong>{title}</strong>
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
                    ) : isHemodynamic ? (
                        <>
                            Multi-parameter Monitoring • {metadata.description || 'Hemodynamic Signals'}
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
                                backgroundColor: '#fff',
                                color: '#374151'
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
                            backgroundColor: '#fff',
                            color: '#374151'
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
 * Implements fixed label column on left and scrolling content on right
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

    // Refs for scroll sync
    const colLabelsRef = useRef(null);
    const colSignalRef = useRef(null);

    // Sync vertical scroll from signal to labels
    const handleScroll = (e) => {
        if (colLabelsRef.current) {
            colLabelsRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Pixel calculation based on zoom (mm/s)
    const PX_PER_MM = 3.78;
    const pixelsPerSecond = zoom * PX_PER_MM;

    // Time scale
    const effectiveTimeWindow = Math.min(timeWindow, parsed.metadata?.duration || timeWindow);

    const plotWidth = effectiveTimeWindow * pixelsPerSecond;
    // We adjust container width to be just plot+margin because labels are separate now
    // But we keep plot dimensions logical for the Right pane
    const totalHeight = channels.length * (channelHeight + channelSpacing) + marginTop + marginBottom;
    const rightPaneWidth = Math.max(800, plotWidth + marginRight);

    // Generate grid lines (Right Pane Only)
    const gridLines = [];
    const majorInterval = 1; // 1 second major lines
    const minorInterval = 0.2; // 200ms minor lines

    for (let t = 0; t <= effectiveTimeWindow; t += minorInterval) {
        // x is relative to plot start (0 in right pane context + offset if needed)
        // In original logic: x = labelWidth + t*pps
        // We will transform the Right Pane content by translateX(-labelWidth)
        // So we keep original coordinate calculations to avoid complexity
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

    // Time axis labels (Right Pane Only)
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
        <div className="signal-viewer-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Left Pane: Fixed Labels */}
            <div
                ref={colLabelsRef}
                style={{
                    width: labelWidth,
                    flexShrink: 0,
                    overflow: 'hidden', // Hide scrollbars, scrolled via JS
                    borderRight: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    zIndex: 10
                }}
            >
                <svg width={labelWidth} height={totalHeight}>
                    {channels.map((channel, idx) => {
                        const yOffset = marginTop + idx * (channelHeight + channelSpacing);
                        return (
                            <StackedChannelTrace
                                key={`label-${idx}`}
                                channel={channel}
                                yOffset={yOffset}
                                channelHeight={channelHeight}
                                labelWidth={labelWidth}
                                plotWidth={0} // No plot needed here
                                pixelsPerSecond={0}
                                fs={fs}
                                timeWindow={0}
                                isEEG={parsed.type === 'eeg'}
                                showLabel={true}
                                showSignal={false}
                            />
                        );
                    })}
                </svg>
            </div>

            {/* Right Pane: Scrolling Signals */}
            <div
                ref={colSignalRef}
                style={{
                    flex: 1,
                    overflow: 'auto', // Scroll both axes
                    height: '100%'
                }}
                onScroll={handleScroll}
            >
                <svg
                    className="signal-viewer-svg"
                    width={rightPaneWidth}
                    height={totalHeight}
                    style={{ display: 'block' }}
                >
                    {/* Background */}
                    <rect width={rightPaneWidth} height={totalHeight} fill="#ffffff" />

                    {/* Shift everything left by labelWidth so t=0 aligns with left edge */}
                    <g transform={`translate(-${labelWidth}, 0)`}>
                        {/* Grid lines */}
                        {gridLines}

                        {/* Time labels */}
                        {timeLabels}

                        {/* Channel traces */}
                        {channels.map((channel, idx) => {
                            const yOffset = marginTop + idx * (channelHeight + channelSpacing);
                            return (
                                <StackedChannelTrace
                                    key={`trace-${idx}`}
                                    channel={channel}
                                    yOffset={yOffset}
                                    channelHeight={channelHeight}
                                    labelWidth={labelWidth}
                                    plotWidth={plotWidth}
                                    pixelsPerSecond={pixelsPerSecond}
                                    fs={fs}
                                    timeWindow={effectiveTimeWindow}
                                    isEEG={parsed.type === 'eeg'}
                                    showLabel={false}
                                    showSignal={true}
                                />
                            );
                        })}

                        {/* Scale bar */}
                        <ScaleBar
                            x={labelWidth + plotWidth - 100}
                            y={totalHeight - 35}
                            timeWidth={pixelsPerSecond}
                            amplitudeHeight={20}
                            timeLabel="1s"
                            amplitudeLabel={parsed.type === 'eeg' ? '50μV' : '1mV'}
                        />
                    </g>
                </svg>
            </div>
        </div>
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
    isEEG,
    showLabel = true,
    showSignal = true
}) => {
    const signal = channel.displaySignal || channel.rawSignal || [];
    const centerY = yOffset + channelHeight / 2;

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
            {/* Context: Label Pane */}
            {showLabel && (
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
            )}

            {/* Context: Signal Pane */}
            {showSignal && (
                <>
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
                    {(() => {
                        // Logic calculation only if needed
                        // Get signal for display (limited to time window)
                        const samplesToShow = Math.min(signal.length, Math.floor(fs * timeWindow));
                        const displaySignal = signal.slice(0, samplesToShow);

                        // Calculate amplitude scale (normalize to channel height)
                        const padding = 5;
                        const effectiveHeight = channelHeight - 2 * padding;

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

                        return pathData && (
                            <path
                                d={pathData}
                                fill="none"
                                stroke={channelColor}
                                strokeWidth={1}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        );
                    })()}

                    {/* Channel boundary */}
                    <line
                        x1={labelWidth}
                        y1={yOffset + channelHeight}
                        x2={labelWidth + plotWidth}
                        y2={yOffset + channelHeight}
                        stroke="#e5e7eb"
                        strokeWidth={0.5}
                    />
                </>
            )}
        </g>
    );
};

/**
 * Overlay/Strip View - For ECG signals
 * Implements fixed label column on left and scrolling content on right
 */
const OverlayStripView = ({ parsed, timeWindow }) => {
    const channels = parsed.channels || [];
    const fs = parsed.metadata?.samplingRate || 500;

    // ECG paper standards
    const MM_PER_SECOND = 25;
    const PX_PER_MM = 96 / 25.4; // ~3.78 px/mm

    // Layout
    const subplotHeight = 150;
    const marginLeft = 80; // Used as label width
    const marginRight = 20;
    const marginTop = 10;
    const marginBottom = 30;

    // Refs for scroll sync
    const colLabelsRef = useRef(null);
    const colSignalRef = useRef(null);

    const handleScroll = (e) => {
        if (colLabelsRef.current) {
            colLabelsRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Calculate dimensions
    const effectiveTimeWindow = Math.min(timeWindow, parsed.metadata?.duration || timeWindow);
    const widthMM = effectiveTimeWindow * MM_PER_SECOND;
    const widthPX = widthMM * PX_PER_MM;

    const totalHeight = channels.length * (subplotHeight + marginTop) + marginBottom;
    const rightPaneWidth = widthPX + marginRight;

    // Defs for grid patterns (must be available in Right Pane)
    const renderDefs = () => (
        <defs>
            <pattern id="ecg-grid-minor" width={PX_PER_MM} height={PX_PER_MM} patternUnits="userSpaceOnUse">
                <path d={`M ${PX_PER_MM} 0 L 0 0 0 ${PX_PER_MM}`} fill="none" stroke="#FFB3B3" strokeWidth="0.3" opacity="0.3" />
            </pattern>
            <pattern id="ecg-grid-major" width={5 * PX_PER_MM} height={5 * PX_PER_MM} patternUnits="userSpaceOnUse">
                <path d={`M ${5 * PX_PER_MM} 0 L 0 0 0 ${5 * PX_PER_MM}`} fill="none" stroke="#E60000" strokeWidth="1.0" opacity="0.8" />
            </pattern>
        </defs>
    );

    return (
        <div className="signal-viewer-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Left Pane: Fixed Labels */}
            <div
                ref={colLabelsRef}
                style={{
                    width: marginLeft,
                    flexShrink: 0,
                    overflow: 'hidden',
                    borderRight: '1px solid #CCC',
                    backgroundColor: '#fff',
                    zIndex: 10
                }}
            >
                <svg width={marginLeft} height={totalHeight}>
                    {channels.map((channel, idx) => {
                        const yOffset = idx * (subplotHeight + marginTop);
                        return (
                            <ECGLeadSubplot
                                key={`label-${idx}`}
                                channel={channel}
                                x={marginLeft} // Coordinate logic matches original
                                y={yOffset}
                                width={0}
                                height={subplotHeight}
                                fs={fs}
                                timeWindow={0}
                                MM_PER_SECOND={MM_PER_SECOND}
                                PX_PER_MM={PX_PER_MM}
                                isLastLead={false}
                                showLabel={true}
                                showSignal={false}
                            />
                        );
                    })}
                </svg>
            </div>

            {/* Right Pane: Waveforms */}
            <div
                ref={colSignalRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    height: '100%'
                }}
                onScroll={handleScroll}
            >
                <svg
                    width={rightPaneWidth}
                    height={totalHeight}
                    style={{ display: 'block' }}
                >
                    {renderDefs()}
                    <g transform={`translate(-${marginLeft}, 0)`}>
                        {channels.map((channel, idx) => {
                            const yOffset = idx * (subplotHeight + marginTop);
                            return (
                                <ECGLeadSubplot
                                    key={`signal-${idx}`}
                                    channel={channel}
                                    x={marginLeft} // Coordinate logic matches original
                                    y={yOffset}
                                    width={widthPX}
                                    height={subplotHeight}
                                    fs={fs}
                                    timeWindow={effectiveTimeWindow}
                                    MM_PER_SECOND={MM_PER_SECOND}
                                    PX_PER_MM={PX_PER_MM}
                                    isLastLead={idx === channels.length - 1}
                                    showLabel={false}
                                    showSignal={true}
                                />
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
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
    isLastLead,
    showLabel = true,
    showSignal = true
}) => {
    const signal = channel.rawSignal || channel.displaySignal || [];
    const name = channel.name || channel.displayName || 'Lead';

    const renderSignal = () => {
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
            <>
                <rect width={width} height={height} fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
                <rect width={width} height={height} fill="url(#ecg-grid-minor)" />
                <rect width={width} height={height} fill="url(#ecg-grid-major)" />
                {timeMarkers}
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
            </>
        );
    };

    return (
        <g transform={`translate(${x}, ${y})`}>
            {showSignal && renderSignal()}

            {showLabel && (
                // Position relative to x=x (which is marginLeft). 
                // We want it visually in the left pane. 
                // In Left Pane context: x is passed as marginLeft. transform moves us to marginLeft.
                // We want text at, say, 70px (just before 80).
                // x prop is 80. transform(80, y).
                // If text x="-10", absolute x is 70.
                // Since our Left Pane SVG is width=80, 70 is visible.
                <text
                    x="-10" // Relative to start of signal area
                    y="20"
                    fontSize="14"
                    fontWeight="bold"
                    fill={channel.color || '#16a34a'}
                    textAnchor="end" // Align right
                    style={{ textShadow: '0 0 3px white' }}
                >
                    {name}
                </text>
            )}
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
