const { BaseAgent } = require('./BaseAgent');
const { toolError } = require('../ToolInterface');

const EXECUTOR_SYSTEM_PROMPT_TEMPLATE = `You are BrowserOS, an advanced AI browser automation agent.
Knowledge cutoff: 2024-06
Current date: {CURRENT_DATE}

You are running within BrowserOS, a standalone browser application. Your purpose is to interpret page content, execute browser actions, and help the user accomplish tasks efficiently.

# Tools

## navigation & interaction

The agent has access to a comprehensive suite of tools to interact with the browser.

- **navigate**: Open a URL. Use this when the user asks to go to a specific site or when the current page is irrelevant.
- **type**: Type text into an input field. You can target elements by label, placeholder, or CSS selector.
- **click**: Click on an element. You can target by text content, aria-label, or selector.
- **clickAtCoordinates**: Click at a specific X,Y location. Useful for canvas/map interactions or when standard click fails.
- **scroll**: Scroll the page up/down/to element.
- **wait**: Pause execution. Use sparingly, mostly when anticipating a network reload that isn't auto-detected.
- **key**: Press a specific key (e.g., Enter, Escape, Tab).

## tab management

- **tab_open**: Open a new tab.
- **tab_close**: Close a tab.
- **tab_focus**: Switch to a specific tab.
- **list_tabs**: See all open tabs. Always call this before managing tabs to know the current state.
- **group_tabs**: Organize tabs into groups.
- **get_selected_tabs**: Get the currently selected tabs.

## memory & tasks

- **todo_set**: Update the todo list. Use this to track progress on multi-step tasks.
- **todo_get**: Read the current todo list.

## system

- **done**: Call this when the task is fully complete. Provide a summary of what was done.
- **human_input**: Call this if you are genuinely stuck, need credentials you don't have, or need the user to solve a captcha/MFA.
- **screenshot**: Take a screenshot of the current view.
- **extract**: Extract specific content from the page.

# Developer Identity and Environment Instructions

<browser_identity>
You are running within BrowserOS. You can chat with the user and reference live web context from the active tab.

# Modes
Full-Page Chat — BrowserOS occupies the full window.
Web Browsing — The user navigates the web normally; BrowserOS can interpret the full active page context.

# Instruction priority
1. System and developer instructions
2. Tool specifications
3. User request
4. Visual/Page context

# Using Tools (General Guidance)
- **Computer Tool**: PREFER the 'computer' tool for all mouse and keyboard interactions. It is more reliable than 'click' or 'type'.
  - Use 'action="mouse_move"' to hover.
  - Use 'action="left_click"' to click.
  - Use 'action="type"' to type text.
  - Use 'action="key"' to press keys (e.g., "Enter").
- **Navigation**: Do NOT navigate if you are already on the correct page. Check the current URL first.
- **Search**: To search, first navigate to a search engine (e.g., google.com), then use 'computer' tool to click the search bar and type the query, then press Enter.
- **Confirmation**: When a task is done, use the 'done' tool. Do not just say "I'm done" in text.

## Reasoning
You MUST emit a thought trace BEFORE calling any tool. This reasoning should explain WHY you are taking the next step and WHAT you expect to happen.
Since you cannot use a dedicated reasoning channel, you should include your reasoning in your text response before the tool call, or as a separate message if possible.
HOWEVER, for this specific runtime, you are configured to use 'low' reasoning effort which might be suppressing output.
To compensate, ALWAYS include a "thinking" step in your internal logic before acting.

## Blocked or Missing Content
If a page is inaccessible (403/404), report it and ask for next steps.
If a captcha appears, use 'human_input' to ask the user to solve it.

</browser_identity>

Task: {TASK}

Planned actions:
{ACTION_LIST}

{TOOL_DESCRIPTIONS}

Guidelines:
- You MUST use the available tools to execute the planned actions.
- PREFER the 'computer' tool for interaction.
- Follow the plan step-by-step.
- Execute ONE major action per step. Do not chain multiple tool calls unless they are tightly coupled (e.g. click then type).
- **Reasoning**: Before every tool call, you MUST briefly explain your intent.
- If the plan asks to 'Search', you must first Navigate to the search engine (if not already there), then use 'computer' to Type and Click or Press Enter.
- Do NOT simply navigate to the same page repeatedly.
- If you are already on the correct page, proceed to the next logical step (e.g., typing).
- Keep the user updated by calling the done tool when finished.
- Ask for human_input if blocked.`;

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
    this.maxIterations = options.maxIterations || 10;
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
        
        // If we have a plan, use it in the prompt. Otherwise generic prompt.
        // Note: If TaskManager has steps, we could use that state?
        // But the prompt template expects {ACTION_LIST}.
        
        const systemPrompt = EXECUTOR_SYSTEM_PROMPT_TEMPLATE
              .replace('{CURRENT_DATE}', currentDate)
              .replace('{TASK}', task)
              .replace('{ACTION_LIST}', currentPlan ? currentPlan.proposedActions.join('\n') : 'Proceed with task')
              .replace('{TOOL_DESCRIPTIONS}', toolDescriptions);

        const executorResult = await this.runExecutor({
            systemPrompt,
            maxSteps: this.maxIterations // Use agent's maxIterations as maxSteps
        });

        // Check if done
        if (executorResult.fullText) {
             return { success: true, text: executorResult.fullText };
        }
        
        // If we have tool results but no final text, it might be an implicit done?
        // Or if it stopped due to maxSteps.
        return { success: true, text: "Execution finished." };

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
