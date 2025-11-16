const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electron', {
  // Navigation
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
  getPageTitle: () => ipcRenderer.invoke('get-page-title'),
  
  // Browser automation
  screenshot: () => ipcRenderer.invoke('screenshot'),
  executeScript: (script) => ipcRenderer.invoke('execute-script', script),
  clickElement: (selector) => ipcRenderer.invoke('click-element', selector),
  typeText: (selector, text) => ipcRenderer.invoke('type-text', selector, text),
  
  // Tabs
  createTab: (url) => ipcRenderer.invoke('tabs-create', url),
  listTabs: () => ipcRenderer.invoke('tabs-list'),
  focusTab: (tabId) => ipcRenderer.invoke('tabs-focus', tabId),
  closeTab: (tabId) => ipcRenderer.invoke('tabs-close', tabId),
  getActiveTab: () => ipcRenderer.invoke('tabs-get-active'),
  
  // Agent
  runAgentTask: (params) => ipcRenderer.invoke('run-agent-task', params),
  onAgentStream: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('agent-stream', subscription);
    return () => ipcRenderer.removeListener('agent-stream', subscription);
  },
  
  // Settings
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  
  // Sidebar
  resizeSidebar: (width) => ipcRenderer.send('resize-sidebar', width),
  
  // Events
  onUrlChange: (callback) => {
    const subscription = (event, url) => callback(url);
    ipcRenderer.on('url-changed', subscription);
    return () => ipcRenderer.removeListener('url-changed', subscription);
  },
  
  onPageLoad: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('page-loaded', subscription);
    return () => ipcRenderer.removeListener('page-loaded', subscription);
  },
  
  // Platform info
  platform: process.platform,
  versions: process.versions
});
