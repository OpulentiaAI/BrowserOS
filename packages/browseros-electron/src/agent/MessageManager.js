/**
 * Lightweight MessageManager for Electron agents.
 *
 * Works with AI SDK style messages `{ role, content }` instead of LangChain
 * classes. Tracks message history, rough token counts, and exposes queue
 * helpers so tools/agents can stage messages before flushing to history.
 */

const MessageType = {
  SYSTEM: 'system',
  AI: 'assistant',
  HUMAN: 'user',
  TOOL: 'tool',
  BROWSER_STATE: 'browser_state',
  TODO_LIST: 'todo_list',
  SCREENSHOT: 'screenshot'
};

function countTokens(message) {
  const content = typeof message.content === 'string'
    ? message.content
    : JSON.stringify(message.content ?? '');
  // Rough heuristic (~4 characters per token)
  return Math.max(1, Math.ceil(content.length / 4));
}

class MessageManagerReadOnly {
  constructor(messageManager) {
    this.messageManager = messageManager;
  }

  getAll() {
    return this.messageManager.getMessages();
  }

  getFiltered(excludeTypes = []) {
    if (!excludeTypes.length) {
      return this.getAll();
    }
    return this.getAll().filter((message) => {
      const messageType = this.messageManager._getMessageType(message);
      return !excludeTypes.includes(messageType);
    });
  }

  getFilteredAsString(excludeTypes = [], separator = '\n') {
    return this.getFiltered(excludeTypes)
      .map((message) => `${message.role || 'assistant'}: ${typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}`)
      .join(separator);
  }
}

class MessageManager {
  constructor(maxTokens = 8192) {
    this.maxTokens = maxTokens;
    this.entries = [];
    this.totalTokens = 0;
    this.messageQueue = [];
  }

  add(message, position) {
    const entry = {
      message,
      tokens: countTokens(message)
    };

    if (typeof position === 'number') {
      this.entries.splice(position, 0, entry);
    } else {
      this.entries.push(entry);
    }

    this.totalTokens += entry.tokens;
  }

  addHuman(content) {
    this.add({ role: MessageType.HUMAN, content });
  }

  addAI(content) {
    this.add({ role: MessageType.AI, content });
  }

  addSystem(content, position = 0) {
    this.add({ role: MessageType.SYSTEM, content }, position);
  }

  addBrowserState(content) {
    this.add({ role: MessageType.AI, content, metadata: { messageType: MessageType.BROWSER_STATE } });
  }

  addTodoList(content) {
    this.add({ role: MessageType.AI, content, metadata: { messageType: MessageType.TODO_LIST } });
  }

  addScreenshot(dataUrl, text = 'Screenshot of current page state') {
    this.add({
      role: MessageType.HUMAN,
      content: [
        { type: 'image', dataUrl },
        { type: 'text', text }
      ],
      metadata: { messageType: MessageType.SCREENSHOT }
    });
  }

  addTool(content, toolCallId) {
    this.add({ role: MessageType.TOOL, name: toolCallId, content });
  }

  addSystemReminder(content) {
    this.add({ role: MessageType.AI, content: `<system-reminder>${content}</system-reminder>` });
  }

  getMessages() {
    return this.entries.map((entry) => entry.message);
  }

  getTokenCount() {
    return this.totalTokens;
  }

  remaining() {
    return Math.max(0, this.maxTokens - this.totalTokens);
  }

  setMaxTokens(newMax) {
    this.maxTokens = newMax;
    while (this.totalTokens > this.maxTokens && this.entries.length) {
      const removed = this.entries.shift();
      if (removed) {
        this.totalTokens -= removed.tokens;
      }
    }
  }

  fork(includeHistory = true) {
    const clone = new MessageManager(this.maxTokens);
    if (includeHistory) {
      clone.entries = this.entries.map((entry) => ({ ...entry }));
      clone.totalTokens = this.totalTokens;
    }
    return clone;
  }

  removeMessagesByType(type) {
    const remaining = [];
    let removedTokens = 0;
    for (const entry of this.entries) {
      if (this._getMessageType(entry.message) === type) {
        removedTokens += entry.tokens;
      } else {
        remaining.push(entry);
      }
    }
    this.entries = remaining;
    this.totalTokens -= removedTokens;
  }

  removeSystemMessages() {
    this.removeMessagesByType(MessageType.SYSTEM);
  }

  clear() {
    this.entries = [];
    this.totalTokens = 0;
  }

  queueMessage(message) {
    this.messageQueue.push(message);
  }

  queueHuman(content) {
    this.queueMessage({ role: MessageType.HUMAN, content });
  }

  queueBrowserState(content) {
    this.queueMessage({ role: MessageType.AI, content, metadata: { messageType: MessageType.BROWSER_STATE } });
  }

  queueSystemReminder(content) {
    this.queueMessage({ role: MessageType.AI, content: `<system-reminder>${content}</system-reminder>` });
  }

  queueScreenshot(dataUrl, text = 'Screenshot of current page state') {
    this.queueMessage({
      role: MessageType.HUMAN,
      content: [
        { type: 'image', dataUrl },
        { type: 'text', text }
      ],
      metadata: { messageType: MessageType.SCREENSHOT }
    });
  }

  flushQueue() {
    for (const message of this.messageQueue) {
      this.add(message);
    }
    this.messageQueue = [];
  }

  clearQueue() {
    this.messageQueue = [];
  }

  _getMessageType(message) {
    if (message?.metadata?.messageType) {
      return message.metadata.messageType;
    }
    return message.role || MessageType.AI;
  }
}

module.exports = {
  MessageManager,
  MessageManagerReadOnly,
  MessageType
};
