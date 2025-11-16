/**
 * Done Tool - Mark the task as complete
 */

const { toolSuccess } = require('../ToolInterface');

function createDoneTool(context) {
  return {
    name: 'done',
    description: 'Mark the task as complete',
    parameters: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the task was completed successfully'
        },
        message: {
          type: 'string',
          description: 'Completion message or reason for failure'
        }
      },
      required: ['success']
    },
    execute: async ({ success, message }) => {
      context.incrementMetric('toolCalls');
      context.incrementToolUsageMetrics('done');

      const output = {
        success,
        message: message || (success ? 'Task completed successfully' : 'Task failed')
      };

      return toolSuccess(JSON.stringify(output));
    }
  };
}

module.exports = { createDoneTool };
