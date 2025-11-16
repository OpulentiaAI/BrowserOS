/**
 * Type Tool - Type text into an input element
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTypeTool(context) {
  return {
    name: 'type',
    description: 'Type text into an input element',
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
        },
        text: {
          type: 'string',
          description: 'Text to type into the element'
        }
      },
      required: ['text']
    },
    execute: async ({ selector, nodeId, text }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('type');

        const page = await context.browserContext.getCurrentPage();
        
        if (nodeId) {
          await page.inputText(nodeId, text);
          await page.waitForStability();
          return toolSuccess(`Successfully typed "${text}" into element ${nodeId}`);
        } else if (selector) {
          await page.type(selector, text);
          await page.waitForStability();
          return toolSuccess(`Successfully typed "${text}" into ${selector}`);
        } else {
          return toolError('Must provide either selector or nodeId');
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to type: ${error.message}`);
      }
    }
  };
}

module.exports = { createTypeTool };
