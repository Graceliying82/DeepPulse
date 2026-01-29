# DeepPulse Frontend

React-based frontend for the DeepPulse physiological signal analysis platform.

## Tech Stack

- **React 19** - Modern UI library
- **Vite** - Fast build tool with HMR (Hot Module Replacement)
- **Axios** - HTTP client for API communication
- **Recharts** - Charting library (legacy, being phased out)
- **React Markdown** - Render AI analysis as formatted markdown
- **Lucide React** - Icon library
- **SVG-based rendering** - Custom medical-grade signal visualization

## Key Components

### SignalViewer.jsx
Medical-grade SVG-based signal renderer with:
- TRUE calibration (25mm/s, 10mm/mV for ECG)
- Medical grid patterns (1mm minor, 5mm major)
- Horizontal scrolling for long recordings
- Multi-lead synchronized display
- Calibration pulse rendering
- Automatic downsampling for performance

### Dashboard.jsx
Main application interface featuring:
- Database browser and download manager
- Record selection and navigation
- AI analysis controls (Full/Hints/Quiz modes)
- Interactive signal viewing
- Patient metadata display

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
The app will be available at http://localhost:5173

### Build for Production
```bash
npm run build
```
Production build output goes to `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

## Environment Configuration

The frontend connects to the FastAPI backend. Default backend URL:
- Development: `http://localhost:8000`

To change the backend URL, update the `axios` configuration in the components.

## Medical Visualization Standards

The SignalViewer implements medical-grade calibration standards:

### ECG Standards
- **Paper Speed**: 25 mm/s (standard)
- **Amplitude**: 10 mm/mV (standard sensitivity)
- **Grid**: 1mm minor squares, 5mm major squares
- **DPI**: 96 DPI standard (1mm = 3.779528 pixels)

### Rendering Details
- **Minor grid**: Thin pink lines (#FFB3B3, 0.3px stroke)
- **Major grid**: Bold red lines (#E60000, 1.0px stroke)
- **Calibration pulse**: 1mV amplitude, 0.2s duration
- **Time markers**: Every 1 second with labels

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      # Main UI and navigation
│   │   └── SignalViewer.jsx   # Medical signal renderer
│   ├── App.jsx                # Root component with routing
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── index.html                 # HTML template
├── package.json               # Dependencies and scripts
└── vite.config.js            # Vite configuration
```

## Features

### Current
- ✅ Medical-grade ECG visualization
- ✅ Multi-lead synchronized scrolling
- ✅ Database browsing and record selection
- ✅ AI analysis integration (Full/Hints/Quiz)
- ✅ Markdown-rendered AI responses
- ✅ Download manager for PhysioNet data

### Planned
- 🔄 Interactive measurement tools (QRS, intervals)
- 🔄 Real-time signal monitoring
- 🔄 Annotation and event marking
- 🔄 Export to PDF with calibration
- 🔄 Multi-signal overlay comparison

## Performance Considerations

### Downsampling
Long recordings are automatically downsampled to ~500 points/second to prevent DOM bloat while maintaining visual fidelity.

### Memoization
React `useMemo` is used extensively to prevent unnecessary recalculations of SVG paths and grid patterns.

### SVG Optimization
- Pattern-based grid rendering (minimal DOM nodes)
- Viewport-based rendering (only visible portions)
- Efficient path generation using polyline elements

## Contributing

When contributing to the frontend:
1. Follow existing code style and component patterns
2. Use React hooks (functional components only)
3. Maintain medical calibration accuracy
4. Test with various signal types and durations
5. Ensure responsive design across screen sizes

## Medical Standards Compliance

This frontend adheres to international medical standards for signal visualization:
- **ECG**: AHA/ACC guidelines for ECG paper
- **Grid calibration**: ISO 60601-2-51 for ECG equipment
- **Time/amplitude scales**: Standard medical conventions

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Modern browser features required:
- SVG 1.1 support
- ES6+ JavaScript
- CSS Grid and Flexbox

---

Built with React + Vite for optimal development experience and production performance.
