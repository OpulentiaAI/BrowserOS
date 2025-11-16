# Tools Port Status

## ✅ All Tools Ported (19 tools)

All essential tools from BrowserOS agent have been successfully ported to the Electron environment with AI SDK 6 compatibility.

## Tool Categories

### 🌐 Essential Browser Actions (10 tools)

#### 1. **navigate** (`src/agent/tools/navigate.js`)
- Navigate to a URL
- Parameters: `url` (string, required)
- Returns: Success confirmation with URL

#### 2. **click** (`src/agent/tools/click.js`)
- Click an element by selector or nodeId
- Parameters: `selector` (string) OR `nodeId` (number)
- Returns: Success confirmation with element identifier

#### 3. **type** (`src/agent/tools/type.js`)
- Type text into an input element
- Parameters: `text` (string, required), `selector` OR `nodeId`
- Returns: Success confirmation with typed text

#### 4. **screenshot** (`src/agent/tools/screenshot.js`)
- Capture page screenshot with size options
- Parameters: `size` (enum: small/medium/large, default: medium)
- Returns: Screenshot data URL + metadata
- Features:
  - Token-aware sizing (auto-adjusts for low-token models)
  - Adds screenshot to message history automatically
  - Minimum 64k tokens required

#### 5. **extract** (`src/agent/tools/extract.js`)
- Extract text content from page elements
- Parameters: `selector` (string, required), `attribute` (string, optional)
- Returns: Extracted text or attribute value

#### 6. **done** (`src/agent/tools/done.js`)
- Mark task as complete
- Parameters: `success` (boolean, required), `message` (string, optional)
- Returns: Completion status

#### 7. **wait** (`src/agent/tools/wait.js`)
- Wait for page to stabilize
- Parameters: `seconds` (number, default: 2)
- Returns: Wait confirmation

#### 8. **scroll** (`src/agent/tools/scroll.js`)
- Scroll to element or scroll page
- Parameters: `nodeId` (number) OR `direction` (up/down) + `amount` (number, default: 1)
- Returns: Scroll confirmation with status

#### 9. **key** (`src/agent/tools/key.js`)
- Press keyboard keys
- Parameters: `key` (string, required), `count` (number, default: 1)
- Returns: Key press confirmation

#### 10. **clear** (`src/agent/tools/clear.js`)
- Clear text from input element
- Parameters: `selector` OR `nodeId`
- Returns: Clear confirmation

### 📑 Tab Management (4 tools)

#### 11. **tabs** (`src/agent/tools/tabs.js`)
- List all browser tabs
- Parameters: None
- Returns: Array of tab objects with id, title, url, active status

#### 12. **tab_open** (`src/agent/tools/tabOpen.js`)
- Open new browser tab
- Parameters: `url` (string, optional, defaults to Google)
- Returns: New tab ID and URL

#### 13. **tab_focus** (`src/agent/tools/tabFocus.js`)
- Switch to specific tab
- Parameters: `tabId` (string, required)
- Returns: Focus confirmation

#### 14. **tab_close** (`src/agent/tools/tabClose.js`)
- Close specific tab
- Parameters: `tabId` (string, required)
- Returns: Close confirmation

### 📝 TODO/Planning (2 tools)

#### 15. **todo_set** (`src/agent/tools/todoSet.js`)
- Set or update TODO list
- Parameters: `todos` (string, markdown format)
- Returns: TODO count confirmation
- Features:
  - Parses markdown checkboxes (- [ ] / - [x])
  - Automatically syncs with TodoStore
  - Updates execution context

#### 16. **todo_get** (`src/agent/tools/todoGet.js`)
- Get current TODO list
- Parameters: `format` (enum: xml/json/markdown, default: json)
- Returns: TODO list in requested format

### 🎯 Advanced Tools (3 tools)

#### 17. **human_input** (`src/agent/tools/humanInput.js`)
- Request human intervention
- Parameters: `prompt` (string, required)
- Returns: Request ID and special `requiresHumanInput` flag
- Use cases:
  - Manual credential entry
  - CAPTCHA solving
  - Human judgment required
  - Risky action confirmation

#### 18. **visual_click** (`src/agent/tools/visualClick.js`)
- Click elements by visual description using Moondream API
- Parameters: `instruction` (string, description of element)
- Returns: Click coordinates and success status
- Requires: `MOONDREAM_API_KEY` environment variable
- Examples: "blue submit button", "search icon", "close button in modal"

#### 19. **visual_type** (`src/agent/tools/visualType.js`)
- Type into input fields by visual description using Moondream API
- Parameters: `instruction` (string, description), `text` (string, content)
- Returns: Type coordinates and success status
- Requires: `MOONDREAM_API_KEY` environment variable
- Examples: "search box", "email field", "password input"

## Tool Output Format

All tools use the standardized `ToolInterface` format:

```javascript
// Success
{
  ok: true,
  output: "Success message or data"
}

// Error
{
  ok: false,
  output: "Error message"
}
```

Helper functions available:
- `toolSuccess(message)` - Returns success output
- `toolError(message)` - Returns error output

## Integration with Runtime

### Tool Creation Pattern

Each tool is created as a function that accepts an `ExecutionContext`:

```javascript
function createNavigateTool(context) {
  return {
    name: 'navigate',
    description: 'Navigate to a URL',
    parameters: { /* JSON Schema */ },
    execute: async (args) => {
      // Tool implementation
      context.incrementMetric('toolCalls');
      context.incrementToolUsageMetrics('navigate');
      // ...
      return toolSuccess('Result');
    }
  };
}
```

### Registering Tools

Use the `ToolManager` to register tools:

```javascript
const { ExecutionContext } = require('./agent/ExecutionContext');
const { ToolManager } = require('./agent/ToolManager');
const { createAllTools } = require('./agent/tools');

// Create execution context
const context = new ExecutionContext({ browserContext });

// Create tool manager
const toolManager = new ToolManager(context);

// Register all tools
const tools = createAllTools(context);
toolManager.registerMultiple(tools);

// Or register selectively
const essentialTools = createEssentialTools(context);
toolManager.registerMultiple(essentialTools);
```

### AI SDK 6 Integration

Convert tools to AI SDK format:

```javascript
const aiTools = toolManager.toAISDKFormat();

// Use with AI SDK
const result = await generateText({
  model,
  messages,
  tools: aiTools,
  maxSteps: 20
});
```

## Batch Tool Creators

The `tools/index.js` exports several convenience functions:

### `createAllTools(context)`
Creates all 19 tools for full agent capability.

### `createEssentialTools(context)`
Creates only the 9 most essential browser action tools:
- navigate, click, type, screenshot, extract, done, wait, scroll, key

### `createTabTools(context)`
Creates only the 4 tab management tools:
- tabs, tab_open, tab_focus, tab_close

## Metrics Tracking

All tools automatically track:
- Total tool calls via `context.incrementMetric('toolCalls')`
- Per-tool usage via `context.incrementToolUsageMetrics(toolName)`
- Errors via `context.incrementMetric('errors')`

Access metrics:
```javascript
const metrics = context.getExecutionMetrics();
console.log(`Total tool calls: ${metrics.toolCalls}`);
console.log(`Navigate calls: ${metrics.toolFrequency.get('navigate')}`);
```

## Environment Variables

### Optional API Keys
- `MOONDREAM_API_KEY` - Required for visual_click and visual_type tools

## Feature Parity with Original BrowserOS Agent

✅ **Complete Feature Parity:**
- All tool signatures match original
- Same parameter validation
- Same error handling patterns
- Same output formats
- Metrics tracking preserved
- Token-aware screenshot sizing
- Human input coordination
- TODO list synchronization

## Next Steps

### 1. Integration with main.js
Update the `run-agent-task` IPC handler to use the new tool system:
```javascript
const { ExecutionContext } = require('./agent/ExecutionContext');
const { BrowserContext } = require('./agent/BrowserContext');
const { ToolManager } = require('./agent/ToolManager');
const { createAllTools } = require('./agent/tools');

// In run-agent-task handler
const browserContext = new BrowserContext(browserAutomation);
const executionContext = new ExecutionContext({ browserContext });
const toolManager = new ToolManager(executionContext);
toolManager.registerMultiple(createAllTools(executionContext));
```

### 2. Agent Classes
Port the agent classes that orchestrate tool usage:
- ChatAgent - Simple chat interaction
- LocalAgent - Local task execution
- BrowserAgent - Full browser automation
- TeachAgent - Learning mode
- PreprocessAgent - Task preprocessing

### 3. AI SDK Integration
Implement the full AI SDK 6 integration with:
- AISDKProvider for model management
- EnhancedToolOrchestrator for multi-step execution
- Streaming support for UI updates

## File Structure

```
src/agent/tools/
├── navigate.js          # Navigate to URL
├── click.js            # Click element
├── type.js             # Type text
├── screenshot.js       # Capture screenshot
├── extract.js          # Extract data
├── done.js             # Mark complete
├── wait.js             # Wait for stability
├── scroll.js           # Scroll page
├── key.js              # Press keys
├── clear.js            # Clear input
├── tabs.js             # List tabs
├── tabOpen.js          # Open tab
├── tabFocus.js         # Focus tab
├── tabClose.js         # Close tab
├── todoSet.js          # Set TODO list
├── todoGet.js          # Get TODO list
├── humanInput.js       # Request human help
├── visualClick.js      # Visual click (Moondream)
├── visualType.js       # Visual type (Moondream)
└── index.js            # Export all tools
```

---

**Status:** ✅ All tools ported and ready for integration
**Total Tools:** 19
**Next Phase:** Agent class porting + AI SDK integration
