const { ToolManager } = require('../ToolManager');
const { createAllTools } = require('../tools/index');
const { PubSub } = require('../PubSub');
const { Logging } = require('../utils/Logging');
const { GLOW_ENABLED_TOOLS } = require('../services/GlowAnimationService');
const { streamText } = require('ai');
const { openai } = require('@ai-sdk/openai');

class BaseAgent {
  constructor(executionContext, options = {}) {
    this.executionContext = executionContext;
    this.options = options;
    this.emitEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
    this.toolManager = null;
    this.glowService = executionContext.getGlowService();
    this.loggerSource = options.loggerSource || this.constructor.name;
  }

  async initialize() {
    if (this.toolManager) {
      return this.toolManager;
    }

    Logging.log(this.loggerSource, 'Initializing agent tool manager', 'info');
    this.toolManager = new ToolManager(this.executionContext);
    const tools = createAllTools(this.executionContext).map((tool) => this._wrapTool(tool));
    this.toolManager.registerMultiple(tools);
    Logging.log(this.loggerSource, `Registered ${this.toolManager.count()} tools`, 'info');

    this.emitEvent({
      type: 'status',
      status: 'ready',
      toolCount: this.toolManager.count(),
      tools: this.toolManager.getNames()
    });

    return this.toolManager;
  }

  getToolManager() {
    if (!this.toolManager) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
    return this.toolManager;
  }

  getExecutionContext() {
    return this.executionContext;
  }

  publishThinking(content) {
    try {
      const message = PubSub.createMessage(content, 'thinking');
      this.executionContext.getPubSub().publishMessage(message);
    } catch (error) {
      console.debug('BaseAgent publishThinking error:', error.message);
    }
  }

  publishAssistant(content) {
    try {
      const message = PubSub.createMessage(content, 'assistant');
      this.executionContext.getPubSub().publishMessage(message);
    } catch (error) {
      console.debug('BaseAgent publishAssistant error:', error.message);
    }
  }

  async runExecutor({ systemPrompt, maxSteps = 20 }) {
    const toolManager = this.getToolManager();
    const aiTools = toolManager.toAISDKFormat();

    // Use AI Gateway if available, fallback to OpenAI or OpenRouter
    let model;
    if (process.env.AI_GATEWAY_API_KEY) {
      model = openai('gpt-4o', {
        apiKey: process.env.AI_GATEWAY_API_KEY,
        baseURL: 'https://api.voidctrl.com/v1'
      });
    } else if (process.env.OPENROUTER_API_KEY) {
      model = openai('google/gemini-3-pro-preview', {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1'
      });
    } else if (process.env.OPENAI_API_KEY) {
      model = openai('gpt-4o');
    } else {
      throw new Error('No AI model provider configured. Set AI_GATEWAY_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY');
    }

    const context = this.executionContext;
    const messages = context.messageManager.getMessages();

    Logging.log(this.loggerSource, `Starting executor run (maxSteps=${maxSteps})`, 'info');

    try {
      const result = streamText({
        model,
        system: systemPrompt,
        messages,
        tools: aiTools,
        maxSteps,
        providerOptions: {
          openai: {
            reasoning: {
              effort: 'low'
            }
          }
        },
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta') {
            this.emitEvent({
              type: 'text-delta',
              textDelta: chunk.textDelta,
              fullText: '' // We don't track full text accumulation here for event, consumer can accumulate
            });
          } else if (chunk.type === 'reasoning') {
            this.emitEvent({
              type: 'reasoning-delta',
              textDelta: chunk.textDelta
            });
          }
        },
        onStepFinish: ({ toolCalls, toolResults }) => {
          if (toolCalls && toolCalls.length > 0) {
            this.emitEvent({
              type: 'tool-calls',
              toolCalls: toolCalls.map((tc) => ({
                name: tc.toolName,
                args: tc.args
              }))
            });
            this.publishThinking(`Executing ${toolCalls.length} tool(s): ${toolCalls.map(t => t.toolName).join(', ')}...`);
          }
          if (toolResults && toolResults.length > 0) {
            this.emitEvent({
              type: 'tool-results',
              results: toolResults.map((tr) => ({
                name: tr.toolName,
                result: tr.result,
                args: tr.args // Include args for context/history
              }))
            });
          }
        }
      });

      // Wait for the full execution to complete
      const fullText = await result.text;
      const toolResults = await result.toolResults;
      const usage = await result.usage;
      
      // Update message history with the new interaction steps
      const response = await result.response;
      const newMessages = response.messages;
      
      // Add all new messages (assistant and tool) to history directly to preserve structure (e.g. tool_calls)
      for (const msg of newMessages) {
        context.messageManager.add(msg);
      }
      
      Logging.log(this.loggerSource, 'Executor run completed', 'info');

      return {
        fullText,
        toolResults,
        usage,
        toolCalls: await result.toolCalls
      };

    } catch (error) {
      Logging.log(this.loggerSource, `Executor error: ${error.message}`, 'error');
      throw error;
    }
  }

  _wrapTool(tool) {
    if (!tool || typeof tool.execute !== 'function') {
      return tool;
    }

    const executionContext = this.executionContext;
    const glowService = this.glowService;
    const loggerSource = this.loggerSource;
    const originalExecute = tool.execute.bind(tool);

    return {
      ...tool,
      execute: async (args) => {
        const toolName = tool.name || 'unknown_tool';
        Logging.log(loggerSource, `Executing tool ${toolName}`, 'info');

        let glowTabId = null;
        let glowStarted = false;

        if (glowService && executionContext.browserContext && GLOW_ENABLED_TOOLS.has(toolName)) {
          try {
            const page = await executionContext.browserContext.getCurrentPage();
            if (page && typeof page.tabId !== 'undefined') {
              glowTabId = page.tabId;
              await glowService.startGlow(glowTabId, {
                toolName,
                executionId: executionContext.executionId
              });
              glowStarted = true;
            }
          } catch (error) {
            Logging.log(loggerSource, `Glow start failed for ${toolName}: ${error.message}`, 'warning');
          }
        }

        try {
          const result = await originalExecute(args);
          Logging.log(loggerSource, `Tool ${toolName} completed`, 'info');
          return result;
        } catch (error) {
          Logging.log(loggerSource, `Tool ${toolName} error: ${error.message}`, 'error');
          throw error;
        } finally {
          if (glowStarted && glowService && glowTabId !== null) {
            glowService.stopGlow(glowTabId, {
              toolName,
              executionId: executionContext.executionId
            }).catch((stopError) => {
              Logging.log(loggerSource, `Glow stop failed for ${toolName}: ${stopError.message}`, 'warning');
            });
          }
        }
      }
    };
  }
}

module.exports = {
  BaseAgent
};
