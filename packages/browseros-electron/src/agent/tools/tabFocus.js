/**
 * TabFocus Tool - Switch to a specific tab
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTabFocusTool(context) {
  return {
    name: 'tab_focus',
    description: 'Switch to a specific tab by ID',
    parameters: {
      type: 'object',
      properties: {
        tabId: {
          type: 'number',
          description: 'ID of the tab to focus (numeric tab ID)'
        }
      },
      required: ['tabId']
    },
    execute: async ({ tabId }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('tab_focus');

        // Ensure tabId is a number
        const numericTabId = typeof tabId === 'string' ? parseInt(tabId, 10) : tabId;
        if (isNaN(numericTabId)) {
          return toolError(`Invalid tab ID: ${tabId}`);
        }

        await context.browserContext.focusTab(numericTabId);

        return toolSuccess(`Switched to tab ${tabId}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to focus tab: ${error.message}`);
      }
    }
  };
}

module.exports = { createTabFocusTool };
