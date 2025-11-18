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

        if (selector) {
          // Use JavaScript to click the element by selector
          const script = `
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
              if (element) {
                element.click();
                return { success: true };
              }
              return { success: false, error: 'Element not found' };
            })();
          `;
          const result = await page.evaluate(script);
          if (result && result.success) {
            return toolSuccess(`Successfully clicked ${selector}`);
          } else {
            return toolError(result?.error || 'Failed to click element');
          }
        } else {
          return toolError('Selector is required for clicking elements');
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to click: ${error.message}`);
      }
    }
  };
}

module.exports = { createClickTool };
