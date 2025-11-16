const { app, BrowserWindow, BrowserView, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let sidebarWidth = 400;

// Tab Registry
const tabs = new Map(); // tabId -> { id, view, url, title, isActive }
let nextTabId = 1;
let activeTabId = null;

// Enable DevTools in development
const isDev = process.env.NODE_ENV === 'development';

// Tab Management Functions
function createTab(url = 'https://www.google.com') {
  const tabId = nextTabId++;
  
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  const tab = {
    id: tabId,
    view,
    url,
    title: 'New Tab',
    isActive: false
  };

  tabs.set(tabId, tab);

  // Set up event listeners for this tab
  view.webContents.on('did-navigate', (event, navigatedUrl) => {
    tab.url = navigatedUrl;
    mainWindow.webContents.send('tab-updated', { tabId, url: navigatedUrl, title: tab.title });
    if (tab.isActive) {
      mainWindow.webContents.send('url-changed', navigatedUrl);
    }
  });

  view.webContents.on('did-navigate-in-page', (event, navigatedUrl) => {
    tab.url = navigatedUrl;
    mainWindow.webContents.send('tab-updated', { tabId, url: navigatedUrl, title: tab.title });
    if (tab.isActive) {
      mainWindow.webContents.send('url-changed', navigatedUrl);
    }
  });

  view.webContents.on('did-finish-load', () => {
    tab.url = view.webContents.getURL();
    tab.title = view.webContents.getTitle();
    mainWindow.webContents.send('tab-updated', { tabId, url: tab.url, title: tab.title });
    if (tab.isActive) {
      mainWindow.webContents.send('page-loaded', { url: tab.url, title: tab.title });
    }
  });

  view.webContents.on('page-title-updated', (event, title) => {
    tab.title = title;
    mainWindow.webContents.send('tab-updated', { tabId, url: tab.url, title });
  });

  // Load URL
  view.webContents.loadURL(url);

  return tabId;
}

function switchTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) {
    console.error(`Tab ${tabId} not found`);
    return false;
  }

  // Hide current active tab
  if (activeTabId !== null) {
    const currentTab = tabs.get(activeTabId);
    if (currentTab) {
      currentTab.isActive = false;
      mainWindow.removeBrowserView(currentTab.view);
    }
  }

  // Show new tab
  tab.isActive = true;
  activeTabId = tabId;
  mainWindow.addBrowserView(tab.view);
  updateBrowserViewBounds();

  // Notify sidebar
  mainWindow.webContents.send('tab-activated', { tabId, url: tab.url, title: tab.title });
  mainWindow.webContents.send('url-changed', tab.url);
  mainWindow.webContents.send('page-loaded', { url: tab.url, title: tab.title });

  return true;
}

function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return false;

  const wasActive = tab.isActive;

  // Remove view
  if (tab.isActive) {
    mainWindow.removeBrowserView(tab.view);
  }

  // Clean up
  tab.view.webContents.destroy();
  tabs.delete(tabId);

  // If this was the active tab, switch to another
  if (wasActive) {
    activeTabId = null;
    if (tabs.size > 0) {
      const nextTabId = Array.from(tabs.keys())[0];
      switchTab(nextTabId);
    } else {
      // No tabs left, create a new one
      const newTabId = createTab();
      switchTab(newTabId);
    }
  }

  mainWindow.webContents.send('tab-closed', { tabId });
  return true;
}

function getActiveTab() {
  if (activeTabId === null) return null;
  return tabs.get(activeTabId);
}

function listTabs() {
  return Array.from(tabs.values()).map(tab => ({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    isActive: tab.isActive
  }));
}

function createWindow() {
  // Load saved sidebar width
  sidebarWidth = store.get('sidebarWidth', 400);

  // Create main window with sidebar
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Load sidebar UI
  mainWindow.loadFile(path.join(__dirname, '../sidebar/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Handle window resize
  mainWindow.on('resize', updateBrowserViewBounds);
  mainWindow.on('enter-full-screen', updateBrowserViewBounds);
  mainWindow.on('leave-full-screen', updateBrowserViewBounds);

  // Create initial tab
  const startPage = store.get('startPage', 'https://www.google.com');
  const initialTabId = createTab(startPage);
  switchTab(initialTabId);

  // Create menu
  createMenu();
}

function updateBrowserViewBounds() {
  const activeTab = getActiveTab();
  if (!mainWindow || !activeTab) return;

  const bounds = mainWindow.getContentBounds();
  const isFullScreen = mainWindow.isFullScreen();

  activeTab.view.setBounds({
    x: sidebarWidth,
    y: isFullScreen ? 0 : (process.platform === 'darwin' ? 28 : 0),
    width: bounds.width - sidebarWidth,
    height: isFullScreen ? bounds.height : bounds.height - (process.platform === 'darwin' ? 28 : 0)
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            const tabId = createTab('https://www.google.com');
            switchTab(tabId);
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (activeTabId !== null) {
              closeTab(activeTabId);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle DevTools (Sidebar)',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        {
          label: 'Toggle DevTools (Browser)',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => {
            const activeTab = getActiveTab();
            if (activeTab) {
              activeTab.view.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: 'Go',
      submenu: [
        {
          label: 'Back',
          accelerator: 'CmdOrCtrl+[',
          click: () => {
            const activeTab = getActiveTab();
            if (activeTab && activeTab.view.webContents.canGoBack()) {
              activeTab.view.webContents.goBack();
            }
          }
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+]',
          click: () => {
            const activeTab = getActiveTab();
            if (activeTab && activeTab.view.webContents.canGoForward()) {
              activeTab.view.webContents.goForward();
            }
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const activeTab = getActiveTab();
            if (activeTab) {
              activeTab.view.webContents.reload();
            }
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers

// Tab Management
ipcMain.handle('tabs-create', async (event, url) => {
  const tabId = createTab(url || 'https://www.google.com');
  switchTab(tabId);
  return { success: true, tabId };
});

ipcMain.handle('tabs-list', async () => {
  return { success: true, tabs: listTabs() };
});

ipcMain.handle('tabs-focus', async (event, tabId) => {
  const success = switchTab(tabId);
  return { success };
});

ipcMain.handle('tabs-close', async (event, tabId) => {
  const success = closeTab(tabId);
  return { success };
});

ipcMain.handle('tabs-get-active', async () => {
  const activeTab = getActiveTab();
  if (activeTab) {
    return { success: true, tab: { id: activeTab.id, url: activeTab.url, title: activeTab.title } };
  }
  return { success: false, error: 'No active tab' };
});

// Navigation
ipcMain.handle('navigate', async (event, url) => {
  try {
    const activeTab = getActiveTab();
    if (!activeTab) {
      return { success: false, error: 'No active tab' };
    }
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    await activeTab.view.webContents.loadURL(url);
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('go-back', async () => {
  const activeTab = getActiveTab();
  if (!activeTab) return { success: false, error: 'No active tab' };
  if (activeTab.view.webContents.canGoBack()) {
    activeTab.view.webContents.goBack();
    return { success: true };
  }
  return { success: false, error: 'Cannot go back' };
});

ipcMain.handle('go-forward', async () => {
  const activeTab = getActiveTab();
  if (!activeTab) return { success: false, error: 'No active tab' };
  if (activeTab.view.webContents.canGoForward()) {
    activeTab.view.webContents.goForward();
    return { success: true };
  }
  return { success: false, error: 'Cannot go forward' };
});

ipcMain.handle('reload', async () => {
  const activeTab = getActiveTab();
  if (!activeTab) return { success: false, error: 'No active tab' };
  activeTab.view.webContents.reload();
  return { success: true };
});

ipcMain.handle('get-current-url', async () => {
  const activeTab = getActiveTab();
  return activeTab ? activeTab.view.webContents.getURL() : '';
});

ipcMain.handle('get-page-title', async () => {
  const activeTab = getActiveTab();
  return activeTab ? activeTab.view.webContents.getTitle() : '';
});

ipcMain.handle('screenshot', async () => {
  try {
    const activeTab = getActiveTab();
    if (!activeTab) return { success: false, error: 'No active tab' };
    const image = await activeTab.view.webContents.capturePage();
    return {
      success: true,
      data: image.toDataURL()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('execute-script', async (event, script) => {
  try {
    const activeTab = getActiveTab();
    if (!activeTab) return { success: false, error: 'No active tab' };
    const result = await activeTab.view.webContents.executeJavaScript(script);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('click-element', async (event, selector) => {
  const activeTab = getActiveTab();
  if (!activeTab) return { success: false, error: 'No active tab' };
  
  const script = `
    (function() {
      const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
      if (element) {
        element.click();
        return { success: true };
      }
      return { success: false, error: 'Element not found' };
    })();
  `;
  
  try {
    const result = await activeTab.view.webContents.executeJavaScript(script);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('type-text', async (event, selector, text) => {
  const activeTab = getActiveTab();
  if (!activeTab) return { success: false, error: 'No active tab' };
  
  const script = `
    (function() {
      const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
      if (element) {
        element.value = '${text.replace(/'/g, "\\'")}';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      }
      return { success: false, error: 'Element not found' };
    })();
  `;
  
  try {
    const result = await activeTab.view.webContents.executeJavaScript(script);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Sidebar resize
ipcMain.on('resize-sidebar', (event, newWidth) => {
  sidebarWidth = Math.max(300, Math.min(newWidth, 600));
  store.set('sidebarWidth', sidebarWidth);
  updateBrowserViewBounds();
});

// Settings
ipcMain.handle('get-setting', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-setting', async (event, key, value) => {
  store.set(key, value);
  return { success: true };
});

// Agent task execution with AI SDK 6
const { ExecutionContext } = require('./agent/ExecutionContext');
const { BrowserContext } = require('./agent/BrowserContext');
const { ToolManager } = require('./agent/ToolManager');
const { createAllTools } = require('./agent/tools');

ipcMain.handle('run-agent-task', async (event, { prompt, currentUrl }) => {
  // Create browser automation context for the agent (legacy compatibility)
  const browserAutomation = {
    navigate: async (url) => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      await activeTab.view.webContents.loadURL(url);
      return { success: true, url };
    },
    clickElement: async (selector) => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      const script = `
        (function() {
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
          if (element) {
            element.click();
            return { success: true };
          }
          return { success: false, error: 'Element not found' };
        })();
      `;
      try {
        const result = await activeTab.view.webContents.executeJavaScript(script);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    typeText: async (selector, text) => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      const script = `
        (function() {
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
          if (element) {
            element.value = '${text.replace(/'/g, "\\'")}';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          }
          return { success: false, error: 'Element not found' };
        })();
      `;
      try {
        const result = await activeTab.view.webContents.executeJavaScript(script);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    executeScript: async (script) => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      try {
        const result = await activeTab.view.webContents.executeJavaScript(script);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    screenshot: async () => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      try {
        const image = await activeTab.view.webContents.capturePage();
        return { success: true, data: image.toDataURL() };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getCurrentUrl: () => {
      const activeTab = getActiveTab();
      return activeTab ? activeTab.view.webContents.getURL() : '';
    },
    getPageTitle: () => {
      const activeTab = getActiveTab();
      return activeTab ? activeTab.view.webContents.getTitle() : '';
    },
    // Tab management methods
    createTab: async (url) => {
      const tabId = createTab(url);
      return { success: true, tabId };
    },
    switchTab: async (tabId) => {
      const success = switchTab(tabId);
      return { success };
    },
    closeTab: async (tabId) => {
      const success = closeTab(tabId);
      return { success };
    },
    listTabs: () => {
      return { success: true, tabs: listTabs() };
    },
    getActiveTabId: () => activeTabId
  };

  // Initialize new runtime infrastructure
  try {
    // Create BrowserContext wrapper
    const browserContext = new BrowserContext(browserAutomation);
    
    // Create ExecutionContext with full state management
    const executionContext = new ExecutionContext({
      executionId: `task_${Date.now()}`,
      browserContext,
      supportsVision: true,
      maxTokens: 128000
    });

    // Create ToolManager and register all tools
    const toolManager = new ToolManager(executionContext);
    const tools = createAllTools(executionContext);
    toolManager.registerMultiple(tools);

    // Set current task and start execution
    executionContext.setCurrentTask(prompt);
    const activeTab = getActiveTab();
    if (activeTab) {
      executionContext.startExecution(activeTab.id);
    }

    // Add initial user message
    executionContext.messageManager.addHuman(prompt);

    // Send initial status to UI
    event.sender.send('agent-stream', {
      type: 'status',
      status: 'running',
      toolCount: toolManager.count(),
      tools: toolManager.getNames()
    });

    // Import AI SDK for agent execution
    const { streamText } = require('ai');
    const { anthropic } = require('@ai-sdk/anthropic');

    // Get AI SDK compatible tools
    const aiTools = toolManager.toAISDKFormat();

    // Create model
    const model = anthropic('claude-3-5-sonnet-20241022');

    // System prompt
    const systemPrompt = `You are a helpful browser automation agent. You can control a web browser and complete tasks for the user.

Available tools: ${toolManager.getDescriptions()}

Guidelines:
- Use tools to interact with the browser
- Take screenshots to see what's on the page
- Use the done tool when you've completed the task
- If you get stuck, use human_input to ask for help
- Be thorough but efficient

Current page: ${currentUrl}`;

    // Stream the AI response with tool calls
    let fullText = '';
    const result = await streamText({
      model,
      messages: executionContext.messageManager.getMessages(),
      tools: aiTools,
      maxSteps: 20,
      system: systemPrompt,
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta') {
          fullText += chunk.textDelta;
          event.sender.send('agent-stream', {
            type: 'text-delta',
            textDelta: chunk.textDelta,
            fullText
          });
        }
      },
      onStepFinish: ({ stepType, toolCalls, toolResults }) => {
        if (toolCalls && toolCalls.length > 0) {
          event.sender.send('agent-stream', {
            type: 'tool-calls',
            toolCalls: toolCalls.map(tc => ({
              name: tc.toolName,
              args: tc.args
            }))
          });
        }
        if (toolResults && toolResults.length > 0) {
          event.sender.send('agent-stream', {
            type: 'tool-results',
            results: toolResults.map(tr => ({
              name: tr.toolName,
              result: tr.result
            }))
          });
        }
      }
    });

    // Add AI response to message history
    executionContext.messageManager.addAI(result.text);

    // End execution
    executionContext.endExecution();

    // Get final metrics
    const metrics = executionContext.getExecutionMetrics();

    // Send completion
    event.sender.send('agent-stream', {
      type: 'complete',
      text: result.text,
      metrics,
      todoList: executionContext.todoStore.getAll()
    });

    return {
      success: true,
      text: result.text,
      metrics,
      usage: result.usage
    };

  } catch (error) {
    console.error('Agent task error:', error);
    event.sender.send('agent-stream', {
      type: 'error',
      error: error.message
    });
    return {
      success: false,
      error: error.message,
      text: `Error: ${error.message}`
    };
  }
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Export for testing
module.exports = { createWindow };
