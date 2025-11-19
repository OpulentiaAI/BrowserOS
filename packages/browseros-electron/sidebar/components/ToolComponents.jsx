import React from 'react';

// ToolView component for rendering tool inputs/outputs
export function ToolView({ toolCall, result }) {
  const { name, args } = toolCall;
  
  return (
    <div className="tool-view p-2 my-2 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1 text-sm text-gray-600 dark:text-gray-400 font-medium">
        <span>{name}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
          {JSON.stringify(args).substring(0, 50)}
          {JSON.stringify(args).length > 50 ? '...' : ''}
        </span>
      </div>
      
      {result && (
        <div className="tool-result mt-2 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400">Result</div>
          <div className="text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto p-1">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ReasoningTrace component for displaying chain of thought
export function ReasoningTrace({ content }) {
  if (!content) return null;
  
  return (
    <div className="reasoning-trace p-2 my-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800/30">
      <div className="flex items-center gap-2 mb-1 text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
        <span>🤔</span>
        <span>Thinking Process</span>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}
