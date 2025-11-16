/**
 * VisualType Tool - Type into input fields by visual description using Moondream API
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createVisualTypeTool(context) {
  return {
    name: 'visual_type',
    description: `Type text into any input field by describing what it looks like. Pass a clear description like 'search box', 'email field', 'username input', 'comment textarea', etc.`,
    parameters: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: 'Describe the input field (e.g., "search box", "email field", "password input")'
        },
        text: {
          type: 'string',
          description: 'Text to type into the identified field'
        }
      },
      required: ['instruction', 'text']
    },
    execute: async ({ instruction, text }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('visual_type');

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
          return toolError('Failed to capture screenshot for visual type');
        }

        // Call Moondream API to find the input field
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

        // Type at coordinates
        await page.typeAtCoordinates(x, y, text);

        const result = {
          coordinates: { x, y },
          description: `Typed "${text}" into "${instruction}" at (${x}, ${y})`,
          pointsFound: data.points.length
        };

        return toolSuccess(JSON.stringify(result));
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Visual type failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createVisualTypeTool };
