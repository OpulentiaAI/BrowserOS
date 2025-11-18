# BrowserOS Agent → Electron Porting Plan

## Overview

Comprehensive port of BrowserOS agent infrastructure from Chrome extension to Electron native app.

## Phase 1: Core Runtime & Infrastructure ✅ (Completed)

### Already Ported
- [x] Chat store (Zustand)
- [x] Basic IPC communication
- [x] AI SDK 6 integration
- [x] Basic tool framework
- [x] Streaming support

## Phase 2: Full Tool System (In Progress)

### Critical Dependencies to Port

#### 1. Runtime Infrastructure
**Source:** `src/lib/runtime/`
- [x] `ExecutionContext.ts` - Core execution context (ported as `src/agent/ExecutionContext.js`)
- [x] `BrowserContext.ts` - Browser/page management (ported as `src/agent/BrowserContext.js`)
- [x] `MessageManager.ts` - Message history (ported as `src/agent/MessageManager.js`)
- [x] `PubSub.ts` - Event system (ported as `src/agent/PubSub.js` + `src/agent/PubSubChannel.js`)

#### 2. Tool Infrastructure  
**Source:** `src/lib/tools/`
- [x] `ToolInterface.ts` - Tool type definitions (ported as `src/agent/ToolInterface.js`)
- [x] `ToolManager.ts` - Tool registry (ported as `src/agent/ToolManager.js`)

#### 3. Browser Automation Tools
**Source:** `src/lib/tools/`

**Essential (Port First):**
- [x] `Click.ts` - Click elements (ported as `src/agent/tools/click.js`)
- [x] `Type.ts` - Type text (ported as `src/agent/tools/type.js`)
- [x] `Navigate.ts` - Navigate URLs (ported as `src/agent/tools/navigate.js`)
- [x] `Screenshot.ts` - Capture screenshots (ported as `src/agent/tools/screenshot.js`)
- [x] `Extract.ts` - Extract page data (ported as `src/agent/tools/extract.js`)
- [x] `Done.ts` - Complete task (ported as `src/agent/tools/done.js`)
- [x] `Wait.ts` - Wait for conditions (ported as `src/agent/tools/wait.js`)
- [x] `Scroll.ts` - Scroll page (ported as `src/agent/tools/scroll.js`)
- [x] `Key.ts` - Press keys (ported as `src/agent/tools/key.js`)

**Advanced (Port Later):**
- [x] `VisualClick.ts` - Click by visual coordinates (ported as `src/agent/tools/visualClick.js`)
- [x] `VisualType.ts` - Type at coordinates (ported as `src/agent/tools/visualType.js`)
- [x] `ClickAtCoordinates.ts` (ported as `src/agent/tools/clickAtCoordinates.js`)
- [x] `TypeAtCoordinates.ts` (ported as `src/agent/tools/typeAtCoordinates.js`)
- [x] `GrepElements.ts` - Search page elements (ported as `src/agent/tools/grepElements.js`)
- [x] `Clear.ts` - Clear inputs (ported as `src/agent/tools/clear.js`)

**Tab Management:**
- [x] `Tabs.ts` - List tabs (ported as `src/agent/tools/tabs.js`)
- [x] `TabOpen.ts` - Open new tab (ported as `src/agent/tools/tabOpen.js`)
- [x] `TabFocus.ts` - Switch tabs (ported as `src/agent/tools/tabFocus.js`)
- [x] `TabClose.ts` - Close tabs (ported as `src/agent/tools/tabClose.js`)
- [x] `GetSelectedTabsTool.ts` (ported as `src/agent/tools/getSelectedTabsTool.js`)
- [x] `GroupTabsTool.ts` (ported as `src/agent/tools/groupTabsTool.js` - logical grouping only)

**Task Management:**
- [x] `TodoSet.ts` - Set TODO list (ported as `src/agent/tools/todoSet.js`)
- [x] `TodoGet.ts` - Get TODO list (ported as `src/agent/tools/todoGet.js`)
- [x] `Planner.ts` - Planning tool (ported as `src/agent/tools/planner.js`)
- [x] `PlannerPrompts.ts` (ported as `src/agent/tools/plannerPrompts.js`)

**User Interaction:**
- [x] `HumanInput.ts` - Request human input (ported as `src/agent/tools/humanInput.js`)
- [x] `Celebration.ts` - Success celebrations (ported as `src/agent/tools/celebration.js`)

**Meta Tools:**
- [x] `BrowserOSInfoTool.ts` - System info (ported as `src/agent/tools/browserOSInfoTool.js`)
- [x] `DateTool.ts` - Date/time operations (ported as `src/agent/tools/dateTool.js`)
- [x] `MCPTool.ts` - MCP server integration (ported as `src/agent/tools/mcpTool.js` + `src/agent/mcp/*`)

## Phase 3: Agent Classes

### Source: `src/lib/agent/`

**Core Agents:**
- [ ] `ChatAgent.ts` - Chat-mode agent (lightweight)
- [ ] `LocalAgent.ts` - Full automation agent  
- [ ] `BrowserAgent.ts` - Browser-specific agent
- [ ] `TeachAgent.ts` - Teach mode agent

**Supporting:**
- [ ] `PreprocessAgent.ts` - Query preprocessing
- [ ] Agent prompts (`.prompt.ts` files)

## Phase 4: Supporting Infrastructure

### LLM Infrastructure
**Source:** `src/lib/llm/`
- [ ] `LangChainProvider.ts` - LangChain integration (if needed)
- [ ] `AISDKProvider.ts` - AI SDK provider (already have basic version)
- [ ] `settings/` - LLM settings management

### Browser Context
**Source:** `src/lib/browser/`
- [ ] `Page.ts` - Page wrapper
- [ ] `BrowserContext.ts` - Browser management
- [ ] `Snapshot.ts` - Page snapshots

### PubSub System
**Source:** `src/lib/pubsub/`
- [x] `PubSub.ts` - Event publishing (ported as `src/agent/PubSub.js` + `src/agent/PubSubChannel.js`)
- [ ] Message types and interfaces (simplified inline in Electron version)

### Utilities
**Source:** `src/lib/utils/`
- [ ] `Logging.ts` - Logging system
- [ ] Helper utilities

## Phase 5: UI Components (Optional)

### Source: `src/newtab/`
- [ ] Agent control panels
- [ ] Task managers
- [ ] Settings UI
- [ ] History view

## Adaptation Strategy

### Chrome Extension → Electron Mapping

| Chrome Extension API | Electron Equivalent |
|---------------------|---------------------|
| `chrome.tabs.*` | BrowserView management |
| `chrome.runtime.sendMessage` | IPC events |
| `chrome.storage.*` | electron-store |
| `chrome.scripting.executeScript` | BrowserView.webContents.executeJavaScript |
| `chrome.tabs.captureVisibleTab` | BrowserView.webContents.capturePage |
| Content scripts | Direct webContents access |
| Service worker | Main process |

### Key Changes Required

1. **No Content Scripts** - Use `executeJavaScript` directly
2. **No Messaging API** - Use IPC events instead
3. **Single BrowserView** - Manage tab state manually (or use multiple BrowserViews)
4. **Direct DOM Access** - Inject scripts as needed
5. **File System** - Can access Node.js fs directly

## Implementation Order

### Week 1: Core Infrastructure
1. Port ExecutionContext
2. Port BrowserContext  
3. Port MessageManager
4. Port PubSub
5. Port ToolManager

### Week 2: Essential Tools
1. Navigate
2. Click
3. Type
4. Screenshot
5. Extract
6. Done
7. Wait

### Week 3: Advanced Tools & Tab Management
1. Visual tools
2. Tab management
3. TODO/Planner
4. Human input

### Week 4: Agent Classes
1. Port ChatAgent
2. Port LocalAgent
3. Integration testing
4. Polish & docs

## Testing Strategy

1. **Unit Tests** - Port existing tests
2. **Integration Tests** - Test tools with real pages
3. **End-to-End** - Test full agent workflows

## Success Criteria

- [ ] All essential tools working in Electron
- [ ] ChatAgent fully functional
- [ ] LocalAgent operational for automation tasks
- [x] Tab management working
- [x] Screenshot & extraction working
- [x] Streaming responses working
- [ ] Error handling robust
- [ ] Performance acceptable

## Notes

### Challenges

1. **Tab Management** - Electron has no native tab concept, need to build
2. **Content Scripts** - Must inject code directly
3. **Permissions** - No Chrome permission system
4. **Storage** - Different storage mechanism

### Opportunities

1. **Native FS Access** - Can read/write files directly
2. **Better Performance** - No extension sandbox
3. **Native Modules** - Can use Node.js modules
4. **Better DevTools** - Full Electron DevTools access

## Current Status

**Completed:**
- Basic Electron setup
- Sidebar UI
- Chat store
- IPC bridge
- Basic AI SDK 6 integration
- 7 basic tools in tools.js
- ExecutionContext/BrowserContext/ToolManager/MessageManager ported
- Essential tools (Navigate, Click, Type, Screenshot, Extract, Done, Wait) ported
- Tab management (Tabs, TabOpen, TabFocus, TabClose) ported

**Next Steps:**
1. Port ChatAgent/LocalAgent/BrowserAgent/TeachAgent classes (or design Electron-specific agent wrappers) on top of the existing ExecutionContext/ToolManager/AI SDK runtime
2. (Optional) Flesh out PubSub message type helpers and any additional UI wiring for human input and planner events
3. Add planner prompts/settings UI and test end-to-end
