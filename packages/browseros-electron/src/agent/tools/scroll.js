/**
 * Scroll Tool - Scroll to an element or scroll the page
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createScrollTool(context) {
  return {
    name: 'scroll',
    description: 'Scroll to a specific element or scroll the page up/down',
    parameters: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'number',
          description: 'NodeId to scroll to (optional)'
        },
        direction: {
          type: 'string',
          enum: ['up', 'down'],
          description: 'Direction to scroll page if no nodeId provided'
        },
        amount: {
          type: 'number',
          description: 'Number of viewport heights to scroll (default: 1)',
          minimum: 1
        }
      }
    },
    execute: async ({ nodeId, direction, amount = 1 }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('scroll');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to interact with');
        }

        if (nodeId !== undefined && nodeId !== null) {
          const scrolled = await page.scrollToElement(nodeId);
          return toolSuccess(`Scrolled to element ${nodeId} ${scrolled ? 'success' : 'already visible'}`);
        } else if (direction) {
          let result;
          if (direction === 'down') {
            result = await page.scrollDown(amount);
          } else {
            result = await page.scrollUp(amount);
          }

          const scrollMessage = result.didScroll
            ? `Scrolled ${direction} ${amount} viewport(s)`
            : `Already at ${direction === 'down' ? 'bottom' : 'top'} of page`;

          return toolSuccess(scrollMessage);
        } else {
          return toolError('Must provide either nodeId or direction');
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Scroll failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createScrollTool };
