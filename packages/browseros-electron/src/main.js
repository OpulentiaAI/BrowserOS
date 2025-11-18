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

  // Clean up glow state for this tab
  try {
    const glowService = GlowAnimationService.getInstance();
    if (glowService) {
      glowService.handleTabClosed(tabId);
    }
  } catch (error) {
    // Glow cleanup is optional, don't fail the tab close
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
    isActive: tab.isActive,
    active: tab.isActive
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
const { AgentOrchestrator } = require('./agent/AgentOrchestrator');
const { Logging } = require('./agent/utils/Logging');
const { GlowAnimationService } = require('./agent/services/GlowAnimationService');

// Basic logger for IPC/browser automation tracing
const logAutomation = (...args) => {
  const prefix = '[BrowserAutomation]';
  // eslint-disable-next-line no-console
  console.log(prefix, ...args);
};

ipcMain.handle('run-agent-task', async (event, { prompt, currentUrl, mode = 'browse', workflow, metadata }) => {
  // Create browser automation context for the agent (legacy compatibility)
  const browserAutomation = {
    navigate: async (url) => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      logAutomation('navigate', { tabId: activeTab.id, url });
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
        logAutomation('clickElement', { tabId: activeTab.id, selector, result });
        return result;
      } catch (error) {
        logAutomation('clickElement:error', { tabId: activeTab.id, selector, error: error.message });
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
        logAutomation('typeText', { tabId: activeTab.id, selector, text, result });
        return result;
      } catch (error) {
        logAutomation('typeText:error', { tabId: activeTab.id, selector, error: error.message });
        return { success: false, error: error.message };
      }
    },
    executeScript: async (script) => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      try {
        const result = await activeTab.view.webContents.executeJavaScript(script);
        logAutomation('executeScript', { tabId: activeTab.id, script: script?.slice?.(0, 200) || typeof script, result });
        return { success: true, result };
      } catch (error) {
        logAutomation('executeScript:error', { tabId: activeTab.id, error: error.message });
        return { success: false, error: error.message };
      }
    },
    screenshot: async () => {
      const activeTab = getActiveTab();
      if (!activeTab) return { success: false, error: 'No active tab' };
      try {
        const image = await activeTab.view.webContents.capturePage();
        const data = image.toDataURL();
        logAutomation('screenshot', { tabId: activeTab.id, length: data?.length });
        return { success: true, data };
      } catch (error) {
        logAutomation('screenshot:error', { tabId: activeTab.id, error: error.message });
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
      logAutomation('createTab', { tabId, url });
      return { success: true, tabId };
    },
    switchTab: async (tabId) => {
      const success = switchTab(tabId);
      logAutomation('switchTab', { tabId, success });
      return { success };
    },
    closeTab: async (tabId) => {
      const success = closeTab(tabId);
      logAutomation('closeTab', { tabId, success });
      return { success };
    },
    listTabs: () => {
      const tabs = listTabs();
      logAutomation('listTabs', { tabs });
      return { success: true, tabs };
    },
    getActiveTabId: () => activeTabId
  };

  logAutomation('run-agent-task:init', { mode, prompt, activeTabId });

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

    // Set current task and start execution
    executionContext.setCurrentTask(prompt);
    const activeTab = getActiveTab();
    if (activeTab) {
      executionContext.startExecution(activeTab.id);
    }

    const orchestrator = new AgentOrchestrator({
      onEvent: (payload) => {
        event.sender.send('agent-stream', payload);
      }
    });

    const pubsub = executionContext.getPubSub();
    const subscription = pubsub.subscribe((pubsubEvent) => {
      event.sender.send('agent-stream', {
        type: 'pubsub',
        event: pubsubEvent
      });
    });

    // Forward glow events to renderer
    const glowService = executionContext.getGlowService();
    const glowStartHandler = (glowEvent) => {
      event.sender.send('agent-stream', {
        type: 'glow',
        action: 'start',
        ...glowEvent
      });
    };
    const glowStopHandler = (glowEvent) => {
      event.sender.send('agent-stream', {
        type: 'glow',
        action: 'stop',
        ...glowEvent
      });
    };
    glowService.on('glow:start', glowStartHandler);
    glowService.on('glow:stop', glowStopHandler);

    // Forward log events to renderer
    const logHandler = (logEvent) => {
      event.sender.send('agent-stream', {
        type: 'log',
        ...logEvent
      });
    };
    const metricHandler = (metricEvent) => {
      event.sender.send('agent-stream', {
        type: 'metric',
        ...metricEvent
      });
    };
    Logging.on('log', logHandler);
    Logging.on('metric', metricHandler);

    event.sender.send('agent-stream', {
      type: 'status',
      status: 'running',
      mode
    });

    let agentResult;

    try {
      agentResult = await orchestrator.run({
        mode,
        prompt,
        workflow,
        metadata,
        executionContext,
        currentUrl
      });
      logAutomation('run-agent-task:complete', {
        success: agentResult?.success !== false,
        text: agentResult?.text?.slice?.(0, 200),
        metrics: executionContext.getExecutionMetrics()
      });
    } finally {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
      glowService.off('glow:start', glowStartHandler);
      glowService.off('glow:stop', glowStopHandler);
      Logging.off('log', logHandler);
      Logging.off('metric', metricHandler);
      executionContext.endExecution();
    }

    const metrics = executionContext.getExecutionMetrics();

    event.sender.send('agent-stream', {
      type: 'complete',
      text: agentResult?.text || '',
      metrics,
      todoList: executionContext.todoStore.getAll()
    });

    return {
      success: agentResult?.success !== false,
      text: agentResult?.text || '',
      metrics,
      usage: agentResult?.usage
    };

  } catch (error) {
    console.error('Agent task error:', error);
    logAutomation('run-agent-task:error', { error: error.message, stack: error.stack });
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
