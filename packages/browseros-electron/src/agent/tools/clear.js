/**
 * Clear Tool - Clear text from an input element
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createClearTool(context) {
  return {
    name: 'clear',
    description: 'Clear text from an input element',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the input element (optional if nodeId provided)'
        },
        nodeId: {
          type: 'number',
          description: 'NodeId from element list (optional if selector provided)'
        }
      }
    },
    execute: async ({ selector, nodeId }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('clear');

        const page = await context.browserContext.getCurrentPage();

        if (nodeId) {
          await page.clearElement(nodeId);
          await page.waitForStability();
          return toolSuccess(`Successfully cleared element ${nodeId}`);
        } else if (selector) {
          await page.clear(selector);
          await page.waitForStability();
          return toolSuccess(`Successfully cleared ${selector}`);
        } else {
          return toolError('Must provide either selector or nodeId');
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to clear: ${error.message}`);
      }
    }
  };
}

module.exports = { createClearTool };
