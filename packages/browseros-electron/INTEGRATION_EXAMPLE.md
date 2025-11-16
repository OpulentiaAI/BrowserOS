# Integration Example: Using the Ported Tool System

This document shows how to integrate the newly ported runtime infrastructure and tools with the existing Electron application.

## Quick Start Integration

### 1. Update `src/main.js` - Agent Task Handler

Replace the existing `run-agent-task` IPC handler with the new tool system:

```javascript
// At the top of main.js, add imports
const { ExecutionContext } = require('./agent/ExecutionContext');
const { BrowserContext } = require('./agent/BrowserContext');
const { ToolManager } = require('./agent/ToolManager');
const { createAllTools } = require('./agent/tools');

// Replace the run-agent-task handler
ipcMain.handle('run-agent-task', async (event, { prompt, currentUrl }) => {
  try {
    // Create browser automation context (tab-aware)
    const browserAutomation = {
      navigate: async (url) => {
        if (!activeTab) return;
        await activeTab.view.webContents.loadURL(url);
      },
      click: async (selector) => {
        if (!activeTab) return;
        await activeTab.view.webContents.executeJavaScript(`
          document.querySelector('${selector}')?.click();
        `);
      },
      type: async (selector, text) => {
        if (!activeTab) return;
        await activeTab.view.webContents.executeJavaScript(`
          const el = document.querySelector('${selector}');
          if (el) { el.value = '${text}'; el.dispatchEvent(new Event('input', { bubbles: true })); }
        `);
      },
      screenshot: async () => {
        if (!activeTab) return null;
        const image = await activeTab.view.webContents.capturePage();
        return image.toDataURL();
      },
      executeScript: async (script) => {
        if (!activeTab) return null;
        return await activeTab.view.webContents.executeJavaScript(script);
      },
      // Tab management
      getTabs: async () => {
        return Array.from(tabs.values()).map(tab => ({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          active: tab.id === activeTab?.id
        }));
      },
      createTab: async (url) => {
        const newTab = await createTab(url);
        return { id: newTab.id, url };
      },
      focusTab: async (tabId) => {
        await switchToTab(tabId);
      },
      closeTab: async (tabId) => {
        await closeTab(tabId);
      },
      getActiveTab: () => {
        return activeTab ? { id: activeTab.id } : null;
      }
    };

    // Create execution context with full runtime infrastructure
    const browserContext = new BrowserContext(browserAutomation);
    const executionContext = new ExecutionContext({
      executionId: `task_${Date.now()}`,
      browserContext,
      supportsVision: true,
      maxTokens: 128000
    });

    // Create tool manager and register all tools
    const toolManager = new ToolManager(executionContext);
    const tools = createAllTools(executionContext);
    toolManager.registerMultiple(tools);

    // Set current task
    executionContext.setCurrentTask(prompt);

    // Start execution (locks to active tab)
    if (activeTab) {
      executionContext.startExecution(activeTab.id);
    }

    // Convert tools to AI SDK format
    const aiTools = toolManager.toAISDKFormat();

    // TODO: Replace this with actual AI SDK integration
    // For now, return available tools info
    const response = {
      message: `Agent initialized with ${toolManager.count()} tools`,
      tools: toolManager.getNames(),
      metrics: executionContext.getExecutionMetrics()
    };

    // End execution
    executionContext.endExecution();

    return response;

  } catch (error) {
    console.error('Agent task error:', error);
    return {
      error: error.message
    };
  }
});
```

### 2. Simple Tool Execution Example

Here's how to execute a single tool:

```javascript
// Example: Navigate to a URL
const { ExecutionContext } = require('./agent/ExecutionContext');
const { BrowserContext } = require('./agent/BrowserContext');
const { createNavigateTool } = require('./agent/tools/navigate');

async function navigateExample() {
  const browserContext = new BrowserContext(browserAutomation);
  const executionContext = new ExecutionContext({ browserContext });
  
  const navigateTool = createNavigateTool(executionContext);
  const result = await navigateTool.execute({ url: 'https://www.google.com' });
  
  console.log(result); // { ok: true, output: "Successfully navigated to..." }
}
```

### 3. Multi-Tool Workflow Example

Here's how to coordinate multiple tools:

```javascript
const { ExecutionContext } = require('./agent/ExecutionContext');
const { BrowserContext } = require('./agent/BrowserContext');
const { ToolManager } = require('./agent/ToolManager');
const { createEssentialTools } = require('./agent/tools');

async function multiToolWorkflow() {
  // Setup
  const browserContext = new BrowserContext(browserAutomation);
  const executionContext = new ExecutionContext({ browserContext });
  const toolManager = new ToolManager(executionContext);
  
  // Register essential tools
  const tools = createEssentialTools(executionContext);
  toolManager.registerMultiple(tools);
  
  // Execute workflow
  const navigate = toolManager.get('navigate');
  const screenshot = toolManager.get('screenshot');
  const click = toolManager.get('click');
  const done = toolManager.get('done');
  
  // Navigate
  await navigate.execute({ url: 'https://example.com' });
  
  // Take screenshot
  await screenshot.execute({ size: 'medium' });
  
  // Click something
  await click.execute({ selector: '#submit-button' });
  
  // Mark done
  await done.execute({ success: true, message: 'Workflow completed' });
  
  // Check metrics
  const metrics = executionContext.getExecutionMetrics();
  console.log(`Tool calls: ${metrics.toolCalls}`);
  console.log(`Errors: ${metrics.errors}`);
}
```

### 4. TODO List Example

Here's how to use the TODO tools for multi-step tasks:

```javascript
const { createTodoSetTool, createTodoGetTool } = require('./agent/tools');

async function todoExample(executionContext) {
  const todoSet = createTodoSetTool(executionContext);
  const todoGet = createTodoGetTool(executionContext);
  
  // Set TODO list
  const todos = `
- [ ] Navigate to website
- [ ] Search for product
- [ ] Add to cart
- [ ] Checkout
  `.trim();
  
  await todoSet.execute({ todos });
  
  // Get current TODOs
  const result = await todoGet.execute({ format: 'json' });
  console.log(result.output);
  
  // Mark first TODO as done
  const firstTodo = executionContext.todoStore.getAll()[0];
  executionContext.todoStore.markDoing(firstTodo.id);
  executionContext.todoStore.complete(firstTodo.id);
  
  // Check progress
  const pending = executionContext.todoStore.getPending();
  console.log(`${pending.length} TODOs remaining`);
}
```

### 5. Tab Management Example

Here's how to use tab management tools:

```javascript
const { createTabsTool, createTabOpenTool, createTabFocusTool } = require('./agent/tools');

async function tabExample(executionContext) {
  const tabs = createTabsTool(executionContext);
  const tabOpen = createTabOpenTool(executionContext);
  const tabFocus = createTabFocusTool(executionContext);
  
  // List all tabs
  const tabList = await tabs.execute({});
  console.log('Current tabs:', JSON.parse(tabList.output));
  
  // Open new tab
  const newTab = await tabOpen.execute({ url: 'https://github.com' });
  const tabInfo = JSON.parse(newTab.output);
  
  // Switch to new tab
  await tabFocus.execute({ tabId: tabInfo.tabId });
}
```

### 6. Human Input Example

Here's how to request human intervention:

```javascript
const { createHumanInputTool } = require('./agent/tools/humanInput');

async function humanInputExample(executionContext) {
  const humanInput = createHumanInputTool(executionContext);
  
  const result = await humanInput.execute({
    prompt: 'Please enter your login credentials'
  });
  
  const response = JSON.parse(result.output);
  
  if (response.requiresHumanInput) {
    // Send request to UI via IPC
    mainWindow.webContents.send('human-input-request', {
      requestId: response.requestId,
      prompt: response.prompt
    });
    
    // Wait for response (would need IPC handler for this)
    // const userResponse = await waitForHumanResponse(response.requestId);
  }
}
```

## AI SDK 6 Integration (Next Step)

Here's the skeleton for full AI SDK integration:

```javascript
const { anthropic } = require('@ai-sdk/anthropic');
const { generateText } = require('ai');

async function runAgentWithAI(executionContext, toolManager, prompt) {
  // Get AI SDK compatible tools
  const aiTools = toolManager.toAISDKFormat();
  
  // Create model
  const model = anthropic('claude-3-5-sonnet-20241022');
  
  // Get message history
  const messages = executionContext.messageManager.getMessages();
  
  // Add user prompt
  executionContext.messageManager.addHuman(prompt);
  
  // Generate with tools
  const result = await generateText({
    model,
    messages: executionContext.messageManager.getMessages(),
    tools: aiTools,
    maxSteps: 20,
    system: 'You are a helpful browser automation agent...'
  });
  
  // Add AI response to message history
  executionContext.messageManager.addAI(result.text);
  
  return result;
}
```

## Message Flow Between Components

```
User Input (Renderer)
    ↓
IPC: run-agent-task
    ↓
Main Process Handler
    ↓
ExecutionContext Creation
    ├─ BrowserContext (tab management)
    ├─ MessageManager (conversation)
    ├─ TodoStore (task decomposition)
    └─ ToolManager (tool registry)
    ↓
AI SDK Integration
    ├─ Convert tools to AI SDK format
    ├─ Execute generateText with tools
    └─ Handle tool calls
    ↓
Tool Execution
    ├─ Update metrics
    ├─ Interact with browser
    └─ Return structured results
    ↓
Response to Renderer
    ↓
UI Update
```

## Metrics and Debugging

Access execution metrics at any time:

```javascript
const metrics = executionContext.getExecutionMetrics();

console.log('Execution Metrics:', {
  toolCalls: metrics.toolCalls,
  observations: metrics.observations,
  errors: metrics.errors,
  duration: metrics.endTime - metrics.startTime,
  toolFrequency: Object.fromEntries(metrics.toolFrequency)
});

// Per-tool usage
for (const [toolName, count] of metrics.toolFrequency) {
  console.log(`${toolName}: ${count} calls`);
}
```

## Error Handling

All tools use the standardized error format:

```javascript
const result = await tool.execute(args);

if (!result.ok) {
  console.error('Tool failed:', result.output);
  // Handle error
} else {
  console.log('Tool succeeded:', result.output);
  // Process result
}
```

## Next Steps

1. **AI SDK Integration**: Implement full AI SDK 6 integration with streaming
2. **Agent Classes**: Port ChatAgent, LocalAgent, BrowserAgent
3. **UI Updates**: Show TODO list, metrics, and execution status in sidebar
4. **Human Input Flow**: Implement IPC for human input requests/responses
5. **Streaming**: Add streaming support for real-time AI responses

## File Checklist

✅ Runtime Infrastructure:
- `src/agent/ExecutionContext.js`
- `src/agent/MessageManager.js`
- `src/agent/TodoStore.js`
- `src/agent/ToolManager.js`
- `src/agent/ToolInterface.js`
- `src/agent/BrowserContext.js`

✅ Tools (19 total):
- All tools in `src/agent/tools/`
- Main index at `src/agent/tools/index.js`

⏳ TODO:
- Update `src/main.js` with new handler
- Add AI SDK integration
- Port agent classes
- Add streaming support
- Update sidebar UI
