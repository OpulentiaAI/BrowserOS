class PubSubChannel {
  constructor(executionId) {
    this.executionId = executionId;
    this.subscribers = new Set();
    this.messageBuffer = [];
    this.MAX_BUFFER_SIZE = 200;
    this.isDestroyed = false;
  }

  _publish(event) {
    if (this.isDestroyed) return;

    this.messageBuffer.push(event);
    if (this.messageBuffer.length > this.MAX_BUFFER_SIZE) {
      this.messageBuffer = this.messageBuffer.slice(-this.MAX_BUFFER_SIZE);
    }

    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        // Ignore subscriber errors in this lightweight implementation
        console.error(`PubSubChannel[${this.executionId}]: Subscriber error`, error);
      }
    });
  }

  publishMessage(message) {
    const event = {
      type: 'message',
      payload: message
    };
    this._publish(event);
  }

  publishHumanInputRequest(request) {
    const event = {
      type: 'human-input-request',
      payload: request
    };
    this._publish(event);
  }

  publishHumanInputResponse(response) {
    const event = {
      type: 'human-input-response',
      payload: response
    };
    this._publish(event);
  }

  publishTeachModeEvent(payload) {
    const event = {
      type: 'teach-mode-event',
      payload
    };
    this._publish(event);
  }

  subscribe(callback) {
    if (this.isDestroyed) {
      return {
        unsubscribe: () => {}
      };
    }

    this.subscribers.add(callback);

    this.messageBuffer.forEach((event) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`PubSubChannel[${this.executionId}]: Error replaying buffered event`, error);
      }
    });

    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);
      }
    };
  }

  getBuffer() {
    return [...this.messageBuffer];
  }

  clearBuffer() {
    this.messageBuffer = [];
  }

  getStats() {
    return {
      executionId: this.executionId,
      subscribers: this.subscribers.size,
      bufferSize: this.messageBuffer.length,
      isActive: !this.isDestroyed
    };
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.subscribers.clear();
    this.messageBuffer = [];
    this.isDestroyed = true;
  }

  static generateId(prefix = 'msg') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  static createMessage(content, role = 'thinking') {
    return {
      msgId: PubSubChannel.generateId(`msg_${role}`),
      content,
      role,
      ts: Date.now()
    };
  }

  static createMessageWithId(msgId, content, role = 'thinking') {
    return {
      msgId,
      content,
      role,
      ts: Date.now()
    };
  }
}

module.exports = {
  PubSubChannel
};
