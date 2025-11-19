/**
 * ExecutionContext for Electron agents.
 * 
 * Simplified port from BrowserOS agent. Holds browser context, message manager,
 * TODO store, and execution state. Agents and tools use this to coordinate
 * multi-step tasks.
 */

const { MessageManager } = require('./MessageManager');
const { TodoStore } = require('./TodoStore');
const { PubSub } = require('./PubSub');
const { KlavisAPIManager } = require('./mcp/KlavisAPIManager');
const { Logging } = require('./utils/Logging');
const { GlowAnimationService } = require('./services/GlowAnimationService');
const { TaskManager } = require('./TaskManager');

class ExecutionContext {
  constructor(options = {}) {
    // Core dependencies
    this.executionId = options.executionId || 'default';
    this.browserContext = options.browserContext;
    this.messageManager = options.messageManager || new MessageManager();
    this.todoStore = options.todoStore || new TodoStore();
    this.taskManager = new TaskManager(); // Initialize TaskManager
    Logging.initialize({ debugMode: process.env.BROWSEROS_DEBUG === 'true' });
    this._glowService = options.glowService || GlowAnimationService.getInstance();
    
    // Abort control
    this.abortController = options.abortController || new AbortController();
    this.abortSignal = this.abortController.signal;
    this.userInitiatedCancel = false;

    // Execution state
    this._isExecuting = false;
    this._lockedTabId = null;
    this._currentTask = null;
    this._todoList = '';
    this._taskNumber = 0;
    this._chatMode = false;

    // Tab selection
    this.selectedTabIds = null;

    // Model capabilities
    this._supportsVision = options.supportsVision !== false;
    this._limitedContextMode = options.limitedContextMode || false;
    this._maxTokens = options.maxTokens || 128000;

    // Metrics
    this._executionMetrics = {
      toolCalls: 0,
      observations: 0,
      errors: 0,
      startTime: Date.now(),
      endTime: 0,
      toolFrequency: new Map()
    };

    // Reasoning history (for planner)
    this._reasoningHistory = [];

    // Human input state
    this._humanInputRequestId = null;
    this._humanInputResponse = null;

    // Scoped PubSub channel for this execution (optional injection)
    this._pubSubChannel = options.pubsub || PubSub.getChannel(this.executionId);
  }

  // Vision/context capabilities
  supportsVision() {
    return this._supportsVision;
  }

  isLimitedContextMode() {
    return this._limitedContextMode;
  }

  getMaxTokens() {
    return this._maxTokens;
  }

  // Chat mode
  setChatMode(enabled) {
    this._chatMode = enabled;
  }

  isChatMode() {
    return this._chatMode;
  }

  // Tab selection
  setSelectedTabIds(tabIds) {
    this.selectedTabIds = tabIds;
    if (this.browserContext) {
      this.browserContext.setSelectedTabIds(tabIds);
    }
  }

  getSelectedTabIds() {
    return this.selectedTabIds;
  }

  // Abort handling
  cancelExecution(isUserInitiated = false) {
    this.userInitiatedCancel = isUserInitiated;
    this.abortController.abort();
  }

  isUserCancellation() {
    return this.userInitiatedCancel && this.abortSignal.aborted;
  }

  shouldAbort() {
    return this.abortSignal.aborted;
  }

  resetAbortController() {
    this.userInitiatedCancel = false;
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
  }

  // Execution state
  startExecution(tabId) {
    this._isExecuting = true;
    this._lockedTabId = tabId;
    if (this.browserContext) {
      this.browserContext.lockToTab(tabId);
    }
  }

  endExecution() {
    this._isExecuting = false;
    if (this.browserContext) {
      this.browserContext.unlockTab();
    }
    if (this._glowService && typeof this._glowService.stopAllGlows === 'function') {
      this._glowService.stopAllGlows().catch((error) => {
        Logging.log('ExecutionContext', `Failed to stop glow animations: ${error.message}`, 'warning');
      });
    }
  }

  isExecuting() {
    return this._isExecuting;
  }

  getLockedTabId() {
    return this._lockedTabId;
  }

  // Task management
  setCurrentTask(task) {
    this._currentTask = task;
    this._taskNumber += 1;
  }

  getCurrentTask() {
    return this._currentTask;
  }

  getCurrentTaskNumber() {
    return this._taskNumber;
  }

  setTodoList(todos) {
    this._todoList = todos;
  }

  getTodoList() {
    return this._todoList;
  }

  // Metrics
  getExecutionMetrics() {
    return { ...this._executionMetrics };
  }

  setExecutionMetrics(metrics) {
    this._executionMetrics = metrics;
  }

  incrementMetric(metric) {
    if (this._executionMetrics[metric] !== undefined) {
      this._executionMetrics[metric] += 1;
    }
  }

  incrementToolUsageMetrics(toolName) {
    const current = this._executionMetrics.toolFrequency.get(toolName) || 0;
    this._executionMetrics.toolFrequency.set(toolName, current + 1);
  }

  // Reasoning (for planner agent)
  addReasoning(reasoning) {
    this._reasoningHistory.push(reasoning);
    if (this._reasoningHistory.length > 10) {
      this._reasoningHistory.shift();
    }
  }

  getReasoningHistory(count = 5) {
    return this._reasoningHistory.slice(-count);
  }

  // PubSub access (for planner, human input, UI streaming, etc.)
  getPubSub() {
    return this._pubSubChannel;
  }

  // Klavis API manager for MCP operations
  getKlavisAPIManager() {
    return KlavisAPIManager.getInstance();
  }

  getGlowService() {
    return this._glowService;
  }

  // Human input
  setHumanInputRequestId(requestId) {
    this._humanInputRequestId = requestId;
    this._humanInputResponse = null;
  }

  getHumanInputRequestId() {
    return this._humanInputRequestId;
  }

  setHumanInputResponse(response) {
    if (response.requestId === this._humanInputRequestId) {
      this._humanInputResponse = response;
    }
  }

  getHumanInputResponse() {
    return this._humanInputResponse;
  }

  clearHumanInputState() {
    this._humanInputRequestId = null;
    this._humanInputResponse = null;
  }

  // Reset
  reset() {
    this._isExecuting = false;
    this._lockedTabId = null;
    this.userInitiatedCancel = false;
    this._currentTask = null;
    this._todoList = '';
    this._reasoningHistory = [];
    this.todoStore.reset();
    this._executionMetrics = {
      toolCalls: 0,
      observations: 0,
      errors: 0,
      startTime: Date.now(),
      endTime: 0,
      toolFrequency: new Map()
    };
    this.clearHumanInputState();
  }

  // Simplified message history (for context)
  getSimplifiedMessageHistory(count = 5) {
    const messages = this.messageManager.getMessages();
    const recent = messages.slice(-count);
    return recent.map((msg) => {
      const role = msg.role || 'assistant';
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return `${role}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
    });
  }
}

module.exports = {
  ExecutionContext
};
