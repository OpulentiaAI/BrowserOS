/**
 * ToolManager for Electron agents.
 * 
 * Simple registry that holds tool definitions and makes them available to
 * agents. Tools are stored as objects with { name, description, parameters, execute }.
 */

class ToolManager {
  constructor(executionContext) {
    this.tools = new Map();
    this.executionContext = executionContext;
  }

  /**
   * Register a tool
   * @param {{name: string, description: string, parameters: object, execute: function}} tool
   */
  register(tool) {
    if (!tool.name) {
      throw new Error('Tool must have a name');
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   * @param {Array} toolArray
   */
  registerMultiple(toolArray) {
    toolArray.forEach((tool) => this.register(tool));
  }

  /**
   * Get a tool by name
   * @param {string} name
   * @returns {object|undefined}
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   * @returns {Array<string>}
   */
  getNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool exists
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Get formatted tool descriptions for prompts
   * @returns {string}
   */
  getDescriptions() {
    const tools = this.getAll();
    if (tools.length === 0) {
      return 'No tools available.';
    }

    const descriptions = tools.map((tool) => {
      return `- ${tool.name}: ${tool.description}`;
    }).join('\n');

    return `Available tools:\n${descriptions}`;
  }

  /**
   * Convert tools to AI SDK format
   * @returns {object} - Object with tool names as keys
   */
  toAISDKFormat() {
    const aiTools = {};
    for (const [name, tool] of this.tools) {
      aiTools[name] = {
        description: tool.description,
        parameters: tool.parameters,
        execute: tool.execute
      };
    }
    return aiTools;
  }

  /**
   * Clear all tools
   */
  clear() {
    this.tools.clear();
  }

  /**
   * Get tool count
   * @returns {number}
   */
  count() {
    return this.tools.size;
  }
}

module.exports = {
  ToolManager
};
