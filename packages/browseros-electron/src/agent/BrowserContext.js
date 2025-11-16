/**
 * BrowserContext for Electron
 * 
 * Wraps Electron's multi-tab BrowserView system to provide an interface
 * compatible with the original BrowserOS agent's BrowserContext.
 * 
 * Key differences from Chrome extension version:
 * - Uses Electron IPC instead of chrome.tabs API
 * - Manages BrowserViews instead of Chrome tabs
 * - Simplified - no Puppeteer dependencies
 */

class ElectronPage {
  constructor(tabId, browserAutomation) {
    this.tabId = tabId;
    this._browserAutomation = browserAutomation;
  }

  async url() {
    const tabs = await this._browserAutomation.listTabs();
    const tab = tabs.tabs.find(t => t.id === this.tabId);
    return tab ? tab.url : '';
  }

  async title() {
    const tabs = await this._browserAutomation.listTabs();
    const tab = tabs.tabs.find(t => t.id === this.tabId);
    return tab ? tab.title : '';
  }

  /**
   * Get simplified text snapshot of the page
   * For now, returns basic page info. Can be enhanced with actual DOM scraping.
   */
  async getTextSnapshotString() {
    const url = await this.url();
    const title = await this.title();
    return `Page: ${title}\nURL: ${url}`;
  }

  /**
   * Execute script in this page's context
   */
  async evaluate(script) {
    // Switch to this tab first
    await this._browserAutomation.switchTab(this.tabId);
    // Then execute script
    const result = await this._browserAutomation.executeScript(script);
    return result.success ? result.result : null;
  }

  /**
   * Navigate this page
   */
  async navigate(url) {
    await this._browserAutomation.switchTab(this.tabId);
    return await this._browserAutomation.navigate(url);
  }

  /**
   * Take screenshot of this page
   */
  async screenshot() {
    await this._browserAutomation.switchTab(this.tabId);
    return await this._browserAutomation.screenshot();
  }
}

/**
 * BrowserContext manages tabs and pages in Electron
 */
class BrowserContext {
  constructor(browserAutomation) {
    this._browserAutomation = browserAutomation;
    this._pageCache = new Map();
    this._userSelectedTabIds = null;
    this._executionLockedTabId = null;
  }

  /**
   * Get pages (tabs) matching the criteria
   * @param {number[]|null} selectedTabIds - Specific tab IDs to get, or null for all/active
   * @returns {Promise<ElectronPage[]>}
   */
  async getPages(selectedTabIds = null) {
    const tabsResult = await this._browserAutomation.listTabs();
    
    if (!tabsResult.success) {
      return [];
    }

    let tabs = tabsResult.tabs;

    // Filter by selectedTabIds if provided
    if (selectedTabIds && selectedTabIds.length > 0) {
      tabs = tabs.filter(tab => selectedTabIds.includes(tab.id));
    } else if (this._userSelectedTabIds && this._userSelectedTabIds.length > 0) {
      // Use stored user selection
      tabs = tabs.filter(tab => this._userSelectedTabIds.includes(tab.id));
    } else if (this._executionLockedTabId !== null) {
      // Use locked tab
      tabs = tabs.filter(tab => tab.id === this._executionLockedTabId);
    } else {
      // Return only active tab by default
      tabs = tabs.filter(tab => tab.isActive);
    }

    // Create or retrieve ElectronPage instances
    const pages = [];
    for (const tab of tabs) {
      let page = this._pageCache.get(tab.id);
      if (!page) {
        page = new ElectronPage(tab.id, this._browserAutomation);
        this._pageCache.set(tab.id, page);
      }
      pages.push(page);
    }

    return pages;
  }

  /**
   * Get the active page
   */
  async getActivePage() {
    const activeTabResult = await this._browserAutomation.listTabs();
    if (!activeTabResult.success) return null;

    const activeTab = activeTabResult.tabs.find(t => t.isActive);
    if (!activeTab) return null;

    let page = this._pageCache.get(activeTab.id);
    if (!page) {
      page = new ElectronPage(activeTab.id, this._browserAutomation);
      this._pageCache.set(activeTab.id, page);
    }

    return page;
  }

  /**
   * Create a new tab
   */
  async createNewPage(url = null) {
    const result = await this._browserAutomation.createTab(url);
    if (result.success) {
      const page = new ElectronPage(result.tabId, this._browserAutomation);
      this._pageCache.set(result.tabId, page);
      return page;
    }
    return null;
  }

  /**
   * Close a tab
   */
  async closePage(tabId) {
    const result = await this._browserAutomation.closeTab(tabId);
    if (result.success) {
      this._pageCache.delete(tabId);
    }
    return result.success;
  }

  /**
   * Get all tab info
   */
  async getAllTabs() {
    const result = await this._browserAutomation.listTabs();
    return result.success ? result.tabs : [];
  }

  /**
   * Set user-selected tabs for execution
   */
  setSelectedTabIds(tabIds) {
    this._userSelectedTabIds = tabIds;
  }

  /**
   * Get selected tab IDs
   */
  getSelectedTabIds() {
    return this._userSelectedTabIds;
  }

  /**
   * Lock execution to a specific tab
   */
  lockToTab(tabId) {
    this._executionLockedTabId = tabId;
  }

  /**
   * Unlock execution from specific tab
   */
  unlockTab() {
    this._executionLockedTabId = null;
  }

  /**
   * Get locked tab ID
   */
  getLockedTabId() {
    return this._executionLockedTabId;
  }

  /**
   * Get current active tab ID
   */
  async getActiveTabId() {
    return this._browserAutomation.getActiveTabId();
  }

  /**
   * Switch to a specific tab
   */
  async switchToTab(tabId) {
    return await this._browserAutomation.switchTab(tabId);
  }

  /**
   * Clear the page cache
   */
  clearCache() {
    this._pageCache.clear();
  }
}

module.exports = {
  BrowserContext,
  ElectronPage
};
