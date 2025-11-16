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

        for (let i = 0; i < count; i += 1) {
          await page.pressKey(key);
        }

        await page.waitForStability();

        return toolSuccess(`Pressed ${key} ${count > 1 ? `${count} times` : ''}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Key press failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createKeyTool };
