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

    // Use AI Gateway if available, fallback to OpenAI
    let model;
    if (process.env.AI_GATEWAY_API_KEY) {
      model = openai('gpt-4o', {
        apiKey: process.env.AI_GATEWAY_API_KEY,
        baseURL: 'https://api.voidctrl.com/v1'
      });
    } else if (process.env.OPENAI_API_KEY) {
      model = openai('gpt-4o');
    } else {
      throw new Error('No AI model provider configured. Set AI_GATEWAY_API_KEY or OPENAI_API_KEY');
    }

    const context = this.executionContext;
    const messages = context.messageManager.getMessages();
    let fullText = '';

    Logging.log(this.loggerSource, `Starting executor run (maxSteps=${maxSteps})`, 'info');
    console.log('DEBUG: BaseAgent calling streamText...');

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: aiTools,
      maxSteps,
      onChunk: ({ chunk }) => {
        // console.log('DEBUG: onChunk', chunk.type);
        if (chunk.type === 'text-delta') {
          fullText += chunk.textDelta;
          this.emitEvent({
            type: 'text-delta',
            textDelta: chunk.textDelta,
            fullText
          });
        }
      },
      onStepFinish: ({ toolCalls, toolResults }) => {
        console.log('DEBUG: onStepFinish triggered');
        console.log('BaseAgent onStepFinish toolCalls:', JSON.stringify(toolCalls?.map(tc => tc.toolName)));
        console.log('BaseAgent onStepFinish toolResults:', JSON.stringify(toolResults?.map(tr => tr.toolName)));

        if (toolCalls && toolCalls.length > 0) {
          this.emitEvent({
            type: 'tool-calls',
            toolCalls: toolCalls.map((tc) => ({
              name: tc.toolName,
              args: tc.args
            }))
          });
        }
        if (toolResults && toolResults.length > 0) {
          this.emitEvent({
            type: 'tool-results',
            results: toolResults.map((tr) => ({
              name: tr.toolName,
              result: tr.result
            }))
          });
        }
      }
    });

    console.log('DEBUG: streamText returned (no await yet)');
    // Wait for execution to complete to ensure fullText is populated
    // In AI SDK 3.x, we MUST consume the stream (e.g. result.text) before result.toolResults will resolve.
    // If we await toolResults first, it might hang because the stream isn't being pulled.
    
    let finalResponse = '';
    
    // Promise.all approach to ensure we don't deadlock:
    // - Start consuming text (which drives the stream)
    // - Wait for toolResults (which resolves when stream ends)
    try {
      const textPromise = (async () => {
        if (result.text && typeof result.text.then === 'function') {
          return await result.text;
        }
        return result.text || '';
      })();

      const toolResultsPromise = (async () => {
        if (result.toolResults && typeof result.toolResults.then === 'function') {
          return await result.toolResults;
        }
        return result.toolResults;
      })();

      // Wait for both
      const [textResult] = await Promise.all([textPromise, toolResultsPromise]);
      finalResponse = textResult;
      
      if (!fullText && finalResponse) {
        fullText = finalResponse;
      }
    } catch (err) {
      console.error('Error consuming stream/tools:', err);
    }

    context.messageManager.addAI(fullText);
    Logging.log(this.loggerSource, 'Executor run completed', 'info');

    // Attach accumulated text to the result object for convenience
    // (since result.text is a stream/iterator in AI SDK 3.x)
    Object.defineProperty(result, 'fullText', {
      value: fullText,
      writable: true,
      enumerable: true
    });

    return result;
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
