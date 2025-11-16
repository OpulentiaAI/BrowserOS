/**
 * TabOpen Tool - Open a new browser tab
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTabOpenTool(context) {
  return {
    name: 'tab_open',
    description: 'Open a new browser tab with optional URL',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to open (optional, defaults to new tab page)'
        }
      }
    },
    execute: async ({ url }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('tab_open');

        const targetUrl = url || 'https://www.google.com';
        const page = await context.browserContext.openTab(targetUrl);

        return toolSuccess(JSON.stringify({
          tabId: page.tabId,
          url: targetUrl
        }));
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to open tab: ${error.message}`);
      }
    }
  };
}

module.exports = { createTabOpenTool };
