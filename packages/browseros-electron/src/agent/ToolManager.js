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
    for (const tool of toolArray) {
      this.register(tool);
    }
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
      // Ensure we always provide a valid JSON schema for parameters.
      // Some tools don't specify parameters, so we default to an empty object schema.
      const rawParams = tool.parameters && typeof tool.parameters === 'object'
        ? tool.parameters
        : { type: 'object', properties: {} };

      // In AI SDK 6 Beta, schemas should be provided as pure JSON Schema objects.
      // Wrapping with jsonSchema() (used for Zod conversion) can strip the `type`,
      // resulting in invalid schemas (type: "None"). We pass the schema directly.
      const wrappedParameters = {
        type: 'object',
        properties: {},
        additionalProperties: false,
        ...rawParams
      };

      // Ensure required is an array if provided
      if (wrappedParameters.required && !Array.isArray(wrappedParameters.required)) {
        wrappedParameters.required = Object.values(wrappedParameters.required);
      }

      aiTools[name] = {
        description: tool.description,
        parameters: wrappedParameters,
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
