const { BaseAgent } = require('./BaseAgent');
const { toolError } = require('../ToolInterface');

class ElectronBrowserAgent extends BaseAgent {
  constructor(executionContext, options = {}) {
    super(executionContext, options);
    this.iterations = 0;
    this.maxIterations = options.maxIterations || 10;
    this.maxRetries = options.maxRetries || 3;
  }

  async execute(task) {
    const context = this.getExecutionContext();
    await this.initialize();
    context.setCurrentTask(task);
    
    // Ensure the task is in the message history so the executor (and planner) sees it
    // Check if the last message is the task, if not, add it.
    const messages = context.messageManager.getMessages();
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    if (!lastMessage || lastMessage.content !== task) {
      context.messageManager.addHuman(task);
    }

    this.iterations = 0;

    this.publishThinking('Starting planning loop...');

    while (this.iterations < this.maxIterations) {
      this.iterations += 1;

      const plannerResult = await this.callPlannerTool(task);
      if (!plannerResult.ok) {
        if (this.iterations >= this.maxRetries) {
          const msg = `Planning failed: ${plannerResult.error}`;
          this.publishAssistant(`❌ ${msg}`);
          return toolError(msg);
        }
        continue;
      }

      const plan = plannerResult.plan;
      this.publishThinking(plan.reasoning || plan.stepByStepReasoning || 'Plan ready.');
      
      console.log('Plan:', JSON.stringify(plan, null, 2));

      if (plan.taskComplete) {
        const finalMessage = plan.finalAnswer || 'Task completed successfully';
        this.publishAssistant(finalMessage);
        return { success: true, text: finalMessage };
      }

      if (!plan.proposedActions || plan.proposedActions.length === 0) {
        console.log('No proposed actions in plan');
        continue;
      }

      const executorResult = await this.runExecutor({
        systemPrompt: this.buildSystemPrompt(task, plan.proposedActions)
      });

      // In AI SDK 3.x, toolResults is a Promise that resolves when the stream finishes
      let toolResults = executorResult.toolResults;
      if (toolResults && typeof toolResults.then === 'function') {
        toolResults = await toolResults;
      }

      console.log('Executor fullText:', executorResult.fullText);
      console.log('Tool results:', JSON.stringify(toolResults, null, 2));

      if (toolResults) {
        const doneResult = toolResults.find((tr) => tr.toolName === 'done');
        if (doneResult) {
          const doneText = typeof doneResult.result === 'string'
            ? doneResult.result
            : (doneResult.result?.output || 'Marked done.');
          this.publishAssistant(doneText);
          let usage = executorResult.usage;
          if (usage && typeof usage.then === 'function') {
            usage = await usage;
          }
          return { success: true, text: doneText, usage };
        }
      }
      
      console.log('ElectronBrowserAgent: Iteration complete, tool results processed. Continuing to next iteration...');

    }

    const message = `Task did not complete within ${this.maxIterations} iterations.`;
    this.publishAssistant(message);
    return { success: false, error: message };
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
    return `You are a browser automation agent.
Task: ${task}

Planned actions:
${actionList}

${toolDescriptions}

Guidelines:
- Use tools to follow the planned actions.
- Keep the user updated by calling the done tool when finished.
- Ask for human_input if blocked.`;
  }
}

module.exports = {
  ElectronBrowserAgent
};
