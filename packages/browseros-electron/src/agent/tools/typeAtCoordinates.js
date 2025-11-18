const { toolSuccess, toolError } = require('../ToolInterface');

function createTypeAtCoordinatesTool(context) {
  return {
    name: 'type_at_coordinates',
    description:
      'Type text at specific viewport coordinates (x, y). The tool will first click at the coordinates to focus, then type the text.',
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
        },
        text: {
          type: 'string',
          description: 'Text to type at the specified coordinates'
        }
      },
      required: ['x', 'y', 'text']
    },
    execute: async ({ x, y, text }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('type_at_coordinates');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to type on');
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

        const result = await page.typeAtCoordinates(x, y, text);
        if (!result || result.success === false) {
          const msg = result && result.error ? result.error : 'Unknown error';
          return toolError(`Failed to type at coordinates: ${msg}`);
        }

        return toolSuccess(`Successfully typed "${text}" at (${x}, ${y})`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to type at coordinates: ${error.message}`);
      }
    }
  };
}

module.exports = { createTypeAtCoordinatesTool };
