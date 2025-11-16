/**
 * VisualClick Tool - Click on elements by visual description using Moondream API
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createVisualClickTool(context) {
  return {
    name: 'visual_click',
    description: `Click on any element by describing what it looks like. Pass a clear description like 'blue submit button', 'search icon', 'first checkbox', 'close button in modal', etc.`,
    parameters: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: 'Describe what to click on (e.g., "button", "blue submit button", "search icon")'
        }
      },
      required: ['instruction']
    },
    execute: async ({ instruction }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('visual_click');

        // Get API key from environment
        const apiKey = process.env.MOONDREAM_API_KEY;
        if (!apiKey) {
          return toolError('Vision API key not provided. Set MOONDREAM_API_KEY environment variable.');
        }

        const page = await context.browserContext.getCurrentPage();

        // Get viewport dimensions
        const viewport = await page.executeScript(`
          ({ width: window.innerWidth, height: window.innerHeight })
        `);

        // Take screenshot with exact viewport dimensions
        const screenshot = await page.takeScreenshot('large');
        if (!screenshot) {
          return toolError('Failed to capture screenshot for visual click');
        }

        // Call Moondream API
        const response = await fetch('https://api.moondream.ai/v1/point', {
          method: 'POST',
          headers: {
            'X-Moondream-Auth': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_url: screenshot,
            object: instruction
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error?.message || `API error: ${response.status}`;
          return toolError(`Moondream API error: ${errorMessage}`);
        }

        const data = await response.json();

        // Check if any points were found
        if (!data.points || data.points.length === 0) {
          return toolError(`No "${instruction}" found on the page`);
        }

        // Use the first point (most confident match)
        const point = data.points[0];

        // Convert normalized coordinates (0-1) to viewport pixels
        const x = Math.round(point.x * viewport.width);
        const y = Math.round(point.y * viewport.height);

        // Click at coordinates
        await page.clickAtCoordinates(x, y);

        const result = {
          coordinates: { x, y },
          description: `Clicked "${instruction}" at (${x}, ${y})`,
          pointsFound: data.points.length
        };

        return toolSuccess(JSON.stringify(result));
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Visual click failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createVisualClickTool };
