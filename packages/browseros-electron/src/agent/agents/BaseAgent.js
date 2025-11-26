const { ToolManager } = require('../ToolManager');
const { createAllTools } = require('../tools/index');
const { PubSub } = require('../PubSub');
const { Logging } = require('../utils/Logging');
const { GLOW_ENABLED_TOOLS } = require('../services/GlowAnimationService');
const { generateText, streamText, stepCountIs } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { createOpenRouter } = require('@openrouter/ai-sdk-provider');

// OpenRouter model - Claude Sonnet 4.5
const OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.5';

// Custom stop condition: stop when 'done' tool is called
const hasToolCall = (toolName) => ({ steps }) => {
  return steps.some(step => 
    step.toolCalls?.some(tc => tc.toolName === toolName)
  );
};

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

    // Debug: log navigate tool schema to catch malformed tool payloads
    try {
      const navTool = aiTools.navigate;
      const navSchema = navTool?.inputSchema?.jsonSchema || navTool?.parameters?.jsonSchema || navTool?.parameters;
      Logging.log(this.loggerSource, `Navigate tool schema: ${JSON.stringify(navSchema)}`, 'info');
    } catch (e) {
      Logging.log(this.loggerSource, `Navigate schema debug failed: ${e.message}`, 'warning');
    }

    // Use OpenRouter with official SDK
    let model;
    if (process.env.OPENROUTER_API_KEY) {
      console.log('Executor: Using OpenRouter official SDK');
      console.log('Executor: Model:', OPENROUTER_MODEL);
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY
      });
      model = openrouter.chat(OPENROUTER_MODEL);
      Logging.log(this.loggerSource, `Using ${OPENROUTER_MODEL} via OpenRouter`, 'info');
    } else if (process.env.OPENAI_API_KEY) {
      model = openai('gpt-4o');
      Logging.log(this.loggerSource, `Using GPT-4o via OpenAI`, 'info');
    } else {
      throw new Error('No AI model provider configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY');
    }

    const context = this.executionContext;
    
    // Build messages from the original task only - let AI SDK handle tool call history internally
    // We just provide the initial user request to avoid v5/v6 format issues
    const messages = [];
    const rawMessages = context.messageManager.getMessages();
    
    // Only include the first human message (the task) and any simple AI responses
    for (const msg of rawMessages) {
      if (msg.role === 'human' && typeof msg.content === 'string') {
        messages.push({ role: 'user', content: msg.content });
        break; // Only include the original task
      }
    }
    
    // If no user message found, use a default
    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Execute the task as planned.' });
    }

    Logging.log(this.loggerSource, `Starting executor run (maxSteps=${maxSteps}, messages=${messages.length})`, 'info');

    try {
      const result = streamText({
        model,
        system: systemPrompt,
        messages,
        tools: aiTools,
        maxSteps,
        maxTokens: 40960, // 10x token limit
        toolChoice: 'auto',
        // Stop when 'done' tool is called OR max steps reached
        stopWhen: [
          hasToolCall('done'),
          stepCountIs(maxSteps)
        ],
        // Update context between steps - manage growing history
        prepareStep: async ({ stepNumber, steps, messages }) => {
          // Log step progress
          console.log(`Executor: Step ${stepNumber}, previous steps: ${steps.length}`);
          
          // Publish progress to chat
          if (stepNumber > 0) {
            const lastStep = steps[steps.length - 1];
            if (lastStep?.toolCalls?.length > 0) {
              const toolNames = lastStep.toolCalls.map(tc => tc.toolName).join(', ');
              this.publishAssistant(`Step ${stepNumber}: Completed ${toolNames}`);
            }
          }
          
          // Context management: trim messages if they get too long to avoid 413 errors
          // Keep system message + user message + last 6 messages (3 exchanges)
          if (messages && messages.length > 10) {
            console.log(`Executor: Trimming messages from ${messages.length} to prevent context overflow`);
            const systemMsg = messages.find(m => m.role === 'system');
            const userMsg = messages.find(m => m.role === 'user');
            const recentMsgs = messages.slice(-6);
            
            const trimmedMessages = [];
            if (systemMsg) trimmedMessages.push(systemMsg);
            if (userMsg && !recentMsgs.includes(userMsg)) trimmedMessages.push(userMsg);
            trimmedMessages.push(...recentMsgs);
            
            return { messages: trimmedMessages };
          }
          
          return {}; // Continue with same settings
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
            // Publish user-friendly tool execution messages
            for (const tc of toolCalls) {
              const argsPreview = JSON.stringify(tc.args || {}).substring(0, 100);
              this.publishAssistant(`🔧 ${tc.toolName}: ${argsPreview}`);
            }
          }
          if (toolResults && toolResults.length > 0) {
            this.emitEvent({
              type: 'tool-results',
              results: toolResults.map((tr) => ({
                name: tr.toolName,
                result: tr.result,
                args: tr.args
              }))
            });
            // Publish results summary
            for (const tr of toolResults) {
              const resultPreview = typeof tr.result === 'string' 
                ? tr.result.substring(0, 150) 
                : JSON.stringify(tr.result || {}).substring(0, 150);
              this.publishAssistant(`✓ ${tr.toolName} completed: ${resultPreview}`);
            }
          }
        }
      });

      // Wait for the full execution to complete
      console.log('Executor: waiting for result.text...');
      let fullText, toolResults, toolCalls;
      try {
        fullText = await result.text;
        console.log('Executor: fullText =', fullText?.substring(0, 200) || '(empty)');
      } catch (textError) {
        console.error('Executor: Error getting text:', textError.message);
        fullText = '';
      }
      
      try {
        toolResults = await result.toolResults;
        console.log('Executor: toolResults count =', toolResults?.length || 0);
      } catch (trError) {
        console.error('Executor: Error getting toolResults:', trError.message);
        toolResults = [];
      }
      
      try {
        toolCalls = await result.toolCalls;
        console.log('Executor: toolCalls count =', toolCalls?.length || 0);
      } catch (tcError) {
        console.error('Executor: Error getting toolCalls:', tcError.message);
        toolCalls = [];
      }
      
      const usage = await result.usage;
      
      // Note: Don't add raw AI SDK response messages to history - format incompatibility between v5/v6
      // Instead, just add a summary message if there's text output
      if (fullText && fullText.trim()) {
        context.messageManager.addAI(fullText);
      }
      
      Logging.log(this.loggerSource, 'Executor run completed', 'info');

      return {
        fullText,
        toolResults,
        usage,
        toolCalls
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
