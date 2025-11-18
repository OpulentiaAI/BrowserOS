const { toolSuccess, toolError } = require('../ToolInterface');

function createGrepElementsTool(context) {
  return {
    name: 'grep_elements',
    description:
      'Search page text using a regex pattern against a simple browser state string. Useful for finding elements by text.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for (e.g., "button.*login", "input.*(email|user)")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of matches to return (default 15)',
          minimum: 1
        }
      },
      required: ['pattern']
    },
    execute: async ({ pattern, limit = 15 }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('grep_elements');

        let regex;
        try {
          regex = new RegExp(pattern, 'i');
        } catch (err) {
          return toolError(`Invalid regex pattern: ${err.message}`);
        }

        const stateString = await context.browserContext.getBrowserStateString();
        const lines = stateString.split('\n');

        const matches = [];
        for (const line of lines) {
          if (!line.trim()) continue;
          if (regex.test(line)) {
            matches.push(line.trim());
            if (matches.length >= limit) break;
          }
        }

        if (matches.length === 0) {
          return toolError(
            `No elements/text found matching pattern "${pattern}". Try a broader pattern like 'button' or 'input'.`
          );
        }

        return toolSuccess(matches.join('\n'));
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Grep elements failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createGrepElementsTool };
