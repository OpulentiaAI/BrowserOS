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

        if (!url || typeof url !== 'string') {
          return toolError('URL is required for navigation');
        }

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to navigate');
        }

        // Ensure URL has a protocol
        let targetUrl = url.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'https://' + targetUrl;
        }

        await page.navigate(targetUrl);

        return toolSuccess(`Successfully navigated to ${targetUrl}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Navigation failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createNavigateTool };
