import React from 'react';
import './StatusPanel.css';

/**
 * StatusPanel - Display execution metrics and TODO list
 */
function StatusPanel({ metrics, todoList, visible }) {
  if (!visible || (!metrics && !todoList)) {
    return null;
  }

  return (
    <div className="status-panel">
      {metrics && (
        <div className="metrics-section">
          <h4>Execution Metrics</h4>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-label">Tool Calls:</span>
              <span className="metric-value">{metrics.toolCalls || 0}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Errors:</span>
              <span className="metric-value">{metrics.errors || 0}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Duration:</span>
              <span className="metric-value">
                {metrics.endTime && metrics.startTime
                  ? `${((metrics.endTime - metrics.startTime) / 1000).toFixed(1)}s`
                  : 'Running...'}
              </span>
            </div>
          </div>
          
          {metrics.toolFrequency && metrics.toolFrequency.size > 0 && (
            <div className="tool-frequency">
              <h5>Tool Usage</h5>
              {Array.from(metrics.toolFrequency).map(([tool, count]) => (
                <div key={tool} className="tool-usage-item">
                  <span className="tool-name">{tool}</span>
                  <span className="tool-count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {todoList && todoList.length > 0 && (
        <div className="todo-section">
          <h4>Task Progress</h4>
          <div className="todo-list">
            {todoList.map((todo, index) => (
              <div key={todo.id || index} className={`todo-item todo-${todo.status}`}>
                <span className="todo-checkbox">
                  {todo.status === 'done' ? '✓' : 
                   todo.status === 'doing' ? '⋯' : 
                   todo.status === 'skipped' ? '−' : '○'}
                </span>
                <span className="todo-content">{todo.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusPanel;
