const { toolSuccess, toolError } = require('../ToolInterface');

function createGetSelectedTabsTool(context) {
  return {
    name: 'get_selected_tabs_tool',
    description:
      'Get information about currently selected tabs. Returns an array of tab objects with id, url, and title. If no tabs are selected, returns the current active tab.',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async () => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('get_selected_tabs_tool');

        const selectedTabIds = context.getSelectedTabIds();
        const hasUserSelectedTabs = Array.isArray(selectedTabIds) && selectedTabIds.length > 0;

        const pages = await context.browserContext.getPages(
          hasUserSelectedTabs ? selectedTabIds : undefined
        );

        if (!pages || pages.length === 0) {
          return toolSuccess(JSON.stringify([]));
        }

        const tabs = [];
        for (const page of pages) {
          const id = page.tabId;
          const url = await page.url();
          const title = await page.title();
          tabs.push({ id, url, title });
        }

        return toolSuccess(JSON.stringify(tabs));
      } catch (error) {
        return toolError(
          `Failed to get selected tab information: ${error.message}`
        );
      }
    }
  };
}

module.exports = { createGetSelectedTabsTool };
