# Runtime Infrastructure Port - Status

## ✅ Completed: Core Runtime Infrastructure

### Phase 1: Multi-Tab System (Complete)
- Tab registry in main.js with create/switch/close/list
- BrowserContext wrapper for Electron (@browseros-electron/src/agent/BrowserContext.js)
- ElectronPage class for per-tab operations
- IPC handlers for tab management
- Preload bridge exposing tab APIs

### Phase 2: Runtime Core (Complete)

#### 1. MessageManager (@browseros-electron/src/agent/MessageManager.js)
**Purpose:** Manages conversation history between agent and LLM

**Features:**
- AI SDK compatible (uses `{role, content}` format)
- Token counting with automatic trimming
- Message queue for tool-generated messages
- Support for system, human, AI, tool, browser state, TODO list, screenshot messages
- Read-only view for tools
- Fork capability for sub-conversations

**Key Methods:**
- `addHuman(content)`, `addAI(content)`, `addSystem(content, position)`
- `addBrowserState(content)`, `addTodoList(content)`, `addScreenshot(dataUrl, text)`
- `queueMessage()`, `flushQueue()`, `clearQueue()`
- `getMessages()`, `getTokenCount()`, `remaining()`
- `fork(includeHistory)`

#### 2. TodoStore (@browseros-electron/src/agent/TodoStore.js)
**Purpose:** Manages TODO list for complex multi-step tasks

**Features:**
- Sequential TODO tracking (id, content, status)
- Status: 'todo', 'doing', 'done', 'skipped'
- Max 30 TODOs per task
- XML and JSON output formats

**Key Methods:**
- `addMultiple(contents)`, `complete(id)`, `skip(id)`
- `markDoing(id)`, `getCurrentDoing()`, `getNextTodo()`
- `getPending()`, `isAllDoneOrSkipped()`
- `getXml()`, `getJson()`, `reset()`

#### 3. ExecutionContext (@browseros-electron/src/agent/ExecutionContext.js)
**Purpose:** Central coordination point for agent execution

**Features:**
- Holds BrowserContext, MessageManager, TodoStore
- Abort signal management
- Execution state tracking (isExecuting, lockedTabId)
- Task management (currentTask, taskNumber, todoList)
- Metrics tracking (toolCalls, observations, errors, toolFrequency)
- Reasoning history (for planner agent)
- Human input request/response coordination
- Chat mode vs. automation mode

**Key Methods:**
- `startExecution(tabId)`, `endExecution()`, `isExecuting()`
- `setCurrentTask(task)`, `getCurrentTask()`, `getCurrentTaskNumber()`
- `setTodoList(todos)`, `getTodoList()`
- `cancelExecution(isUserInitiated)`, `shouldAbort()`, `isUserCancellation()`
- `incrementMetric(metric)`, `incrementToolUsageMetrics(toolName)`
- `addReasoning(reasoning)`, `getReasoningHistory(count)`
- `setHumanInputRequestId(id)`, `setHumanInputResponse(response)`
- `reset()`

#### 4. ToolManager (@browseros-electron/src/agent/ToolManager.js)
**Purpose:** Registry for tools available to agents

**Features:**
- Simple Map-based storage
- Tool registration and lookup
- AI SDK format conversion
- Tool descriptions for prompts

**Key Methods:**
- `register(tool)`, `registerMultiple(toolArray)`
- `get(name)`, `getAll()`, `getNames()`, `has(name)`
- `getDescriptions()` - formatted for prompts
- `toAISDKFormat()` - converts to AI SDK tool format
- `clear()`, `count()`

#### 5. ToolInterface (@browseros-electron/src/agent/ToolInterface.js)
**Purpose:** Standard tool output format

**Format:**
```javascript
{
  ok: boolean,      // true = success, false = error
  output: string    // human-readable result or error message
}
```

**Helpers:**
- `toolSuccess(message)` - returns `{ok: true, output: message}`
- `toolError(message)` - returns `{ok: false, output: message}`

## 📦 Runtime Module Structure

```
src/agent/
├── BrowserContext.js       # Multi-tab browser abstraction
├── MessageManager.js        # Conversation history + token tracking
├── TodoStore.js            # TODO list management
├── ExecutionContext.js     # Central execution coordinator
├── ToolManager.js          # Tool registry
└── ToolInterface.js        # Tool output helpers
```

## 🔌 Integration with Existing System

### Current Integration Points:

1. **Main Process (src/main.js)**
   - Tab registry provides backend for BrowserContext
   - `run-agent-task` IPC handler can now use ExecutionContext
   - `browserAutomation` object already includes tab methods

2. **Agent Tools (src/agent/tools.js)**
   - Can be refactored to use ToolManager
   - Tools can use ToolInterface helpers for consistent output
   - ExecutionContext can be injected into tool execution

3. **Sidebar Chat (sidebar/components/Chat.jsx)**
   - Already streams messages - can integrate with MessageManager
   - Can display TODO list from TodoStore
   - Can show execution metrics from ExecutionContext

## 🎯 Next Steps: Tool Porting

### Essential Tools (Priority 1)
These already have basic implementations in `src/agent/tools.js` but need to be converted to the new tool format:

1. **Navigate** - Navigate to URL
2. **Click** - Click element by selector
3. **Type** - Type text into input
4. **Screenshot** - Capture page screenshot
5. **ExecuteScript** - Run JavaScript
6. **Done** - Mark task complete
7. **Wait** - Wait for condition
8. **Scroll** - Scroll page
9. **Key** - Press keyboard keys
10. **Extract** - Extract page data

### Tab Management Tools (Priority 2)
Backend already exists via BrowserContext:

1. **Tabs** - List all tabs
2. **TabOpen** - Open new tab
3. **TabFocus** - Switch to tab
4. **TabClose** - Close tab
5. **GetSelectedTabs** - Get user-selected tabs
6. **GroupTabs** - Organize tabs

### TODO/Planning Tools (Priority 3)
Backend exists via TodoStore and ExecutionContext:

1. **TodoSet** - Set TODO list for current task
2. **TodoGet** - Get current TODO list
3. **Planner** - Plan multi-step tasks
4. **PlannerPrompts** - Planning prompt templates

### Advanced Tools (Priority 4)
1. **Visual tools** - VisualClick, VisualType, ClickAtCoordinates, TypeAtCoordinates
2. **Element search** - GrepElements
3. **Form tools** - Clear
4. **User interaction** - HumanInput, Celebration
5. **Meta tools** - BrowserOSInfoTool, DateTool, MCPTool

## 🏗️ Architecture Benefits

### 1. Clean Separation of Concerns
- **BrowserContext** = Browser/tab management
- **MessageManager** = Conversation history
- **TodoStore** = Task decomposition
- **ExecutionContext** = Coordination + state
- **ToolManager** = Tool registry
- **Tools** = Individual capabilities

### 2. Testability
Each module can be tested independently:
- Mock BrowserContext for tool tests
- Mock ExecutionContext for agent tests
- Test MessageManager token counting
- Test TodoStore state transitions

### 3. Extensibility
- Add new tools via ToolManager.register()
- Extend ExecutionContext for new state
- Add custom message types to MessageManager
- Implement new TODO workflows in TodoStore

### 4. AI SDK 6 Compatibility
- MessageManager uses AI SDK message format
- ToolManager.toAISDKFormat() converts tools
- Ready for streamText/generateText integration

## 🔄 Migration Path

### Step 1: Update tools.js to use ToolManager
```javascript
const { ToolManager } = require('./agent/ToolManager');
const { toolSuccess, toolError } = require('./agent/ToolInterface');

const toolManager = new ToolManager();

// Register tools
toolManager.register({
  name: 'navigate',
  description: 'Navigate to a URL',
  parameters: { /* ... */ },
  execute: async (args, context) => {
    // Implementation
    return toolSuccess('Navigated to ' + args.url);
  }
});

// Use in agent
const aiTools = toolManager.toAISDKFormat();
```

### Step 2: Update run-agent-task to use ExecutionContext
```javascript
const { ExecutionContext } = require('./agent/ExecutionContext');
const { BrowserContext } = require('./agent/BrowserContext');

ipcMain.handle('run-agent-task', async (event, { prompt, currentUrl }) => {
  const browserContext = new BrowserContext(browserAutomation);
  const executionContext = new ExecutionContext({ browserContext });
  
  executionContext.setCurrentTask(prompt);
  executionContext.startExecution(activeTabId);
  
  // Run agent with executionContext
  // ...
  
  executionContext.endExecution();
});
```

### Step 3: Integrate with Chat UI
```javascript
// In Chat.jsx
const { executionMetrics, todoList } = response.metadata || {};

// Display metrics
if (executionMetrics) {
  console.log(`Tool calls: ${executionMetrics.toolCalls}`);
}

// Display TODOs
if (todoList) {
  // Render TODO list UI
}
```

## 📊 Metrics & Observability

ExecutionContext now tracks:
- Total tool calls per task
- Observations made
- Errors encountered
- Per-tool usage frequency
- Task start/end times
- Reasoning history (for debugging planner)

This enables:
- Performance monitoring
- Usage analytics
- Debugging complex workflows
- Cost tracking (via token counts)

## ✨ Ready For

- ✅ Tool registration and execution
- ✅ Multi-step task decomposition
- ✅ Conversation history management
- ✅ Multi-tab workflows
- ✅ Abort/cancellation
- ✅ Metrics tracking
- ✅ Human-in-the-loop interactions
- ⏳ Full tool port (next phase)
- ⏳ Agent classes port (ChatAgent, LocalAgent, etc.)

---

**Status:** Runtime infrastructure complete, ready for tool porting phase
**Next:** Port essential tools using the new infrastructure
