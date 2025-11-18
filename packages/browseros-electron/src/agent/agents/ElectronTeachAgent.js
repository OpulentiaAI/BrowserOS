const { BaseAgent } = require('./BaseAgent');

class ElectronTeachAgent extends BaseAgent {
  async execute(workflowInput) {
    await this.initialize();
    const context = this.getExecutionContext();
    const workflow = this.normalizeWorkflow(workflowInput);

    this.emitTeachEvent('execution_started', {
      workflowId: workflow.metadata.recordingId,
      goal: workflow.metadata.goal,
      totalSteps: workflow.steps.length
    });

    const systemPrompt = this.buildSystemPrompt(workflow);
    const result = await this.runExecutor({
      systemPrompt,
      maxSteps: this.options.maxSteps || 12
    });

    const text = result.fullText || '';

    this.emitTeachEvent('execution_completed', {
      workflowId: workflow.metadata.recordingId,
      success: true,
      message: text
    });

    this.publishAssistant(text);

    const usage = result.usage && typeof result.usage.then === 'function'
      ? await result.usage
      : result.usage;

    return { success: true, text, usage };
  }

  normalizeWorkflow(input) {
    if (input && typeof input === 'object' && input.metadata && input.steps) {
      return input;
    }

    const goal = typeof input === 'string' && input.length ? input : 'Teach workflow';
    return {
      metadata: {
        goal,
        description: goal,
        recordingId: `workflow_${Date.now()}`
      },
      steps: [
        {
          intent: 'Understand goal',
          action: goal,
          beforeSnapshot: null,
          afterSnapshot: null
        }
      ]
    };
  }

  buildSystemPrompt(workflow) {
    const steps = workflow.steps
      .map((step, index) => `${index + 1}. ${step.intent}: ${step.action}`)
      .join('\n');

    return `You are a teach-mode automation agent.
Goal: ${workflow.metadata.goal}

Reference workflow steps:
${steps}

Instructions:
- Follow the workflow guidance but adapt if needed.
- Narrate your reasoning and call the done tool when complete.
- Ask for human_input if manual action is required.`;
  }

  emitTeachEvent(eventType, data) {
    try {
      this.getExecutionContext().getPubSub().publishTeachModeEvent({
        eventType,
        sessionId: this.getExecutionContext().executionId,
        data
      });
    } catch (error) {
      console.debug('TeachAgent emitTeachEvent error:', error.message);
    }
  }
}

module.exports = {
  ElectronTeachAgent
};
