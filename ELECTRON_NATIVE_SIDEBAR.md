# Native Sidebar Integration for Electron

## Overview

Instead of loading your browser-agent as a Chrome extension, integrate it natively as a persistent sidebar in Electron. This provides a better user experience with:

- ✅ Always visible AI agent panel
- ✅ Native Electron integration
- ✅ No extension popup limitations
- ✅ Direct IPC communication
- ✅ Better performance
- ✅ More control over UI/UX

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Electron Window                            │
│                                             │
│  ┌──────────────┬─────────────────────────┐│
│  │              │                          ││
│  │  Agent UI    │   Browser View           ││
│  │  (Sidebar)   │   (BrowserView)          ││
│  │              │                          ││
│  │  - Chat      │   Web Content            ││
│  │  - Tools     │   https://...            ││
│  │  - Settings  │                          ││
│  │              │                          ││
│  │  React UI    │   Chromium Renderer      ││
│  │              │                          ││
│  └──────────────┴─────────────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
        ↕ IPC ↕
    Main Process
    - AI SDK 6
    - Tool execution
    - State management
```

---

## Implementation

### Step 1: Create Split Window Layout (Main Process)

Update `src/main.js`:

```javascript
const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let browserView;
let sidebarWidth = 400; // Adjustable sidebar width

function createWindow() {
  // Create main window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'hiddenInset', // macOS
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load sidebar UI (your agent interface)
  mainWindow.loadFile(path.join(__dirname, '../sidebar/index.html'));

  // Create BrowserView for web content
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.addBrowserView(browserView);
  
  // Position BrowserView next to sidebar
  updateBrowserViewBounds();

  // Load initial page in BrowserView
  browserView.webContents.loadURL('https://www.google.com');

  // Handle window resize
  mainWindow.on('resize', updateBrowserViewBounds);
  
  // Handle sidebar width changes
  ipcMain.on('resize-sidebar', (event, newWidth) => {
    sidebarWidth = Math.max(300, Math.min(newWidth, 600)); // Min 300px, max 600px
    updateBrowserViewBounds();
  });
}

function updateBrowserViewBounds() {
  const bounds = mainWindow.getContentBounds();
  
  browserView.setBounds({
    x: sidebarWidth,
    y: 0,
    width: bounds.width - sidebarWidth,
    height: bounds.height
  });
}

// IPC handlers for agent actions
ipcMain.handle('navigate', async (event, url) => {
  try {
    await browserView.webContents.loadURL(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-current-url', async () => {
  return browserView.webContents.getURL();
});

ipcMain.handle('screenshot', async () => {
  const image = await browserView.webContents.capturePage();
  return image.toDataURL();
});

ipcMain.handle('execute-script', async (event, script) => {
  try {
    const result = await browserView.webContents.executeJavaScript(script);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('click-element', async (event, selector) => {
  const script = `
    (function() {
      const element = document.querySelector('${selector}');
      if (element) {
        element.click();
        return { success: true };
      }
      return { success: false, error: 'Element not found' };
    })();
  `;
  return await browserView.webContents.executeJavaScript(script);
});

// AI Tool execution
ipcMain.handle('run-agent-tool', async (event, toolName, args) => {
  // Import your AI SDK 6 tools
  const { executeTool } = require('./agent/tools');
  
  try {
    const result = await executeTool(toolName, args, {
      browserView,
      mainWindow
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

---

### Step 2: Create Preload Script

Create `src/preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Navigation
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  
  // Browser automation
  screenshot: () => ipcRenderer.invoke('screenshot'),
  executeScript: (script) => ipcRenderer.invoke('execute-script', script),
  clickElement: (selector) => ipcRenderer.invoke('click-element', selector),
  typeText: (selector, text) => ipcRenderer.invoke('type-text', selector, text),
  
  // Agent tools
  runTool: (toolName, args) => ipcRenderer.invoke('run-agent-tool', toolName, args),
  
  // Sidebar
  resizeSidebar: (width) => ipcRenderer.send('resize-sidebar', width),
  
  // Events
  onUrlChange: (callback) => {
    ipcRenderer.on('url-changed', (event, url) => callback(url));
  },
  onPageLoad: (callback) => {
    ipcRenderer.on('page-loaded', (event, data) => callback(data));
  }
});
```

---

### Step 3: Migrate Your Agent UI

Convert your existing `browseros-agent` React UI to run in the sidebar:

#### Directory Structure:

```
packages/browseros-electron/
├── src/
│   ├── main.js              # Main process
│   ├── preload.js           # Preload script
│   └── agent/
│       ├── tools.js         # Tool implementations
│       └── ai-provider.js   # AI SDK 6 integration
├── sidebar/
│   ├── index.html           # Entry point
│   ├── index.js             # React app entry
│   ├── App.jsx              # Main app component
│   ├── components/          # Port from browseros-agent/src/components
│   │   ├── Chat.jsx
│   │   ├── ToolPanel.jsx
│   │   ├── Settings.jsx
│   │   └── AgentStatus.jsx
│   ├── hooks/               # Port from browseros-agent/src/hooks
│   │   ├── useAgent.js
│   │   └── useBrowser.js
│   └── styles/              # Port your Tailwind CSS
│       └── index.css
└── package.json
```

#### Create `sidebar/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'">
  <title>Opulent Agent</title>
  <link rel="stylesheet" href="styles/index.css">
</head>
<body>
  <div id="root"></div>
  <script src="index.js"></script>
</body>
</html>
```

#### Create `sidebar/App.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import Chat from './components/Chat';
import ToolPanel from './components/ToolPanel';
import Settings from './components/Settings';
import ResizeHandle from './components/ResizeHandle';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [currentUrl, setCurrentUrl] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  useEffect(() => {
    // Listen for URL changes
    window.electron.onUrlChange((url) => {
      setCurrentUrl(url);
    });

    // Get initial URL
    window.electron.getCurrentUrl().then(setCurrentUrl);
  }, []);

  const handleSendMessage = async (message) => {
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsAgentRunning(true);

    try {
      // Run agent with AI SDK 6 (via IPC to main process)
      const result = await window.electron.runTool('agent', {
        message,
        context: {
          url: currentUrl,
          history: messages
        }
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.result.response 
      }]);
    } catch (error) {
      console.error('Agent error:', error);
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: error.message 
      }]);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleNavigate = async (url) => {
    await window.electron.navigate(url);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Opulent Agent</h1>
        <button 
          onClick={() => setActiveTab('settings')}
          className="p-2 hover:bg-gray-800 rounded"
        >
          ⚙️
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <TabButton 
          active={activeTab === 'chat'} 
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </TabButton>
        <TabButton 
          active={activeTab === 'tools'} 
          onClick={() => setActiveTab('tools')}
        >
          🔧 Tools
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <Chat 
            messages={messages}
            onSendMessage={handleSendMessage}
            isRunning={isAgentRunning}
            currentUrl={currentUrl}
          />
        )}
        {activeTab === 'tools' && (
          <ToolPanel 
            onNavigate={handleNavigate}
            onExecute={window.electron.runTool}
          />
        )}
        {activeTab === 'settings' && (
          <Settings onClose={() => setActiveTab('chat')} />
        )}
      </div>

      {/* Resize Handle */}
      <ResizeHandle />
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium transition-colors ${
        active 
          ? 'bg-gray-800 text-white border-b-2 border-blue-500' 
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

export default App;
```

#### Create `sidebar/components/ResizeHandle.jsx`:

```jsx
import React, { useRef, useState } from 'react';

function ResizeHandle() {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    
    // Get current sidebar width
    const sidebar = document.getElementById('root');
    startWidthRef.current = sidebar.offsetWidth;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + deltaX;

    // Send new width to main process
    window.electron.resizeSidebar(newWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors"
      onMouseDown={handleMouseDown}
      style={{
        backgroundColor: isDragging ? '#3b82f6' : 'transparent'
      }}
    />
  );
}

export default ResizeHandle;
```

---

### Step 4: Integrate AI SDK 6 in Main Process

Create `src/agent/tools.js`:

```javascript
const { streamText } = require('ai');
const { anthropic } = require('@ai-sdk/anthropic');

// Port your tools from browseros-agent
const tools = {
  navigate: {
    description: 'Navigate to a URL',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' }
      },
      required: ['url']
    },
    execute: async ({ url }, { browserView }) => {
      await browserView.webContents.loadURL(url);
      return { success: true, url };
    }
  },

  click: {
    description: 'Click an element on the page',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector' }
      },
      required: ['selector']
    },
    execute: async ({ selector }, { browserView }) => {
      const script = `
        (function() {
          const el = document.querySelector('${selector}');
          if (el) {
            el.click();
            return { success: true };
          }
          return { success: false, error: 'Element not found' };
        })();
      `;
      return await browserView.webContents.executeJavaScript(script);
    }
  },

  screenshot: {
    description: 'Take a screenshot of the current page',
    parameters: { type: 'object', properties: {} },
    execute: async (args, { browserView }) => {
      const image = await browserView.webContents.capturePage();
      return { 
        success: true, 
        data: image.toDataURL() 
      };
    }
  },

  // Add more tools from your browseros-agent
};

async function executeTool(toolName, args, context) {
  const tool = tools[toolName];
  
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await tool.execute(args, context);
}

// Main agent execution
async function runAgent({ message, context }, electronContext) {
  const model = anthropic('claude-3-5-sonnet-20241022');

  const result = await streamText({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful browser automation agent. Use tools to help the user.'
      },
      ...context.history,
      { role: 'user', content: message }
    ],
    tools: Object.fromEntries(
      Object.entries(tools).map(([name, tool]) => [
        name,
        {
          description: tool.description,
          parameters: tool.parameters,
          execute: async (args) => tool.execute(args, electronContext)
        }
      ])
    ),
    maxSteps: 10
  });

  let fullResponse = '';
  for await (const chunk of result.textStream) {
    fullResponse += chunk;
  }

  return { response: fullResponse };
}

module.exports = { executeTool, runAgent, tools };
```

---

### Step 5: Build Configuration

Update `package.json`:

```json
{
  "name": "opulent-browser",
  "version": "0.1.0",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "NODE_ENV=development electron .",
    "build:sidebar": "webpack --config webpack.sidebar.js",
    "build:app": "npm run build:sidebar && electron-builder",
    "build:mac": "npm run build:sidebar && electron-builder --mac",
    "build:win": "npm run build:sidebar && electron-builder --win",
    "build:linux": "npm run build:sidebar && electron-builder --linux"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "@ai-sdk/anthropic": "^1.0.12",
    "@ai-sdk/openai": "^1.0.14",
    "ai": "^6.0.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "electron-builder": "^24.9.1",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "@babel/core": "^7.23.0",
    "@babel/preset-react": "^7.23.0",
    "babel-loader": "^9.1.3",
    "css-loader": "^6.8.1",
    "style-loader": "^3.3.3",
    "tailwindcss": "^3.4.0",
    "postcss-loader": "^7.3.3"
  }
}
```

Create `webpack.sidebar.js`:

```javascript
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './sidebar/index.js',
  output: {
    path: path.resolve(__dirname, 'sidebar/dist'),
    filename: 'bundle.js'
  },
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
```

---

### Step 6: Port Existing Components

Your existing `browseros-agent` components can be mostly reused:

#### Migration Map:

```
browseros-agent/src/              →  browseros-electron/sidebar/
├── components/
│   ├── ChatPanel.tsx             →  components/Chat.jsx
│   ├── ToolPanel.tsx             →  components/ToolPanel.jsx
│   ├── Settings.tsx              →  components/Settings.jsx
│   └── AgentStatus.tsx           →  components/AgentStatus.jsx
├── hooks/
│   ├── useAgent.ts               →  hooks/useAgent.js
│   └── useBrowser.ts             →  hooks/useBrowser.js (use window.electron APIs)
└── lib/
    ├── aisdk/                    →  Move to main process (src/agent/)
    └── runtime/                  →  Adapt for Electron IPC
```

#### Key Changes:

1. **Replace Chrome Extension APIs** with `window.electron` APIs:

```javascript
// Before (Chrome extension):
chrome.tabs.query({ active: true }, (tabs) => {
  chrome.tabs.update(tabs[0].id, { url });
});

// After (Electron):
await window.electron.navigate(url);
```

2. **Replace Message Passing** with IPC:

```javascript
// Before (Chrome):
chrome.runtime.sendMessage({ type: 'execute_tool', tool, args });

// After (Electron):
await window.electron.runTool(tool, args);
```

3. **State Management** stays the same (React hooks, Zustand, etc.)

---

## Benefits of Native Sidebar

### vs Extension Popup:
- ✅ Always visible (no popup close on click outside)
- ✅ More screen space
- ✅ Better performance (direct IPC vs extension messaging)
- ✅ Resizable sidebar
- ✅ Native OS integration

### vs Separate Extension:
- ✅ Single cohesive app
- ✅ Better branding
- ✅ Easier updates
- ✅ Direct access to Electron APIs
- ✅ No Chrome Web Store restrictions

---

## Advanced Features

### 1. Collapsible Sidebar

```javascript
// In main.js
let sidebarCollapsed = false;

ipcMain.on('toggle-sidebar', () => {
  sidebarCollapsed = !sidebarCollapsed;
  updateBrowserViewBounds();
});

function updateBrowserViewBounds() {
  const bounds = mainWindow.getContentBounds();
  const effectiveWidth = sidebarCollapsed ? 50 : sidebarWidth;
  
  browserView.setBounds({
    x: effectiveWidth,
    y: 0,
    width: bounds.width - effectiveWidth,
    height: bounds.height
  });
}
```

### 2. Multiple Browser Views (Tabs)

```javascript
const browserViews = new Map();
let activeBrowserView = null;

function createTab(url) {
  const view = new BrowserView({/* ... */});
  const id = Date.now().toString();
  
  browserViews.set(id, view);
  mainWindow.addBrowserView(view);
  
  if (activeBrowserView) {
    mainWindow.removeBrowserView(activeBrowserView);
  }
  
  activeBrowserView = view;
  updateBrowserViewBounds();
  view.webContents.loadURL(url);
  
  return id;
}

function switchTab(id) {
  const view = browserViews.get(id);
  if (!view) return;
  
  if (activeBrowserView) {
    mainWindow.removeBrowserView(activeBrowserView);
  }
  
  mainWindow.addBrowserView(view);
  activeBrowserView = view;
  updateBrowserViewBounds();
}
```

### 3. Persistent State

```javascript
const Store = require('electron-store');
const store = new Store();

// Save sidebar state
ipcMain.on('save-state', (event, state) => {
  store.set('agent-state', state);
});

// Load on startup
const savedState = store.get('agent-state', {});
```

---

## Migration Checklist

- [ ] Set up basic Electron app with split layout
- [ ] Create preload script with safe IPC
- [ ] Port React components to sidebar
- [ ] Implement browser automation tools
- [ ] Integrate AI SDK 6 in main process
- [ ] Add resize handle for sidebar
- [ ] Test all agent features
- [ ] Add keyboard shortcuts
- [ ] Implement tab management
- [ ] Add settings persistence
- [ ] Style sidebar UI
- [ ] Test on all platforms

---

## Estimated Timeline

- **Day 1:** Basic split layout + preload setup (4 hours)
- **Day 2:** Port core UI components (6 hours)
- **Day 3:** Integrate AI SDK 6 + tools (6 hours)
- **Day 4:** Polish UI, add features (4 hours)
- **Day 5:** Testing + bug fixes (4 hours)

**Total: ~1 week for full native integration**

---

## Resources

- [Electron BrowserView Docs](https://www.electronjs.org/docs/latest/api/browser-view)
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Preload Scripts](https://www.electronjs.org/docs/latest/tutorial/tutorial-preload)

---

## Result

You'll have a native Electron app with:

✅ Persistent AI agent sidebar (always visible)
✅ Resizable, collapsible sidebar
✅ Direct IPC communication (faster than extension messaging)
✅ Full control over UI/UX
✅ Native OS integration
✅ Better performance
✅ Professional desktop app experience

No more extension popup limitations - your agent is now a first-class part of the browser!
