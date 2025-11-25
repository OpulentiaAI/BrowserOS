const { tool: aiSDKTool, jsonSchema } = require('ai');

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
      try {
        // Ensure we always provide a valid JSON schema for parameters.
        // Some tools don't specify parameters, so we default to an empty object schema.
        const rawParams = tool.parameters && typeof tool.parameters === 'object'
          ? tool.parameters
          : { type: 'object', properties: {} };

        // In AI SDK 6 Beta, tools expect a 'parameters' field which is a Zod schema or a JSON schema.
        // We provide the JSON schema directly.
        const wrappedParameters = {
          type: 'object',
          properties: rawParams.properties || {},
          additionalProperties: false
        };

        // Ensure required is an array if provided
        if (rawParams.required) {
          wrappedParameters.required = Array.isArray(rawParams.required) 
            ? rawParams.required 
            : Object.values(rawParams.required);
        }

        const schema = jsonSchema(wrappedParameters);

        // AI SDK 6 expects `inputSchema` on the tool object. The older `parameters`
        // field is still accepted by `tool()`, but the request builder looks for
        // `inputSchema`, and without it the provider receives a null schema (the
        // source of the "type: None" error from OpenAI). We set both to keep
        // compatibility.
        const aiTool = aiSDKTool({
          description: tool.description || `Tool: ${name}`,
          parameters: schema,
          execute: async (args) => {
            try {
              return await tool.execute(args);
            } catch (error) {
              console.error(`Tool ${name} execution error:`, error);
              return { ok: false, output: `Tool error: ${error.message}` };
            }
          }
        });

        // Explicitly expose inputSchema for the request serializer.
        aiTool.inputSchema = schema;

        aiTools[name] = aiTool;
      } catch (error) {
        console.error(`Failed to create AI SDK tool for ${name}:`, error);
      }
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
