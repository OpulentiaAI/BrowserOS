// Minimal Klavis API manager for Electron MCP integration

const { KlavisAPIClient } = require('./KlavisAPIClient');

const PLATFORM_NAME = 'Nxtscape';

class KlavisAPIManager {
  constructor() {
    const apiKey = process.env.KLAVIS_API_KEY;
    if (!apiKey) {
      console.warn('KLAVIS_API_KEY not configured. MCP features will be disabled.');
    }
    this.client = new KlavisAPIClient(apiKey || '');
    this.userId = null;
  }

  static getInstance() {
    if (!KlavisAPIManager._instance) {
      KlavisAPIManager._instance = new KlavisAPIManager();
    }
    return KlavisAPIManager._instance;
  }

  async getUserId() {
    if (this.userId) return this.userId;

    // Allow override via environment variable
    if (process.env.KLAVIS_USER_ID) {
      this.userId = process.env.KLAVIS_USER_ID;
      return this.userId;
    }

    // Fallback: generate an ephemeral ID for this process
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    this.userId = `nxtscape_${timestamp}_${random}`;
    console.warn('Generated ephemeral KLAVIS user ID for this session:', this.userId);
    return this.userId;
  }

  async getInstalledServers() {
    const userId = await this.getUserId();
    return this.client.getUserInstances(userId, PLATFORM_NAME);
  }
}

KlavisAPIManager._instance = null;

module.exports = {
  KlavisAPIManager
};
