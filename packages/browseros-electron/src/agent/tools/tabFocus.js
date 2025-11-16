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
          type: 'string',
          description: 'ID of the tab to focus'
        }
      },
      required: ['tabId']
    },
    execute: async ({ tabId }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('tab_focus');

        await context.browserContext.focusTab(tabId);

        return toolSuccess(`Switched to tab ${tabId}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to focus tab: ${error.message}`);
      }
    }
  };
}

module.exports = { createTabFocusTool };
