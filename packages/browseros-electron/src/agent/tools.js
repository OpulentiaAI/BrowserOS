/**
 * AI SDK 6 Agent Tools for Electron BrowserOS
 * 
 * Provides browser automation tools and AI agent runtime for the Electron sidebar
 */

const { streamText } = require('ai');
const { createAnthropic } = require('@ai-sdk/anthropic');
const { createOpenAI } = require('@ai-sdk/openai');

// Tool definitions for AI SDK 6
const tools = {
  navigate: {
    description: 'Navigate to a URL in the browser',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to'
        }
      },
      required: ['url']
    },
    execute: async ({ url }, { browserAutomation }) => {
      const result = await browserAutomation.navigate(url);
      return result.success 
        ? `Successfully navigated to ${url}` 
        : `Failed to navigate: ${result.error}`;
    }
  },

  click: {
    description: 'Click an element on the page using a CSS selector',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element to click'
        }
      },
      required: ['selector']
    },
    execute: async ({ selector }, { browserAutomation }) => {
      const result = await browserAutomation.clickElement(selector);
      return result.success 
        ? `Successfully clicked element: ${selector}` 
        : `Failed to click: ${result.error}`;
    }
  },

  type: {
    description: 'Type text into an input field',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the input element'
        },
        text: {
          type: 'string',
          description: 'Text to type into the input'
        }
      },
      required: ['selector', 'text']
    },
    execute: async ({ selector, text }, { browserAutomation }) => {
      const result = await browserAutomation.typeText(selector, text);
      return result.success 
        ? `Successfully typed into ${selector}` 
        : `Failed to type: ${result.error}`;
    }
  },

  executeScript: {
    description: 'Execute JavaScript code in the browser context',
    parameters: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'JavaScript code to execute'
        }
      },
      required: ['script']
    },
    execute: async ({ script }, { browserAutomation }) => {
      const result = await browserAutomation.executeScript(script);
      return result.success 
        ? `Script executed successfully. Result: ${JSON.stringify(result.result)}` 
        : `Failed to execute: ${result.error}`;
    }
  },

  screenshot: {
    description: 'Take a screenshot of the current page',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async (args, { browserAutomation }) => {
      const result = await browserAutomation.screenshot();
      return result.success 
        ? 'Screenshot captured successfully' 
        : `Failed to capture screenshot: ${result.error}`;
    }
  },

  getPageContent: {
    description: 'Get the current page URL and title',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async (args, { browserAutomation }) => {
      const url = await browserAutomation.getCurrentUrl();
      const title = await browserAutomation.getPageTitle();
      return `Current page: ${title} (${url})`;
    }
  },

  done: {
    description: 'Complete the task and return a final message to the user',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Final message to show the user'
        }
      },
      required: ['message']
    },
    execute: async ({ message }) => {
      return { done: true, message };
    }
  }
};

/**
 * Create AI model based on provider settings
 */
function createModel(provider = 'anthropic', apiKey = null, modelId = null) {
  if (provider === 'anthropic') {
    return createAnthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    })(modelId || 'claude-3-5-sonnet-20241022');
  } else if (provider === 'openai') {
    return createOpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    })(modelId || 'gpt-4o');
  }
  
  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Run agent task with streaming
 */
async function runAgentTask({ prompt, currentUrl, browserAutomation, onStream, onComplete }) {
  try {
    // Get model (TODO: make configurable from settings)
    const model = createModel('anthropic');

    // System prompt
    const systemPrompt = `You are a helpful AI assistant integrated into a web browser. You can help users browse the web, automate tasks, and extract information.

Current page: ${currentUrl}

Available tools:
- navigate: Navigate to a URL
- click: Click an element on the page
- type: Type text into an input field
- executeScript: Execute JavaScript in the browser
- screenshot: Take a screenshot
- getPageContent: Get current page info
- done: Complete the task with a message

Always call the 'done' tool when you've completed the user's request.`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // Convert tools to AI SDK format
    const aiTools = {};
    for (const [name, tool] of Object.entries(tools)) {
    const params = tool.parameters && typeof tool.parameters === 'object'
      ? tool.parameters
      : { type: 'object', properties: {} };
    const schema = jsonSchema({
      type: 'object',
      properties: {},
      additionalProperties: false,
      ...params
    });

    aiTools[name] = {
      description: tool.description,
      // Provide both fields; SDK serializes using inputSchema.
      parameters: schema,
      inputSchema: schema,
      execute: async (args) => {
        const result = await tool.execute(args, { browserAutomation });
          
          // Check if done
          if (result && result.done) {
            return result.message;
          }
          
          return result;
        }
      };
    }

    // Stream the response
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      tools: aiTools,
      maxSteps: 10,
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta' && onStream) {
          onStream(chunk.textDelta);
        }
      },
      onFinish: ({ text, toolCalls, toolResults }) => {
        if (onComplete) {
          onComplete({
            text,
            toolCalls,
            toolResults
          });
        }
      }
    });

    // Wait for completion
    const { text, toolCalls, toolResults } = await result;

    return {
      success: true,
      text,
      toolCalls,
      toolResults,
      metadata: {
        stepsCount: toolCalls?.length || 0
      }
    };

  } catch (error) {
    console.error('Agent error:', error);
    return {
      success: false,
      error: error.message,
      text: `Error: ${error.message}`
    };
  }
}

module.exports = {
  tools,
  runAgentTask,
  createModel
};
