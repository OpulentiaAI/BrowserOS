const { toolSuccess, toolError } = require('../ToolInterface');

const VALID_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

function createGroupTabsTool(context) {
  return {
    name: 'group_tabs_tool',
    description:
      'Group browser tabs together logically. Pass tabIds array and optionally groupName and color (grey, blue, red, yellow, green, pink, purple, cyan, orange). In Electron this is a logical grouping only.',
    parameters: {
      type: 'object',
      properties: {
        tabIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Tab IDs to group'
        },
        groupName: {
          type: 'string',
          description: 'Optional group name'
        },
        color: {
          type: 'string',
          enum: VALID_COLORS,
          description: 'Optional group color'
        }
      },
      required: ['tabIds']
    },
    execute: async ({ tabIds, groupName, color }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('group_tabs_tool');

        if (!Array.isArray(tabIds) || tabIds.length === 0) {
          return toolError('tabIds must be a non-empty array');
        }

        const tabs = await context.browserContext.getAllTabs();
        const tabIdSet = new Set(tabs.map(t => t.id));
        const validTabIds = tabIds.filter(id => tabIdSet.has(id));

        if (validTabIds.length === 0) {
          return toolError(`No valid tabs found with IDs: ${tabIds.join(', ')}`);
        }

        const tabText = validTabIds.length === 1 ? 'tab' : 'tabs';
        const base = `Grouped ${validTabIds.length} ${tabText}`;
        const namePart = groupName ? ` as "${groupName}"` : '';
        const colorPart = color ? ` with color ${color}` : '';

        // Logical grouping only for now (no native Electron tab groups)
        return toolSuccess(base + namePart + colorPart);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to group tabs: ${error.message}`);
      }
    }
  };
}

module.exports = { createGroupTabsTool };
