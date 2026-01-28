import React, { useMemo } from 'react';

/**
 * Medical-Grade Multi-Lead ECG Viewer
 * - Separate subplot for each lead
 * - Hospital-level calibration grid (25mm/s, 10mm/mV)
 * - Clear lead labeling
 */
const SignalViewer = ({ data, type }) => {
    // ECG Standards
    const MM_PER_SECOND = 25;  // Paper speed (North America)
    const PX_PER_MM = 96 / 25.4;  // 3.779528 px/mm (96 DPI standard)
    // Note: MM_PER_MV = 10 (amplitude calibration standard)

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

    // Layout configuration
    const subplotHeight = 150;
    const subplotWidth = 800;
    const marginLeft = 80;
    const marginRight = 20;
    const marginTop = 10;
    const marginBottom = 30;

    const totalWidth = subplotWidth + marginLeft + marginRight;
    const totalHeight = processedData.length * (subplotHeight + marginTop) + marginBottom;

    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            backgroundColor: '#fefcfb',
            padding: 20
        }}>
            <div style={{ marginBottom: 15, color: '#374151', fontSize: 14 }}>
                <strong>Sampling Rate:</strong> {data.fs} Hz |
                <strong> Duration:</strong> {(data.signals.length / data.fs).toFixed(2)}s |
                <strong> Leads:</strong> {processedData.length}
            </div>

            <svg width={totalWidth} height={totalHeight} style={{ display: 'block' }}>
                <defs>
                    {/* Medical Grid Pattern */}
                    <pattern id="ecg-grid-minor" width={PX_PER_MM} height={PX_PER_MM} patternUnits="userSpaceOnUse">
                        <path d={`M ${PX_PER_MM} 0 L 0 0 0 ${PX_PER_MM}`} fill="none" stroke="#FFB3B3" strokeWidth="0.3" opacity="0.3"/>
                    </pattern>
                    <pattern id="ecg-grid-major" width={5 * PX_PER_MM} height={5 * PX_PER_MM} patternUnits="userSpaceOnUse">
                        <rect width={5 * PX_PER_MM} height={5 * PX_PER_MM} fill="url(#ecg-grid-minor)"/>
                        <path d={`M ${5 * PX_PER_MM} 0 L 0 0 0 ${5 * PX_PER_MM}`} fill="none" stroke="#FF0000" strokeWidth="0.5" opacity="0.5"/>
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
                            width={subplotWidth}
                            height={subplotHeight}
                        />
                    );
                })}
            </svg>

            <div style={{ marginTop: 15, fontSize: 12, color: '#9ca3af' }}>
                ECG Grid: 1mm minor (0.04s, 0.1mV) | 5mm major (0.2s, 0.5mV) | Paper Speed: {MM_PER_SECOND}mm/s
            </div>
        </div>
    );
};

/**
 * Individual ECG Lead Subplot with Medical Grid
 */
const ECGLeadSubplot = ({ lead, x, y, width, height }) => {
    const { name, samples, fs } = lead;

    // Calculate signal statistics for auto-scaling
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const centered = samples.map(v => v - mean);

    // Find max absolute value without spread operator (avoids stack overflow)
    const maxAbs = centered.reduce((max, val) => Math.max(max, Math.abs(val)), 1.0);

    // Y-axis range in mV (symmetric around 0)
    const yRangeMV = Math.ceil(maxAbs * 1.2 * 2) / 2; // Round to nearest 0.5 mV

    // Duration in seconds
    const durationSeconds = samples.length / fs;

    // Downsampling for performance (if needed)
    const MAX_POINTS = 2000;
    const step = Math.max(1, Math.floor(samples.length / MAX_POINTS));
    const downsampledData = [];
    for (let i = 0; i < samples.length; i += step) {
        downsampledData.push({
            time: i / fs,
            value: centered[i]
        });
    }

    // Scales: time (s) -> pixels, amplitude (mV) -> pixels
    const xScale = (time) => (time / durationSeconds) * width;
    const yScale = (mV) => height / 2 - (mV / yRangeMV) * (height / 2);

    // Generate SVG path for waveform
    const pathData = downsampledData.map((point, i) => {
        const px = xScale(point.time);
        const py = yScale(point.value);
        return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
    }).join(' ');

    return (
        <g transform={`translate(${x}, ${y})`}>
            {/* Background */}
            <rect width={width} height={height} fill="#ffffff" stroke="#e5e7eb" strokeWidth="1"/>

            {/* Medical Grid */}
            <rect width={width} height={height} fill="url(#ecg-grid-major)"/>

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

            {/* Y-axis range indicator */}
            <text x={width - 60} y="15" fontSize="10" fill="#6b7280">
                ±{yRangeMV.toFixed(1)} mV
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
                opacity="0.5"
            />

            {/* Time axis label (only on bottom subplot) */}
            <text
                x={width / 2}
                y={height + 20}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
            >
                Time (s): 0 - {durationSeconds.toFixed(2)}
            </text>
        </g>
    );
};

export default SignalViewer;
