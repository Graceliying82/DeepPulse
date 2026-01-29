import html2canvas from 'html2canvas';

/**
 * Captures the current SVG signal viewer as a PNG blob for AI analysis
 * Uses html2canvas for reliable DOM-to-image conversion
 */
export const captureSVGAsImage = async (svgElement) => {
    if (!svgElement) {
        throw new Error('SVG element is required');
    }

    try {
        // html2canvas works better with the parent container
        // Find the scrollable container that holds the SVG
        const container = svgElement.closest('div') || svgElement.parentElement;

        if (!container) {
            throw new Error('Could not find parent container for SVG');
        }

        console.log('Capturing element:', container);

        // Use html2canvas to capture the container
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',  // White background for medical images
            scale: 1.5,  // Good balance of quality and speed
            logging: true,  // Enable logs for debugging
            useCORS: true,  // Enable cross-origin images if needed
            allowTaint: true,  // Allow for SVG rendering
            svgRendering: true,  // Enable SVG rendering
        });

        console.log('Canvas created:', canvas.width, 'x', canvas.height);

        // Convert canvas to blob
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log('Blob created:', blob.size, 'bytes');
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create image blob from canvas'));
                }
            }, 'image/png', 0.95);
        });
    } catch (error) {
        console.error('Capture error details:', error);
        const errorMsg = error?.message || error?.toString() || 'Unknown error';
        throw new Error('Failed to capture signal image: ' + errorMsg);
    }
};
