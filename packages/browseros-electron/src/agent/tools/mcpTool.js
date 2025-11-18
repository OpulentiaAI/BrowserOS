/**
 * MCPTool - Interact with installed MCP servers at runtime (Electron).
 *
 * JS adaptation of BrowserOS MCPTool using the Klavis API.
 */

const { toolSuccess, toolError } = require('../ToolInterface');
const { KlavisAPIManager } = require('../mcp/KlavisAPIManager');
const { MCP_SERVERS } = require('../mcpServers');

function createMCPTool(context) {
  return {
    name: 'mcp_tool',
    description: `Interact with installed MCP servers (Gmail, GitHub, Slack, etc.).\n\nActions:\n- getUserInstances: Get all installed MCP servers with their instance IDs\n- listTools: List available tools for a server (requires instanceId)\n- callTool: Execute a tool on a server (requires instanceId, toolName, toolArgs)`,
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['getUserInstances', 'listTools', 'callTool'],
          description: 'The action to perform'
        },
        instanceId: {
          type: 'string',
          description: 'Instance ID for listTools and callTool'
        },
        toolName: {
          type: 'string',
          description: 'Tool name for callTool'
        },
        toolArgs: {
          description: 'Arguments for callTool; may be JSON string or object'
        }
      },
      required: ['action']
    },
    execute: async ({ action, instanceId, toolName, toolArgs }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('mcp_tool');

        const manager = context.getKlavisAPIManager();

        switch (action) {
          case 'getUserInstances': {
            const instances = await manager.getInstalledServers();

            if (!instances || instances.length === 0) {
              return toolSuccess(JSON.stringify({
                instances: [],
                message: 'No MCP servers installed or available for this user.'
              }));
            }

            const formatted = instances.map((instance) => ({
              id: instance.id,
              name: instance.name,
              authenticated: !!instance.isAuthenticated,
              authNeeded: !!instance.authNeeded,
              toolCount: instance.tools ? instance.tools.length : 0
            }));

            return toolSuccess(JSON.stringify({
              instances: formatted,
              count: formatted.length
            }));
          }

          case 'listTools': {
            if (!instanceId) {
              return toolError('instanceId is required for listTools action');
            }

            const instances = await manager.getInstalledServers();
            const instance = instances.find((i) => i.id === instanceId);
            if (!instance) {
              return toolError(`Instance ${instanceId} not found. Please run getUserInstances first.`);
            }

            const subdomain = getSubdomainFromName(instance.name);
            const tools = await manager.client.listTools(instanceId, subdomain);

            if (!tools || tools.length === 0) {
              return toolSuccess(JSON.stringify({
                tools: [],
                message: 'No tools available for this server'
              }));
            }

            return toolSuccess(JSON.stringify({
              tools,
              count: tools.length,
              instanceId
            }));
          }

          case 'callTool': {
            if (!instanceId) {
              return toolError('instanceId is required for callTool action');
            }
            if (!toolName) {
              return toolError('toolName is required for callTool action');
            }

            const instances = await manager.getInstalledServers();
            const instance = instances.find((i) => i.id === instanceId);
            if (!instance) {
              return toolError(`Instance ${instanceId} not found. Please run getUserInstances first.`);
            }

            // Parse toolArgs if it is a string
            let parsedArgs = toolArgs;
            if (typeof toolArgs === 'string') {
              try {
                parsedArgs = JSON.parse(toolArgs);
              } catch (e) {
                // Use as-is if parsing fails
                parsedArgs = toolArgs;
              }
            }

            const subdomain = getSubdomainFromName(instance.name);
            const result = await manager.client.callTool(instanceId, subdomain, toolName, parsedArgs || {});

            if (!result || !result.success) {
              const errorMessage = (result && result.error) || 'Tool execution failed';
              return toolError(errorMessage);
            }

            const output = {
              success: true,
              toolName,
              result: (result.result && result.result.content) || result.result,
              instanceId
            };

            return toolSuccess(JSON.stringify(output));
          }

          default:
            return toolError(`Unknown action: ${action}`);
        }
      } catch (error) {
        context.incrementMetric('errors');
        const message = error && error.message ? error.message : 'MCP operation failed';
        return toolError(message);
      }
    }
  };
}

function getSubdomainFromName(instanceName) {
  const config = MCP_SERVERS.find((s) => s.name === instanceName);
  if (config && config.subdomain) {
    return config.subdomain;
  }
  return instanceName.toLowerCase().replace(/\s+/g, '');
}

module.exports = {
  createMCPTool
};
