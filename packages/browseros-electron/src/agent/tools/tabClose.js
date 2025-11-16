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
          type: 'string',
          description: 'ID of the tab to close'
        }
      },
      required: ['tabId']
    },
    execute: async ({ tabId }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('tab_close');

        await context.browserContext.closeTab(tabId);

        return toolSuccess(`Closed tab ${tabId}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to close tab: ${error.message}`);
      }
    }
  };
}

module.exports = { createTabCloseTool };
