/**
 * Navigate Tool - Navigate to a URL
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createNavigateTool(context) {
  return {
    name: 'navigate',
    description: 'Navigate to a URL',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL to navigate to (must include https://)'
        }
      },
      required: ['url']
    },
    execute: async ({ url }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('navigate');

        const page = await context.browserContext.getCurrentPage();
        await page.navigateTo(url);
        await page.waitForStability();

        return toolSuccess(`Successfully navigated to ${url}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Navigation failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createNavigateTool };
