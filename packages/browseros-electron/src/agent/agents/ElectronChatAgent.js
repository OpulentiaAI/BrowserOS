const { BaseAgent } = require('./BaseAgent');

class ElectronChatAgent extends BaseAgent {
  async execute(prompt) {
    await this.initialize();
    if (prompt) {
      this.getExecutionContext().messageManager.addHuman(prompt);
    }

    const result = await this.runExecutor({
      systemPrompt: this.buildSystemPrompt(),
      maxSteps: this.options.maxSteps || 6
    });

    const text = result.fullText || '';
    this.publishAssistant(text);

    const usage = result.usage && typeof result.usage.then === 'function'
      ? await result.usage
      : result.usage;

    return { success: true, text, usage };
  }

  buildSystemPrompt() {
    return `You are a helpful chat assistant embedded inside Opulent Browser.
- Answer conversationally.
- Use tools only when needed (navigate, extract, screenshot, etc.).
- Call the done tool when the user request is complete.`;
  }
}

module.exports = {
  ElectronChatAgent
};
