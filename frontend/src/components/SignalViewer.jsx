import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const SignalViewer = ({ data, type }) => {
    // Convert raw signal arrays to Recharts-friendly object array
    // Data.signals is shape [samples, channels] or just [samples]

    const chartData = useMemo(() => {
        if (!data || !data.signals) return [];

        // Safety limit / Downsampling for MVP visualization
        // Recharts struggles with > 5000 points.
        const MAX_POINTS = 2000;
        const raw = data.signals;

        // Assuming raw is list of lists (multi-channel) or list of values
        const isMulti = Array.isArray(raw[0]);
        const totalSamples = raw.length;
        const step = Math.ceil(totalSamples / MAX_POINTS);

        const formatted = [];
        for (let i = 0; i < totalSamples; i += step) {
            const point = { time: i / data.fs }; // Time in seconds
            if (isMulti) {
                // Take first 3 channels max for demo to avoid clutter
                point.ch0 = raw[i][0];
                if (raw[i][1]) point.ch1 = raw[i][1];
                if (raw[i][2]) point.ch2 = raw[i][2];
            } else {
                point.val = raw[i];
            }
            formatted.push(point);
        }
        return formatted;
    }, [data]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>Sampling Rate: {data.fs} Hz</span>
                <span>Duration: {(data.signals.length / data.fs).toFixed(2)}s</span>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="time" stroke="#666" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                        <YAxis stroke="#666" domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                            itemStyle={{ color: '#ccc' }}
                        />

                        {/* Dynamic Lines based on data */}
                        <Line type="monotone" dataKey="ch0" stroke="#00f2ff" dot={false} strokeWidth={2} />
                        {data.signals[0][1] !== undefined && <Line type="monotone" dataKey="ch1" stroke="#ff0055" dot={false} strokeWidth={1.5} />}
                        {data.signals[0][2] !== undefined && <Line type="monotone" dataKey="ch2" stroke="#00ff9d" dot={false} strokeWidth={1.5} />}

                        {!Array.isArray(data.signals[0]) && <Line type="monotone" dataKey="val" stroke="#00f2ff" dot={false} />}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                * Displaying downsampled data for performance. Zoom features coming soon.
            </div>
        </div>
    );
};

export default SignalViewer;
