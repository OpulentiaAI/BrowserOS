const { PubSubChannel } = require('./PubSubChannel');

class PubSub {
  static channels = new Map();
  static cleanupTimers = new Map();
  static CHANNEL_CLEANUP_TIMEOUT = 10 * 60 * 1000;

  static getChannel(executionId) {
    let channel = PubSub.channels.get(executionId);
    if (channel) {
      PubSub.clearCleanupTimer(executionId);
      return channel;
    }

    channel = new PubSubChannel(executionId);
    PubSub.channels.set(executionId, channel);
    return channel;
  }

  static deleteChannel(executionId, immediate = false) {
    if (immediate) {
      PubSub.performChannelCleanup(executionId);
    } else {
      PubSub.scheduleCleanup(executionId);
    }
  }

  static performChannelCleanup(executionId) {
    const channel = PubSub.channels.get(executionId);
    if (!channel) return;

    channel.destroy();
    PubSub.channels.delete(executionId);
    PubSub.clearCleanupTimer(executionId);
  }

  static scheduleCleanup(executionId) {
    PubSub.clearCleanupTimer(executionId);

    const timer = setTimeout(() => {
      PubSub.performChannelCleanup(executionId);
    }, PubSub.CHANNEL_CLEANUP_TIMEOUT);

    PubSub.cleanupTimers.set(executionId, timer);
  }

  static clearCleanupTimer(executionId) {
    const timer = PubSub.cleanupTimers.get(executionId);
    if (timer) {
      clearTimeout(timer);
      PubSub.cleanupTimers.delete(executionId);
    }
  }

  static hasChannel(executionId) {
    return PubSub.channels.has(executionId);
  }

  static getActiveChannelIds() {
    return Array.from(PubSub.channels.keys());
  }

  static getStats() {
    return {
      totalChannels: PubSub.channels.size,
      channelIds: Array.from(PubSub.channels.keys()),
      pendingCleanups: PubSub.cleanupTimers.size
    };
  }

  static deleteAllChannels() {
    for (const timer of PubSub.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    PubSub.cleanupTimers.clear();

    for (const [, channel] of PubSub.channels) {
      channel.destroy();
    }
    PubSub.channels.clear();
  }

  static generateId(prefix = 'msg') {
    return PubSubChannel.generateId(prefix);
  }

  static createMessage(content, role = 'thinking') {
    return PubSubChannel.createMessage(content, role);
  }

  static createMessageWithId(msgId, content, role = 'thinking') {
    return PubSubChannel.createMessageWithId(msgId, content, role);
  }
}

module.exports = {
  PubSub
};
