/**
 * HumanInput Tool - Request human intervention
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createHumanInputTool(context) {
  return {
    name: 'human_input',
    description: `Request human intervention when stuck or need manual action.

Use this when:
- You need the human to manually complete a step (enter credentials, solve CAPTCHA, etc.)
- You're blocked and need the human to take over temporarily
- You encounter an error that requires human judgment
- You need confirmation before proceeding with a risky action

The human will either click "Done" (after taking action) or "Abort task" (to cancel).`,
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The situation requiring human intervention'
        }
      },
      required: ['prompt']
    },
    execute: async ({ prompt }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('human_input');

        // Generate unique request ID
        const requestId = `human_input_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Store request ID in execution context
        context.setHumanInputRequestId(requestId);

        // In Electron, we'd emit this to the renderer via IPC
        // For now, return with special flag
        const result = {
          output: `Waiting for human input: ${prompt}`,
          requiresHumanInput: true,
          requestId,
          prompt
        };

        return toolSuccess(JSON.stringify(result));
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(error.message);
      }
    }
  };
}

module.exports = { createHumanInputTool };
