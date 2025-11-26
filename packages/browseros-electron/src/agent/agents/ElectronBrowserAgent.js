const { BaseAgent } = require('./BaseAgent');
const { toolError } = require('../ToolInterface');

const EXECUTOR_SYSTEM_PROMPT_TEMPLATE = `You are an intelligent browser automation agent. Date: {CURRENT_DATE}

# Task
{TASK}

# Current Browser State
{BROWSER_STATE}

# Plan
{ACTION_LIST}

# Available Tools
{TOOL_DESCRIPTIONS}

# CRITICAL INSTRUCTIONS

You are an intelligent research assistant. Your job is to:
1. Navigate and interact with web pages
2. EXTRACT and READ the actual content found
3. SUMMARIZE the discoveries in a helpful natural language response

## MANDATORY Execution Flow for Research/Search Tasks:

### Step 1: Search
Call \`search\` tool with the query to find information.

### Step 2: Wait
Call \`wait\` tool for 1-2 seconds to let results load.

### Step 3: Extract Content
Call \`extract\` tool with selector="body" and maxLength=5000.
READ THE OUTPUT CAREFULLY - it contains the actual information!

### Step 4: Explore If Needed
- Use \`scroll\` tool with direction="down" to see more content
- Use \`click\` tool to open interesting articles for more details
- Extract again after scrolling or clicking to get new content

### Step 5: Summarize and Complete
Call \`done\` tool with a message that INCLUDES THE ACTUAL INFORMATION you extracted.

## CRITICAL: How to Call the Done Tool

After calling \`extract\`, you will receive page content with headlines and information.
YOU MUST put the actual findings IN THE DONE TOOL'S MESSAGE PARAMETER!

**IMPORTANT: Do NOT output text before calling done. Put ALL your findings in the done message parameter!**

When calling done, use this format:
\`\`\`
done({ success: true, message: "Here are the latest AI news stories I found: 1) Google's Gemini Update - Google is having AI build the UI (Bloomberg, 1 day ago)..." })
\`\`\`

**BAD (do not do this):**
- Outputting text like "Perfect, I found the news..." and then calling done({success: true})
- Calling done without a message parameter
- Calling done with message: "Task completed"

**GOOD (required):**
- done({ success: true, message: "Here are the latest AI news stories I found:\n1) Google's Gemini Update - Google is having AI build the UI (Bloomberg, 1 day ago)\n2) Harmonic AI Startup - Robinhood CEO's AI startup valued at $1.45B (Yahoo Finance, 4 hours ago)\n3) Claude beats Gemini 3 - New developments in AI competition\n\nKey trends: AI is being integrated into more products, valuations are rising." })

## Exploration Guidelines
- If initial results aren't enough, SCROLL DOWN to see more
- CLICK on promising article links to get more detailed information
- After clicking an article, EXTRACT its content and include key points
- You have up to {MAX_STEPS} steps - use them to gather comprehensive information

## Rules
- Do NOT stop after just searching - always EXTRACT and SUMMARIZE
- The user wants INFORMATION, not confirmation that you searched
- Your done message IS your response to the user - make it informative!

Begin execution now.`;

class ElectronBrowserAgent extends BaseAgent {
  constructor(executionContext, options = {}) {
    // Wrap onEvent to intercept events for TaskManager updates
    const originalOnEvent = options.onEvent;
    const wrappedOnEvent = (event) => {
       this.handleAgentEvent(event);
       if (typeof originalOnEvent === 'function') {
         originalOnEvent(event);
       }
    };
    
    super(executionContext, { ...options, onEvent: wrappedOnEvent });
    this.iterations = 0;
    this.maxIterations = options.maxIterations || 15; // Increased for more detailed plans
    this.maxRetries = options.maxRetries || 3;
  }

  handleAgentEvent(event) {
    const context = this.getExecutionContext();
    // We need to track tool execution to update TaskManager status
    // 'tool-results' contains the output and args (now added to BaseAgent)
    if (event.type === 'tool-results' && event.results) {
        const activeStep = context.taskManager.getActiveStep();
        if (activeStep) {
            for (const tr of event.results) {
                // Record tool call in TaskManager history
                context.taskManager.recordToolCall(activeStep.id, tr.name, tr.args, tr.result);
                
                // Check for loops
                // Note: In streamText, we can't easily "stop" and "ask planner" mid-stream without aborting.
                // For now, we just log/warn. The maxSteps limit prevents infinite loops.
                if (context.taskManager.isLooping(tr.name, tr.args)) {
                    console.warn(`Loop detected for tool ${tr.name}. This might indicate the agent is stuck.`);
                    // Ideally we would inject a system message or abort, but streamText runs autonomously.
                }
            }
            // Mark step as completed (or at least progressed)
            // Since steps in TaskManager were from the high-level plan, and we are executing them...
            // Actually, the high-level plan steps might map 1:1 to tool calls or 1:many.
            // For simplicity, if we executed tools successfully, we assume progress on the active step.
            // context.taskManager.updateStepStatus(activeStep.id, 'completed'); 
            // We keep it active until the whole plan is done? 
            // Or we mark it done. Let's mark it done for now to show progress.
            context.taskManager.updateStepStatus(activeStep.id, 'completed');
        }
    }
  }

  async execute(task) {
    const context = this.getExecutionContext();
    await this.initialize();
    context.setCurrentTask(task);
    
    // Ensure the task is in the message history
    const messages = context.messageManager.getMessages();
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    if (!lastMessage || lastMessage.content !== task) {
      context.messageManager.addHuman(task);
    }

    this.iterations = 0;
    this.publishThinking('Starting execution...');

    // Initial planner call
    let currentPlan = null;
    try {
        const plannerResult = await this.callPlannerTool(task);
        if (plannerResult.ok) {
            currentPlan = plannerResult.plan;
            this.publishThinking(currentPlan.reasoning || 'Plan ready.');
            
            // Add plan to history for context
            context.messageManager.addSystem(`Plan: ${JSON.stringify(currentPlan.proposedActions)}`);
            
            // Initialize TaskManager with the plan
            context.taskManager.startTask(task);
            if (currentPlan.proposedActions && currentPlan.proposedActions.length > 0) {
                // Add all planned actions as steps
                for (const action of currentPlan.proposedActions) {
                    context.taskManager.addStep(action, "Planner proposed this action");
                }
                // Activate the first step
                const firstStep = context.taskManager.getNextPendingStep();
                if (firstStep) {
                    context.taskManager.updateStepStatus(firstStep.id, 'active');
                }
            }
        }
    } catch (e) {
        console.warn("Planner failed, proceeding with direct execution", e);
    }

    // Run executor with maxSteps
    try {
        const toolDescriptions = this.getToolManager().getDescriptions();
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Get current browser state for context
        let browserState = 'Unknown';
        try {
          const page = await context.browserContext.getCurrentPage();
          if (page) {
            const url = page.url || 'unknown';
            const title = page.title || 'unknown';
            const content = await page.evaluate('document.body ? document.body.innerText.substring(0, 500) : ""');
            browserState = `URL: ${url}\nTitle: ${title}\nPage content preview: ${content}...`;
          }
        } catch (e) {
          browserState = 'Could not get browser state';
        }
        
        const systemPrompt = EXECUTOR_SYSTEM_PROMPT_TEMPLATE
              .replace('{CURRENT_DATE}', currentDate)
              .replace('{TASK}', task)
              .replace('{BROWSER_STATE}', browserState)
              .replace('{ACTION_LIST}', currentPlan ? currentPlan.proposedActions.join('\n') : 'Proceed with task')
              .replace('{TOOL_DESCRIPTIONS}', toolDescriptions)
              .replace('{MAX_STEPS}', String(this.maxIterations));

        this.publishAssistant(`🔍 Starting task: ${task}`);
        
        let executorResult = await this.runExecutor({
            systemPrompt,
            maxSteps: this.maxIterations
        });

        // Check if done tool was called
        const doneToolCalled = executorResult.toolCalls?.some(tc => tc.toolName === 'done');
        
        // Find the done tool result and extract the message
        let doneMessage = null;
        if (doneToolCalled) {
          // First try to get the message from the tool call args (what the AI actually sent)
          const doneCall = executorResult.toolCalls?.find(tc => tc.toolName === 'done');
          if (doneCall?.args?.message) {
            doneMessage = doneCall.args.message;
          }
          
          // Also check the result in case the message is there
          if (!doneMessage) {
            const doneResult = executorResult.toolResults?.find(tr => tr.toolName === 'done');
            if (doneResult?.result) {
              try {
                const parsed = typeof doneResult.result === 'string' 
                  ? JSON.parse(doneResult.result) 
                  : doneResult.result;
                // Check nested output structure from toolSuccess
                if (parsed.output) {
                  const innerParsed = typeof parsed.output === 'string' ? JSON.parse(parsed.output) : parsed.output;
                  doneMessage = innerParsed.message || innerParsed.output;
                } else {
                  doneMessage = parsed.message || parsed.output;
                }
              } catch (e) {
                console.log('Done result parse error:', e.message);
              }
            }
          }
          
          // Try to find extracted content from tool results FIRST
          // This is more likely to contain the actual search results
          let extractedContent = null;
          const extractResults = executorResult.toolResults?.filter(tr => tr.toolName === 'extract') || [];
          for (const extractResult of extractResults) {
            if (extractResult?.result) {
              try {
                const parsed = typeof extractResult.result === 'string' 
                  ? JSON.parse(extractResult.result) 
                  : extractResult.result;
                const content = parsed.output || parsed.result || '';
                if (content.length > extractedContent?.length || 0) {
                  extractedContent = content;
                }
              } catch (e) {
                // Try raw string
                if (typeof extractResult.result === 'string' && extractResult.result.length > 100) {
                  extractedContent = extractResult.result;
                }
              }
            }
          }
          
          // If we have extracted content and it contains actual search results, format it
          if (!doneMessage && extractedContent && extractedContent.length > 200) {
            console.log('[ElectronBrowserAgent] Using extracted content as done message');
            // Clean up and format the extracted content
            const lines = extractedContent.split('\n').filter(l => l.trim() && l.length > 3);
            // Take the first meaningful lines
            const summary = lines.slice(0, 20).join('\n');
            doneMessage = `Here's what I found:\n\n${summary}`;
          }
          
          // If AI put content in fullText instead of done message, use it
          // But only if fullText is substantial (not just "Perfect! I found...")
          if (!doneMessage && executorResult.fullText && executorResult.fullText.trim().length > 200) {
            console.log('[ElectronBrowserAgent] Using fullText as done message (AI did not pass message arg)');
            doneMessage = executorResult.fullText;
          }
          
          // Log what we found for debugging
          console.log('[ElectronBrowserAgent] Done message extracted:', doneMessage?.substring(0, 200));
        }
        
        if (doneToolCalled) {
          const summary = doneMessage || executorResult.fullText || 'Task completed successfully.';
          this.publishAssistant(`✅ ${summary}`);
          return { success: true, text: summary };
        }
        
        // If done wasn't called but we have text output, use it
        if (executorResult.fullText && executorResult.fullText.trim()) {
          this.publishAssistant(`✅ ${executorResult.fullText}`);
          return { success: true, text: executorResult.fullText };
        }
        
        // Fallback: list what tools were used
        const toolsUsed = executorResult.toolCalls?.map(tc => tc.toolName).join(', ') || 'none';
        const completionMessage = `Task execution finished. Tools used: ${toolsUsed}`;
        this.publishAssistant(`✅ ${completionMessage}`);
        return { success: true, text: completionMessage };

    } catch (error) {
        this.publishAssistant(`❌ Execution failed: ${error.message}`);
        return { success: false, error: error.message };
    }
  }

  async callPlannerTool(task) {
    try {
      const plannerTool = this.getToolManager().get('planner_tool');
      const raw = await plannerTool.execute({ task });
      if (!raw || raw.ok === false) {
        return { ok: false, error: raw?.output || 'Planner returned error' };
      }
      let payload;
      try {
        payload = typeof raw.output === 'string' ? JSON.parse(raw.output) : raw.output;
      } catch (error) {
        return { ok: false, error: `Planner output parse error: ${error.message}` };
      }
      return { ok: true, plan: payload.output || payload };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  buildSystemPrompt(task, actions) {
    const toolDescriptions = this.getToolManager().getDescriptions();
    const actionList = actions.map((a, idx) => `${idx + 1}. ${a}`).join('\n');
    const currentDate = new Date().toISOString().split('T')[0];
    
    return EXECUTOR_SYSTEM_PROMPT_TEMPLATE
      .replace('{CURRENT_DATE}', currentDate)
      .replace('{TASK}', task)
      .replace('{ACTION_LIST}', actionList)
      .replace('{TOOL_DESCRIPTIONS}', toolDescriptions);
  }
}

module.exports = {
  ElectronBrowserAgent
};
