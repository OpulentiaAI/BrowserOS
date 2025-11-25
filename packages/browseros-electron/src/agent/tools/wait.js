/**
 * Wait Tool - Wait for page to stabilize
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createWaitTool(context) {
  return {
    name: 'wait',
    description: 'Wait for page to stabilize after actions',
    parameters: {
      type: 'object',
      properties: {
        seconds: {
          type: 'number',
          description: 'Additional seconds to wait (default: 2)',
          minimum: 0
        }
      }
    },
    execute: async ({ seconds = 2 }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('wait');

        const page = await context.browserContext.getCurrentPage();
        if (page) {
          await page.waitForStability();
        }

        const waitSeconds = Math.max(0, Math.min(seconds || 2, 30)); // Limit to 30 seconds
        if (waitSeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
        }

        return toolSuccess(`Waited ${waitSeconds} seconds for stability`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Wait failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createWaitTool };
