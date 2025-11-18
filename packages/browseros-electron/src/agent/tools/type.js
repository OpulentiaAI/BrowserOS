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

        if (selector) {
          // Use JavaScript to type into the element by selector
          const script = `
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
              if (element) {
                element.focus();
                element.value = '${text.replace(/'/g, "\\'")}';
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true };
              }
              return { success: false, error: 'Element not found' };
            })();
          `;
          const result = await page.evaluate(script);
          if (result && result.success) {
            return toolSuccess(`Successfully typed "${text}" into ${selector}`);
          } else {
            return toolError(result?.error || 'Failed to type into element');
          }
        } else {
          return toolError('Selector is required for typing into elements');
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to type: ${error.message}`);
      }
    }
  };
}

module.exports = { createTypeTool };
