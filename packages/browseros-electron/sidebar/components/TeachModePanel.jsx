import React from 'react';
import './TeachModePanel.css';

function TeachModePanel({ teachState, mcpStatus, visible }) {
  if (!visible || (!teachState && !mcpStatus)) {
    return null;
  }

  const getTeachStateIcon = (type) => {
    if (!type) return '🎓';
    if (type === 'teach:thinking') return '💭';
    if (type === 'teach:workflow_ready') return '✅';
    if (type === 'teach:workflow_complete') return '🎉';
    if (type === 'teach:human_input_requested') return '✋';
    return '🎓';
  };

  const getTeachStateLabel = (type) => {
    if (!type) return 'Teach Mode';
    if (type === 'teach:thinking') return 'Thinking...';
    if (type === 'teach:workflow_ready') return 'Workflow Ready';
    if (type === 'teach:workflow_complete') return 'Workflow Complete';
    if (type === 'teach:human_input_requested') return 'Input Requested';
    return 'Teach Mode';
  };

  const getMcpStatusIcon = (type) => {
    if (!type) return '🔌';
    if (type === 'mcp:connected') return '✅';
    if (type === 'mcp:disconnected') return '⚠️';
    if (type === 'mcp:error') return '❌';
    return '🔌';
  };

  const getMcpStatusLabel = (type) => {
    if (!type) return 'MCP Status';
    if (type === 'mcp:connected') return 'MCP Connected';
    if (type === 'mcp:disconnected') return 'MCP Disconnected';
    if (type === 'mcp:error') return 'MCP Error';
    return 'MCP Status';
  };

  return (
    <div className="teach-mode-panel">
      {teachState && (
        <div className="teach-state-section">
          <div className="teach-state-header">
            <span className="teach-icon">{getTeachStateIcon(teachState.type)}</span>
            <span className="teach-label">{getTeachStateLabel(teachState.type)}</span>
          </div>
          {teachState.payload && (
            <div className="teach-payload">
              {teachState.payload.workflow && (
                <div className="teach-workflow-info">
                  <strong>Workflow:</strong> {teachState.payload.workflow.name || 'Unnamed'}
                </div>
              )}
              {teachState.payload.step && (
                <div className="teach-step-info">
                  <strong>Step:</strong> {teachState.payload.step}
                </div>
              )}
              {teachState.payload.message && (
                <div className="teach-message">
                  {teachState.payload.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {mcpStatus && (
        <div className="mcp-status-section">
          <div className="mcp-status-header">
            <span className="mcp-icon">{getMcpStatusIcon(mcpStatus.type)}</span>
            <span className="mcp-label">{getMcpStatusLabel(mcpStatus.type)}</span>
          </div>
          {mcpStatus.payload && (
            <div className="mcp-payload">
              {mcpStatus.payload.serverName && (
                <div className="mcp-server-name">
                  <strong>Server:</strong> {mcpStatus.payload.serverName}
                </div>
              )}
              {mcpStatus.payload.error && (
                <div className="mcp-error">
                  {mcpStatus.payload.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TeachModePanel;
