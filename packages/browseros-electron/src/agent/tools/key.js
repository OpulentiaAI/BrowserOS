/**
 * Key Tool - Press keyboard keys
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createKeyTool(context) {
  return {
    name: 'key',
    description: 'Press keyboard keys (Enter, Tab, Escape, ArrowDown, etc.)',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Key to press (e.g., "Enter", "Tab", "Escape", "ArrowDown")'
        },
        count: {
          type: 'number',
          description: 'Number of times to press the key (default: 1)',
          minimum: 1
        }
      },
      required: ['key']
    },
    execute: async ({ key, count = 1 }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('key');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to interact with');
        }

        const pressCount = Math.max(1, Math.min(count || 1, 10)); // Limit to 10 presses
        for (let i = 0; i < pressCount; i += 1) {
          await page.pressKey(key);
        }

        await page.waitForStability(100); // Shorter wait after key press

        return toolSuccess(`Pressed ${key} ${count > 1 ? `${count} times` : ''}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Key press failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createKeyTool };
