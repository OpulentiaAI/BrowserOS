const { ElectronBrowserAgent } = require('./ElectronBrowserAgent');

class ElectronLocalAgent extends ElectronBrowserAgent {
  constructor(executionContext, options = {}) {
    super(executionContext, {
      ...options,
      maxIterations: options.maxIterations || 6,
      maxRetries: options.maxRetries || 2
    });
  }

  buildSystemPrompt(task, actions) {
    const base = super.buildSystemPrompt(task, actions);
    return `${base}

Additional instructions:
- Keep tool usage minimal due to limited context.
- Prefer direct actions over exploratory steps.`;
  }
}

module.exports = {
  ElectronLocalAgent
};
