const { toolSuccess, toolError } = require('../ToolInterface');

function createClickAtCoordinatesTool(context) {
  return {
    name: 'click_at_coordinates',
    description:
      'Click at specific viewport coordinates (x, y). Use when you have exact pixel coordinates where you want to click.',
    parameters: {
      type: 'object',
      properties: {
        x: {
          type: 'number',
          description: 'X coordinate in viewport pixels (0 = left edge)',
          minimum: 0
        },
        y: {
          type: 'number',
          description: 'Y coordinate in viewport pixels (0 = top edge)',
          minimum: 0
        }
      },
      required: ['x', 'y']
    },
    execute: async ({ x, y }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('click_at_coordinates');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to click on');
        }

        const viewport = await page.executeScript(
          '({ width: window.innerWidth, height: window.innerHeight })'
        );

        if (!viewport || typeof viewport.width !== 'number' || typeof viewport.height !== 'number') {
          return toolError('Unable to read viewport size');
        }

        if (x < 0 || x > viewport.width) {
          return toolError(`X coordinate ${x} is outside viewport width (0-${viewport.width})`);
        }
        if (y < 0 || y > viewport.height) {
          return toolError(`Y coordinate ${y} is outside viewport height (0-${viewport.height})`);
        }

        const result = await page.clickAtCoordinates(x, y);
        if (!result || result.success === false) {
          const msg = result && result.error ? result.error : 'Unknown error';
          return toolError(`Failed to click at coordinates: ${msg}`);
        }

        return toolSuccess(`Successfully clicked at (${x}, ${y})`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to click at coordinates: ${error.message}`);
      }
    }
  };
}

module.exports = { createClickAtCoordinatesTool };
