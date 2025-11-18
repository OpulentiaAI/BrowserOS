const EventEmitter = require('events');
const { Logging } = require('../utils/Logging');

const GLOW_ENABLED_TOOLS = new Set([
  'click',
  'type',
  'clear',
  'visual_click',
  'visual_type',
  'scroll',
  'navigate',
  'key',
  'tab_open',
  'tab_focus',
  'tab_close',
  'extract',
  'click_at_coordinates',
  'type_at_coordinates'
]);

class GlowAnimationService {
  constructor() {
    this.activeTabs = new Set();
    this.emitter = new EventEmitter();
  }

  static getInstance() {
    if (!GlowAnimationService.instance) {
      GlowAnimationService.instance = new GlowAnimationService();
    }
    return GlowAnimationService.instance;
  }

  on(eventName, listener) {
    this.emitter.on(eventName, listener);
  }

  off(eventName, listener) {
    this.emitter.off(eventName, listener);
  }

  async startGlow(tabId, metadata = {}) {
    if (tabId === undefined || tabId === null) {
      return;
    }
    if (this.activeTabs.has(tabId)) {
      return;
    }
    this.activeTabs.add(tabId);
    Logging.log('GlowAnimationService', `Started glow on tab ${tabId}`);
    this.emitter.emit('glow:start', {
      tabId,
      ...metadata
    });
  }

  async stopGlow(tabId, metadata = {}) {
    if (tabId === undefined || tabId === null) {
      return;
    }
    if (!this.activeTabs.has(tabId)) {
      return;
    }
    this.activeTabs.delete(tabId);
    Logging.log('GlowAnimationService', `Stopped glow on tab ${tabId}`);
    this.emitter.emit('glow:stop', {
      tabId,
      ...metadata
    });
  }

  async stopAllGlows() {
    if (this.activeTabs.size === 0) {
      return;
    }
    for (const tabId of Array.from(this.activeTabs)) {
      await this.stopGlow(tabId);
    }
  }

  isGlowActive(tabId) {
    return this.activeTabs.has(tabId);
  }

  getAllActiveGlows() {
    return Array.from(this.activeTabs);
  }

  handleTabClosed(tabId, metadata = {}) {
    if (this.activeTabs.delete(tabId)) {
      Logging.log('GlowAnimationService', `Cleaned up glow for closed tab ${tabId}`);
      this.emitter.emit('glow:stop', {
        tabId,
        reason: 'tab-closed',
        ...metadata
      });
    }
  }
}

GlowAnimationService.instance = null;

module.exports = {
  GlowAnimationService,
  GLOW_ENABLED_TOOLS
};
