import React, { useState } from 'react';
import './LogPanel.css';

function LogPanel({ logs, visible }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!visible || logs.length === 0) {
    return null;
  }

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const getLevelClass = (level) => {
    return `log-level-${level || 'info'}`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={`log-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="log-panel-header" onClick={toggleExpanded}>
        <span className="log-icon">📋</span>
        <span className="log-label">Logs ({logs.length})</span>
        <button className="log-toggle-btn">
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>
      {isExpanded && (
        <div className="log-panel-content">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${getLevelClass(log.level)}`}>
              <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
              <span className="log-level-icon">{getLevelIcon(log.level)}</span>
              <span className="log-source">{log.source}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LogPanel;
