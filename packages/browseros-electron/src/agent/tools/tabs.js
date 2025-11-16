/**
 * Tabs Tool - List all browser tabs
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTabsTool(context) {
  return {
    name: 'tabs',
    description: 'List all tabs in the current browser window',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async () => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('tabs');

        const tabs = await context.browserContext.getTabs();

        const tabList = tabs.map((tab) => ({
          id: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          active: tab.active || false
        }));

        return toolSuccess(JSON.stringify(tabList));
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to list tabs: ${error.message}`);
      }
    }
  };
}

module.exports = { createTabsTool };
