/**
 * TaskManager.js
 * 
 * Manages the structured state of a high-level user task.
 * Tracks sub-steps, their status, and history to prevent loops and ensure progress.
 */

class TaskManager {
  constructor() {
    this.currentTask = null;
    this.steps = []; // { id, description, status: 'pending'|'active'|'completed'|'failed', reasoning, toolCalls: [] }
    this.history = []; // Execution history for context
  }

  startTask(taskDescription) {
    this.currentTask = taskDescription;
    this.steps = [];
    this.history = [];
  }

  addStep(description, reasoning) {
    const id = `step_${Date.now()}_${this.steps.length}`;
    this.steps.push({
      id,
      description,
      reasoning,
      status: 'pending',
      toolCalls: []
    });
    return id;
  }

  updateStepStatus(stepId, status, result = null) {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (result) {
        step.result = result;
      }
    }
  }

  recordToolCall(stepId, toolName, args, result) {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.toolCalls.push({ toolName, args, result, timestamp: Date.now() });
      // Add to global history
      this.history.push(`[Step: ${step.description}] Tool: ${toolName} Args: ${JSON.stringify(args)} Result: ${JSON.stringify(result)}`);
    }
  }

  getNextPendingStep() {
    return this.steps.find(s => s.status === 'pending');
  }

  getActiveStep() {
    return this.steps.find(s => s.status === 'active');
  }

  getTaskState() {
    return {
      task: this.currentTask,
      steps: this.steps,
      history: this.history.slice(-10) // Last 10 actions
    };
  }

  // Check if we are looping (same tool, same args repeated)
  isLooping(toolName, args) {
    const recentHistory = this.steps.flatMap(s => s.toolCalls).slice(-3);
    if (recentHistory.length < 3) return false;
    
    return recentHistory.every(call => 
      call.toolName === toolName && 
      JSON.stringify(call.args) === JSON.stringify(args)
    );
  }
}

module.exports = { TaskManager };
