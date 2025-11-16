import React from 'react';
import './ToolCallIndicator.css';

/**
 * ToolCallIndicator - Visual indicator for active tool execution
 */
function ToolCallIndicator({ toolCalls, visible }) {
  if (!visible || !toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="tool-call-indicator">
      <div className="tool-call-header">
        <div className="pulse-dot"></div>
        <span className="tool-call-title">Executing Tools</span>
      </div>
      <div className="tool-call-list">
        {toolCalls.map((call, index) => (
          <div key={index} className="tool-call-item">
            <span className="tool-icon">⚡</span>
            <div className="tool-call-content">
              <span className="tool-name">{call.name}</span>
              {call.args && Object.keys(call.args).length > 0 && (
                <span className="tool-args">
                  {formatArgs(call.args)}
                </span>
              )}
            </div>
            <div className="spinner"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatArgs(args) {
  const entries = Object.entries(args);
  if (entries.length === 0) return '';
  
  const firstEntry = entries[0];
  const [key, value] = firstEntry;
  
  // Format based on key
  if (key === 'url') return value;
  if (key === 'selector') return `"${value}"`;
  if (key === 'text' && typeof value === 'string') {
    return value.length > 30 ? `"${value.substring(0, 30)}..."` : `"${value}"`;
  }
  if (key === 'tabId') return `Tab ${value}`;
  
  // Default: show first key-value pair
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  return valueStr.length > 30 ? `${valueStr.substring(0, 30)}...` : valueStr;
}

export default ToolCallIndicator;
