import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Interactive resizable divider component
 * Uses CSS variables during drag for instant visual feedback (no React re-renders)
 * Only commits to React state on drag end for optimal performance
 */
const ResizableDivider = ({ onResize, minWidth = 280, maxWidth = 600, defaultWidth = 350 }) => {
    const [isDragging, setIsDragging] = useState(false);
    const currentWidthRef = useRef(defaultWidth);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        // Add dragging class to app container for CSS-based transitions
        document.documentElement.classList.add('panel-resizing');
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        // Calculate new width from right edge of viewport
        const viewportWidth = window.innerWidth;
        const newWidth = viewportWidth - e.clientX;

        // Clamp within bounds
        const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
        currentWidthRef.current = clampedWidth;

        // Update CSS variable directly for instant visual feedback (bypasses React)
        document.documentElement.style.setProperty('--chat-panel-width', `${clampedWidth}px`);
    }, [isDragging, minWidth, maxWidth]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        document.documentElement.classList.remove('panel-resizing');
        // Commit final width to React state (triggers single re-render)
        onResize(currentWidthRef.current);
    }, [onResize]);

    // Add/remove global event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            className={`resizable-divider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
        >
            <div className="divider-handle">
                <div className="divider-grip">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );
};

export default ResizableDivider;
