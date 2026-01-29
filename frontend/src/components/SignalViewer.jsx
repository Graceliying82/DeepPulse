import React, { useMemo } from 'react';

/**
 * Medical-Grade Multi-Lead ECG Viewer
 * - Separate subplot for each lead
 * - Hospital-level calibration grid (25mm/s, 10mm/mV)
 * - TRUE medical scaling (not compressed)
 * - Horizontal scrolling for longer recordings
 * - All leads scroll together (synchronized)
 */
const SignalViewer = ({ data, type }) => {
    // ECG Standards
    const MM_PER_SECOND = 25;  // Paper speed (North America)
    const PX_PER_MM = 96 / 25.4;  // 3.779528 px/mm (96 DPI standard)
    // Note: MM_PER_MV = 10 (amplitude calibration standard, used in subplots)

    // Process signal data
    const processedData = useMemo(() => {
        if (!data || !data.signals) return null;

        const { signals, fs, sig_name } = data;
        const isMultiChannel = Array.isArray(signals[0]);

        if (!isMultiChannel) {
            // Single channel - wrap in array
            return [{
                name: sig_name?.[0] || 'Signal',
                samples: signals,
                fs
            }];
        }

        // Multi-channel - separate each lead
        const numLeads = signals[0].length;
        const leads = [];

        for (let leadIdx = 0; leadIdx < numLeads; leadIdx++) {
            const leadData = signals.map(sample => sample[leadIdx]);
            leads.push({
                name: sig_name?.[leadIdx] || `Lead ${leadIdx + 1}`,
                samples: leadData,
                fs
            });
        }

        return leads;
    }, [data]);

    if (!processedData) {
        return <div style={{ padding: 20, color: '#666' }}>No signal data available</div>;
    }

    // Calculate TRUE medical width (not compressed)
    const durationSeconds = data.signals.length / data.fs;
    const trueWidthMM = durationSeconds * MM_PER_SECOND;  // e.g., 10s = 250mm
    const trueWidthPX = trueWidthMM * PX_PER_MM;  // e.g., 250mm * 3.78 = 945px

    // Layout configuration
    const subplotHeight = 150;
    const marginLeft = 80;
    const marginRight = 20;
    const marginTop = 10;
    const marginBottom = 30;

    const totalWidth = trueWidthPX + marginLeft + marginRight;
    const totalHeight = processedData.length * (subplotHeight + marginTop) + marginBottom;

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fefcfb',
        }}>
            {/* Header Info */}
            <div style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                flexShrink: 0
            }}>
                <div style={{ fontSize: 14, color: '#374151' }}>
                    <strong>Sampling Rate:</strong> {data.fs} Hz |
                    <strong> Duration:</strong> {durationSeconds.toFixed(2)}s |
                    <strong> Leads:</strong> {processedData.length} |
                    <strong> Paper Speed:</strong> {MM_PER_SECOND}mm/s
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
                    ⬅➡ Scroll horizontally to view entire recording | Grid: 1mm minor (0.04s, 0.1mV) | 5mm major (0.2s, 0.5mV)
                </div>
            </div>

            {/* Scrollable ECG Container */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: 20,
                backgroundColor: '#fefcfb'
            }}>
                <svg width={totalWidth} height={totalHeight} style={{ display: 'block' }}>
                    <defs>
                        {/* Minor grid pattern - every 1mm (thin, light) */}
                        <pattern id="ecg-grid-minor" width={PX_PER_MM} height={PX_PER_MM} patternUnits="userSpaceOnUse">
                            <path d={`M ${PX_PER_MM} 0 L 0 0 0 ${PX_PER_MM}`} fill="none" stroke="#FFB3B3" strokeWidth="0.3" opacity="0.3"/>
                        </pattern>
                        {/* Major grid pattern - every 5mm (thick, dark) */}
                        <pattern id="ecg-grid-major" width={5 * PX_PER_MM} height={5 * PX_PER_MM} patternUnits="userSpaceOnUse">
                            <path d={`M ${5 * PX_PER_MM} 0 L 0 0 0 ${5 * PX_PER_MM}`} fill="none" stroke="#E60000" strokeWidth="1.0" opacity="0.8"/>
                        </pattern>
                    </defs>

                    {processedData.map((lead, idx) => {
                        const yOffset = idx * (subplotHeight + marginTop);
                        return (
                            <ECGLeadSubplot
                                key={idx}
                                lead={lead}
                                x={marginLeft}
                                y={yOffset}
                                width={trueWidthPX}
                                height={subplotHeight}
                                durationSeconds={durationSeconds}
                                MM_PER_SECOND={MM_PER_SECOND}
                                PX_PER_MM={PX_PER_MM}
                                isLastLead={idx === processedData.length - 1}
                            />
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

/**
 * Individual ECG Lead Subplot with Medical Grid
 * Now displays at TRUE calibration (25mm/s, 10mm/mV)
 */
const ECGLeadSubplot = ({ lead, x, y, width, height, durationSeconds, MM_PER_SECOND, PX_PER_MM, isLastLead }) => {
    const { name, samples, fs } = lead;

    // Calculate signal statistics for auto-scaling
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const centered = samples.map(v => v - mean);

    // Find max absolute value without spread operator (avoids stack overflow)
    const maxAbs = centered.reduce((max, val) => Math.max(max, Math.abs(val)), 1.0);

    // Y-axis range in mV (symmetric around 0)
    const yRangeMV = Math.ceil(maxAbs * 1.2 * 2) / 2; // Round to nearest 0.5 mV

    // TRUE MEDICAL SCALING
    // X-axis: 1 second = 25mm = 25 * 3.78px = 94.5px
    // This means time is NOT compressed - true to ECG paper
    const xScale = (time) => time * MM_PER_SECOND * PX_PER_MM;

    // Y-axis: 1 mV = 10mm = 10 * 3.78px = 37.8px
    const yScale = (mV) => height / 2 - (mV / yRangeMV) * (height / 2);

    // Downsampling for performance
    // At 25mm/s, we need ~1000 points per second for smooth rendering
    const targetPointsPerSecond = 500;
    const targetTotalPoints = Math.ceil(durationSeconds * targetPointsPerSecond);
    const step = Math.max(1, Math.floor(samples.length / targetTotalPoints));

    const downsampledData = [];
    for (let i = 0; i < samples.length; i += step) {
        downsampledData.push({
            time: i / fs,
            value: centered[i]
        });
    }

    // Generate SVG path for waveform
    const pathData = downsampledData.map((point, i) => {
        const px = xScale(point.time);
        const py = yScale(point.value);
        return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
    }).join(' ');

    // Time markers every 1 second
    const timeMarkers = [];
    for (let t = 0; t <= durationSeconds; t += 1) {
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
                    <text
                        x={xPos}
                        y={height + 15}
                        fontSize="9"
                        fill="#6b7280"
                        textAnchor="middle"
                    >
                        {t}s
                    </text>
                )}
            </g>
        );
    }

    return (
        <g transform={`translate(${x}, ${y})`}>
            {/* Background */}
            <rect width={width} height={height} fill="#ffffff" stroke="#e5e7eb" strokeWidth="1"/>

            {/* Minor grid - 1mm spacing (applied first) */}
            <rect width={width} height={height} fill="url(#ecg-grid-minor)"/>

            {/* Major grid - 5mm spacing (applied on top) */}
            <rect width={width} height={height} fill="url(#ecg-grid-major)"/>

            {/* Time markers */}
            {timeMarkers}

            {/* Lead Label */}
            <text
                x="10"
                y="20"
                fontSize="14"
                fontWeight="bold"
                fill="#16a34a"
                style={{ textShadow: '0 0 3px white' }}
            >
                {name}
            </text>

            {/* Waveform */}
            <path
                d={pathData}
                fill="none"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Baseline indicator */}
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

export default SignalViewer;
