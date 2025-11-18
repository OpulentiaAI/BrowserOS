const { ElectronBrowserAgent } = require('./agents/ElectronBrowserAgent');
const { ElectronLocalAgent } = require('./agents/ElectronLocalAgent');
const { ElectronTeachAgent } = require('./agents/ElectronTeachAgent');
const { ElectronChatAgent } = require('./agents/ElectronChatAgent');

class AgentOrchestrator {
  constructor(options = {}) {
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
  }

  selectAgent(mode, executionContext, agentOptions = {}) {
    const normalized = (mode || 'browse').toLowerCase();
    const baseOptions = { ...agentOptions, onEvent: this.onEvent };

    if (normalized === 'chat') {
      return new ElectronChatAgent(executionContext, baseOptions);
    }

    if (normalized === 'teach') {
      return new ElectronTeachAgent(executionContext, baseOptions);
    }

    if (normalized === 'local' || executionContext.isLimitedContextMode()) {
      return new ElectronLocalAgent(executionContext, baseOptions);
    }

    return new ElectronBrowserAgent(executionContext, baseOptions);
  }

  async run({ mode = 'browse', prompt, workflow, metadata, executionContext }) {
    const agent = this.selectAgent(mode, executionContext, metadata);

    const normalized = (mode || 'browse').toLowerCase();
    if (prompt && normalized !== 'teach' && normalized !== 'chat') {
      executionContext.messageManager.addHuman(prompt);
    }

    if (normalized === 'teach') {
      return agent.execute(workflow || prompt);
    }

    if (normalized === 'chat') {
      return agent.execute(prompt);
    }

    return agent.execute(prompt);
  }
}

module.exports = {
  AgentOrchestrator
};
