import React, { useRef, useState, useEffect } from 'react';

function ResizeHandle() {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    
    // Get current sidebar width
    const sidebar = document.getElementById('root');
    startWidthRef.current = sidebar ? sidebar.offsetWidth : 400;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      
      // Send new width to main process
      window.electron.resizeSidebar(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className={`resize-handle ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      title="Drag to resize sidebar"
    />
  );
}

export default ResizeHandle;
