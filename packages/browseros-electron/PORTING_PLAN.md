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
- [ ] `ExecutionContext.ts` - Core execution context
- [ ] `BrowserContext.ts` - Browser/page management
- [ ] `MessageManager.ts` - Message history
- [ ] `PubSub.ts` - Event system

#### 2. Tool Infrastructure  
**Source:** `src/lib/tools/`
- [ ] `ToolInterface.ts` - Tool type definitions
- [ ] `ToolManager.ts` - Tool registry

#### 3. Browser Automation Tools
**Source:** `src/lib/tools/`

**Essential (Port First):**
- [ ] `Click.ts` - Click elements
- [ ] `Type.ts` - Type text
- [ ] `Navigate.ts` - Navigate URLs
- [ ] `Screenshot.ts` - Capture screenshots
- [ ] `Extract.ts` - Extract page data
- [ ] `Done.ts` - Complete task
- [ ] `Wait.ts` - Wait for conditions
- [ ] `Scroll.ts` - Scroll page
- [ ] `Key.ts` - Press keys

**Advanced (Port Later):**
- [ ] `VisualClick.ts` - Click by visual coordinates
- [ ] `VisualType.ts` - Type at coordinates
- [ ] `ClickAtCoordinates.ts`
- [ ] `TypeAtCoordinates.ts`
- [ ] `GrepElements.ts` - Search page elements
- [ ] `Clear.ts` - Clear inputs

**Tab Management:**
- [ ] `Tabs.ts` - List tabs
- [ ] `TabOpen.ts` - Open new tab
- [ ] `TabFocus.ts` - Switch tabs
- [ ] `TabClose.ts` - Close tabs
- [ ] `GetSelectedTabsTool.ts`
- [ ] `GroupTabsTool.ts`

**Task Management:**
- [ ] `TodoSet.ts` - Set TODO list
- [ ] `TodoGet.ts` - Get TODO list
- [ ] `Planner.ts` - Planning tool
- [ ] `PlannerPrompts.ts`

**User Interaction:**
- [ ] `HumanInput.ts` - Request human input
- [ ] `Celebration.ts` - Success celebrations

**Meta Tools:**
- [ ] `BrowserOSInfoTool.ts` - System info
- [ ] `DateTool.ts` - Date/time operations
- [ ] `MCPTool.ts` - MCP server integration

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
- [ ] `PubSub.ts` - Event publishing
- [ ] Message types and interfaces

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
- [ ] Tab management working
- [ ] Screenshot & extraction working
- [ ] Streaming responses working
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

**Next Steps:**
1. Port ExecutionContext
2. Port ToolManager
3. Port essential tools one by one
4. Wire up to existing IPC handlers
