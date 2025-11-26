/**
 * Planner Tool - Generate a short high-level plan for the current task.
 *
 * This is a JS adaptation of the BrowserOS PlannerTool, using the AI SDK
 * directly from the Electron main process environment.
 */

const { toolSuccess, toolError } = require('../ToolInterface');
const { MessageManagerReadOnly, MessageType } = require('../MessageManager');
const { generatePlannerSystemPrompt, generatePlannerTaskPrompt, PLANNING_CONFIG } = require('./plannerPrompts');
const { PubSub } = require('../PubSub');

// We depend on AI SDK for model access
const { generateObject } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { createOpenRouter } = require('@openrouter/ai-sdk-provider');

// OpenRouter model - Claude Sonnet 4.5
const OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.5';

// Zod schema for the planner output
const { z } = require('zod');

const PLAN_SCHEMA = z.object({
  steps: z.array(z.object({
    action: z.string(),
    reasoning: z.string()
  }))
});

// Helper function to get available model
function getAvailableModel() {
  // Use OpenRouter with official SDK
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('Planner using', OPENROUTER_MODEL, 'via OpenRouter (official SDK)');
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY
      });
      return openrouter.chat(OPENROUTER_MODEL);
    } catch (error) {
      console.warn('OpenRouter failed:', error.message);
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log('Planner falling back to GPT-4o');
      return openai('gpt-4o');
    } catch (error) {
      console.warn('OpenAI model failed:', error.message);
    }
  }

  throw new Error('No available AI model providers configured. Please set OPENROUTER_API_KEY or OPENAI_API_KEY');
}

function createPlannerTool(context) {
  return {
    name: 'planner_tool',
    description: `Generate a short plan (up to ${PLANNING_CONFIG.STEPS_PER_PLAN} steps) for the current task, based on the browser state and recent conversation history.`,
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'The task or goal to plan for'
        },
        max_steps: {
          type: 'number',
          description: 'Maximum number of steps to generate',
          default: PLANNING_CONFIG.STEPS_PER_PLAN
        }
      },
      required: ['task']
    },
    execute: async ({ task, max_steps }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('planner_tool');

        const stepsLimit = typeof max_steps === 'number' && max_steps > 0
          ? max_steps
          : PLANNING_CONFIG.STEPS_PER_PLAN;

        // Notify via PubSub (if available)
        try {
          const pubsub = context.getPubSub();
          pubsub.publishMessage(PubSub.createMessage(`Creating plan for task...`, 'thinking'));
        } catch (e) {
          // PubSub is optional; ignore if unavailable
        }

        // Build conversation history, excluding system + browser_state messages
        const readOnly = new MessageManagerReadOnly(context.messageManager);
        const history = readOnly.getFilteredAsString([MessageType.SYSTEM, MessageType.BROWSER_STATE]);

        // Get browser state string from BrowserContext
        const browserState = context.browserContext && context.browserContext.getBrowserStateString
          ? await context.browserContext.getBrowserStateString()
          : '';

        const maxTokens = typeof context.getMaxTokens === 'function'
          ? context.getMaxTokens()
          : 128000;

        // Rough token heuristic: ~4 chars per token
        const browserStateTokens = Math.ceil((browserState || '').length / 4) || 1;
        const browserStateString = browserStateTokens > maxTokens
          ? '[Browser state too large to include - exceeds token limit]'
          : browserState;

        const systemPrompt = generatePlannerSystemPrompt(stepsLimit);
        const taskPrompt = generatePlannerTaskPrompt(
          task,
          stepsLimit,
          history,
          browserStateString
        );

        const model = getAvailableModel();

        console.log('Planner calling generateObject...');
        let plan;
        try {
          const result = await generateObject({
            model,
            system: systemPrompt,
            prompt: taskPrompt,
            schema: PLAN_SCHEMA,
            maxTokens: 20480 // 10x token limit for planning
          });
          plan = result.object;
          console.log('Planner generateObject returned:', JSON.stringify(plan, null, 2));
        } catch (genError) {
          console.error('Planner generateObject error:', genError.message);
          console.error('Full error:', genError);
          throw genError;
        }

        if (!plan || !Array.isArray(plan.steps)) {
          throw new Error('Planner did not return a valid plan');
        }

        // Map simple step list into the richer PlannerOutput shape
        const proposedActions = plan.steps.map((step) => step.action);
        const stepByStepReasoning = plan.steps
          .map((step, idx) => `${idx + 1}. ${step.reasoning}`)
          .join('\n');

        const plannerOutput = {
          userTask: task,
          currentState: browserStateString || '',
          executionHistory: '',
          challengesIdentified: [],
          stepByStepReasoning,
          proposedActions,
          taskComplete: false,
          finalAnswer: ''
        };

        // Record reasoning summary into context for future reference
        context.addReasoning(JSON.stringify(plannerOutput));

        try {
          const pubsub = context.getPubSub();
          pubsub.publishMessage(PubSub.createMessage(`Created plan with ${plan.steps.length} steps`, 'thinking'));
        } catch (e) {}

        return toolSuccess(JSON.stringify({
          ok: true,
          output: plannerOutput
        }));
      } catch (error) {
        context.incrementMetric('errors');

        const message = error && error.message
          ? error.message
          : 'Unknown planning error';

        try {
          const pubsub = context.getPubSub();
          pubsub.publishMessage(
            PubSub.createMessageWithId(
              PubSub.generateId('ToolError'),
              `Planning failed: ${message}`,
              'error'
            )
          );
        } catch (e) {}

        return toolError(message);
      }
    }
  };
}

module.exports = { createPlannerTool };
