import React, { useState } from 'react';
import './ErrorMessage.css';

/**
 * ErrorMessage - Enhanced error display with details and retry
 */
function ErrorMessage({ error, onRetry, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!error) return null;

  const errorType = detectErrorType(error);
  const { icon, title, color } = getErrorStyle(errorType);

  return (
    <div className={`error-message error-${errorType}`} style={{ borderLeftColor: color }}>
      <div className="error-header">
        <div className="error-icon" style={{ background: color }}>
          {icon}
        </div>
        <div className="error-content">
          <div className="error-title">{title}</div>
          <div className="error-text">{getErrorMessage(error)}</div>
        </div>
        <button 
          className="error-dismiss"
          onClick={onDismiss}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      
      {error.stack && (
        <div className="error-actions">
          <button 
            className="error-expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼ Hide Details' : '▶ Show Details'}
          </button>
          {onRetry && (
            <button 
              className="error-retry-btn"
              onClick={onRetry}
            >
              🔄 Retry
            </button>
          )}
        </div>
      )}
      
      {expanded && error.stack && (
        <div className="error-details">
          <pre className="error-stack">{error.stack}</pre>
        </div>
      )}
      
      {errorType === 'network' && (
        <div className="error-suggestion">
          💡 Check your internet connection and try again
        </div>
      )}
      
      {errorType === 'auth' && (
        <div className="error-suggestion">
          💡 Check your API key in settings
        </div>
      )}
      
      {errorType === 'tool' && (
        <div className="error-suggestion">
          💡 The page might have changed. Try refreshing or using a different approach
        </div>
      )}
    </div>
  );
}

function detectErrorType(error) {
  const message = error?.message || error?.toString() || '';
  
  if (message.includes('API key') || message.includes('authentication') || message.includes('401')) {
    return 'auth';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'network';
  }
  if (message.includes('selector') || message.includes('element') || message.includes('not found')) {
    return 'tool';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return 'rate-limit';
  }
  
  return 'general';
}

function getErrorStyle(errorType) {
  const styles = {
    auth: {
      icon: '🔐',
      title: 'Authentication Error',
      color: '#f59e0b'
    },
    network: {
      icon: '🌐',
      title: 'Network Error',
      color: '#ef4444'
    },
    tool: {
      icon: '🔧',
      title: 'Tool Execution Error',
      color: '#8b5cf6'
    },
    'rate-limit': {
      icon: '⏱️',
      title: 'Rate Limit Exceeded',
      color: '#f59e0b'
    },
    general: {
      icon: '⚠️',
      title: 'Error',
      color: '#ef4444'
    }
  };
  
  return styles[errorType] || styles.general;
}

function getErrorMessage(error) {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
}

export default ErrorMessage;
