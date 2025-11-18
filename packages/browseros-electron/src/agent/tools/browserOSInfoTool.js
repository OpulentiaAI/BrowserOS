const { toolSuccess, toolError } = require('../ToolInterface');

function createBrowserOSInfoTool() {
  const infoDatabase = {
    overview: `# Opulent Browser Overview

Opulent Browser is an AI-powered browser automation platform that enables intelligent web interaction through natural language commands.

## Key Features
- **AI-Driven Automation**: Uses LLM providers to understand and execute browser tasks
- **Multi-Tab Management**: Seamlessly work across multiple browser tabs
- **Real-Time Streaming**: See AI thinking and actions in real-time
- **Extensible Tool System**: Modular architecture with specialized tools for different tasks`,

    features: `# Opulent Browser Features

## AI-Powered Automation
- Natural language task understanding
- Dynamic planning and execution
- Error recovery and retries

## Browser Automation
- Click, type, navigate, and extract data
- Multi-tab support with context awareness
- Visual element detection

## Visual Intelligence
- Element detection via visual description
- Screenshot-based analysis`,

    troubleshooting: `# Opulent Browser Troubleshooting

- Verify API keys and network connectivity
- Check DevTools console for errors
- Review task logs for tool execution details
- Ensure browser is not blocked by security policies`
  };

  return {
    name: 'opulent_browser_info_tool',
    description:
      'Get high-level information about Opulent Browser features, overview, and troubleshooting tips.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: Object.keys(infoDatabase),
          description: 'Information topic to retrieve'
        }
      },
      required: ['topic']
    },
    execute: async ({ topic }) => {
      try {
        const content = infoDatabase[topic];
        if (!content) {
          return toolError(`No information available for topic: ${topic}`);
        }
        return toolSuccess(
          JSON.stringify({
            topic,
            content
          })
        );
      } catch (error) {
        return toolError(`Failed to retrieve Opulent Browser info: ${error.message}`);
      }
    }
  };
}

module.exports = { createBrowserOSInfoTool };
