/**
 * Done Tool - Mark the task as complete
 */

const { toolSuccess } = require('../ToolInterface');

function createDoneTool(context) {
  return {
    name: 'done',
    description: `Mark the task as complete and provide a final summary to the user.
CRITICAL: The message MUST contain actual information discovered during the task, not just a description of what you did.
For search/research tasks: Include the actual headlines, facts, or data you found.
BAD message: "I searched for AI news"
GOOD message: "Here are the latest AI news: 1) OpenAI released GPT-5 with... 2) Google announced..."`,
    parameters: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the task was completed successfully'
        },
        message: {
          type: 'string',
          description: 'REQUIRED: A detailed summary containing the actual information discovered. For research tasks, include specific headlines, facts, dates, and sources found.'
        }
      },
      required: ['success', 'message']
    },
    execute: async ({ success, message }) => {
      context.incrementMetric('toolCalls');
      context.incrementToolUsageMetrics('done');

      // Log if message is missing - helps debug
      if (!message) {
        console.warn('[Done Tool] WARNING: Called without message! This should include the actual findings.');
      } else {
        console.log('[Done Tool] Message received:', message.substring(0, 200));
      }

      const output = {
        success,
        message: message || (success ? 'Task completed successfully' : 'Task failed')
      };

      return toolSuccess(JSON.stringify(output));
    }
  };
}

module.exports = { createDoneTool };
