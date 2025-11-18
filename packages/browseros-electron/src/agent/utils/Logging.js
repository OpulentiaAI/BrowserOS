const EventEmitter = require('events');

class Logging {
  // Enable verbose logs automatically in dev unless explicitly disabled
  static debugMode = process.env.BROWSEROS_DEBUG === 'true' || process.env.NODE_ENV === 'development';
  static emitter = new EventEmitter();
  static initialized = false;

  static initialize(options = {}) {
    if (this.initialized) {
      return;
    }
    if (typeof options.debugMode === 'boolean') {
      this.debugMode = options.debugMode;
    }
    this.initialized = true;
  }

  static on(eventName, listener) {
    this.emitter.on(eventName, listener);
  }

  static off(eventName, listener) {
    this.emitter.off(eventName, listener);
  }

  static log(source, message, level = 'info') {
    if (!this.debugMode && level === 'info') {
      return;
    }

    const prefix = `[${source}]`;
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warning':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }

    const payload = {
      source,
      message,
      level,
      timestamp: new Date().toISOString()
    };

    this.emitter.emit('log', payload);
  }

  static async logMetric(eventName, properties = {}, sampling = 1.0) {
    if (Math.random() > sampling) {
      return;
    }

    const payload = {
      event: `agent.${eventName}`,
      properties,
      timestamp: Date.now()
    };

    if (this.debugMode) {
      console.log(`[Metrics] ${payload.event}`, properties);
    }

    this.emitter.emit('metric', payload);
  }
}

module.exports = {
  Logging
};
