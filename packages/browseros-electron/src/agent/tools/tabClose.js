/**
 * TabClose Tool - Close a specific tab
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTabCloseTool(context) {
  return {
    name: 'tab_close',
    description: 'Close a specific tab by ID',
    parameters: {
      type: 'object',
      properties: {
        tabId: {
          type: 'number',
          description: 'ID of the tab to close (numeric tab ID)'
        }
      },
      required: ['tabId']
    },
    execute: async ({ tabId }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('tab_close');

        // Ensure tabId is a number
        const numericTabId = typeof tabId === 'string' ? parseInt(tabId, 10) : tabId;
        if (isNaN(numericTabId)) {
          return toolError(`Invalid tab ID: ${tabId}`);
        }

        const result = await context.browserContext.closeTab(numericTabId);
        if (result) {
          return toolSuccess(`Closed tab ${numericTabId}`);
        } else {
          return toolError(`Tab ${numericTabId} not found or could not be closed`);
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to close tab: ${error.message}`);
      }
    }
  };
}

module.exports = { createTabCloseTool };
