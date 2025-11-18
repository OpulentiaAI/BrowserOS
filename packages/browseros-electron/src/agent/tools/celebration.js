const { toolSuccess } = require('../ToolInterface');

function createCelebrationTool(context) {
  return {
    name: 'celebration',
    description:
      'Trigger a success celebration message when a task is completed. Use to clearly mark success for the user.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Optional custom celebration message'
        }
      }
    },
    execute: async ({ message } = {}) => {
      context.incrementMetric('toolCalls');
      context.incrementToolUsageMetrics('celebration');

      const finalMessage =
        message ||
        '🎉 Task completed successfully! Great job. You can review the results or start a new task.';

      return toolSuccess(finalMessage);
    }
  };
}

module.exports = { createCelebrationTool };
