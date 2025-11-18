import React from 'react';
import './GlowIndicator.css';

function GlowIndicator({ glows, visible }) {
  if (!visible || glows.length === 0) {
    return null;
  }

  return (
    <div className="glow-indicator">
      <div className="glow-indicator-header">
        <span className="glow-icon">✨</span>
        <span className="glow-label">Active Glows</span>
      </div>
      <div className="glow-list">
        {glows.map((glow, index) => (
          <div key={`${glow.tabId}-${index}`} className="glow-item">
            <span className="glow-tool-name">{glow.toolName}</span>
            <span className="glow-tab-id">Tab {glow.tabId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GlowIndicator;
