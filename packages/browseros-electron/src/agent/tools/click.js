/**
 * Click Tool - Click an element by selector or nodeId
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createClickTool(context) {
  return {
    name: 'click',
    description: 'Click an element by its selector or nodeId',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to click (optional if nodeId provided)'
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
        context.incrementToolUsageMetrics('click');

        const page = await context.browserContext.getCurrentPage();
        
        if (nodeId) {
          await page.clickElement(nodeId);
          await page.waitForStability();
          return toolSuccess(`Successfully clicked element ${nodeId}`);
        } else if (selector) {
          await page.click(selector);
          await page.waitForStability();
          return toolSuccess(`Successfully clicked ${selector}`);
        } else {
          return toolError('Must provide either selector or nodeId');
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to click: ${error.message}`);
      }
    }
  };
}

module.exports = { createClickTool };
