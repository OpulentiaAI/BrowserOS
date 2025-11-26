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

const { Logging } = require('./utils/Logging');

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
    try {
      // Switch to this tab first
      await this._browserAutomation.switchTab(this.tabId);
      // Then execute script
      const result = await this._browserAutomation.executeScript(script);
      Logging.log('ElectronPage', `evaluate result for tab ${this.tabId}: ${JSON.stringify(result)?.slice(0,200)}`, 'debug');
      return result.success ? result.result : null;
    } catch (error) {
      Logging.log('ElectronPage', `Script execution failed on tab ${this.tabId}: ${error.message}`, 'error');
      throw error;
    }
  }

  async executeScript(script) {
    return await this.evaluate(script);
  }

  /**
   * Navigate this page
   */
  async navigate(url) {
    try {
      Logging.log('ElectronPage', `Navigating tab ${this.tabId} to ${url}`, 'info');
      await this._browserAutomation.switchTab(this.tabId);
      const result = await this._browserAutomation.navigate(url);
      if (result.success) {
        Logging.log('ElectronPage', `Navigation successful for tab ${this.tabId}`, 'info');
      }
      return result;
    } catch (error) {
      Logging.log('ElectronPage', `Navigation failed for tab ${this.tabId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Take screenshot of this page
   */
  async screenshot() {
    await this._browserAutomation.switchTab(this.tabId);
    return await this._browserAutomation.screenshot();
  }

  async takeScreenshot(size) {
    await this._browserAutomation.switchTab(this.tabId);
    const result = await this._browserAutomation.screenshot();
    if (!result || !result.success) {
      return null;
    }
    return { success: true, data: result.data };
  }

  async clickAtCoordinates(x, y) {
    const script = `
      (function() {
        const el = document.elementFromPoint(${x}, ${y});
        if (!el) {
          return { success: false, error: 'No element at given coordinates' };
        }
        el.click();
        return { success: true };
      })();
    `;
    return await this.evaluate(script);
  }

  async typeAtCoordinates(x, y, text) {
    const script = `
      (function() {
        const el = document.elementFromPoint(${x}, ${y});
        if (!el) {
          return { success: false, error: 'No element at given coordinates' };
        }
        el.focus();
        var value = ${JSON.stringify(text)};
        if ('value' in el) {
          el.value = value;
          try {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {}
        } else {
          try {
            document.execCommand('insertText', false, value);
          } catch (e) {}
        }
        return { success: true };
      })();
    `;
    return await this.evaluate(script);
  }

  async scrollDown(amount = 1) {
    const scrollAmount = Number.isFinite(amount) ? Math.max(0, amount) : 1;
    const script = `(() => {
      const start = window.scrollY;
      const delta = window.innerHeight * ${scrollAmount};
      window.scrollBy({ top: delta, left: 0, behavior: 'smooth' });
      return { didScroll: window.scrollY !== start, position: window.scrollY };
    })();`;
    return await this.evaluate(script);
  }

  async scrollUp(amount = 1) {
    const scrollAmount = Number.isFinite(amount) ? Math.max(0, amount) : 1;
    const script = `(() => {
      const start = window.scrollY;
      const delta = window.innerHeight * ${scrollAmount};
      window.scrollBy({ top: -delta, left: 0, behavior: 'smooth' });
      return { didScroll: window.scrollY !== start, position: window.scrollY };
    })();`;
    return await this.evaluate(script);
  }

  async scrollToElement(nodeId) {
    const script = `(() => {
      const byData = document.querySelector('[data-nodeid="${nodeId}"]');
      const interactive = Array.from(document.querySelectorAll('a,button,input,textarea,select,[contenteditable="true"],[role="button"],[role="link"],[role="textbox"]'));
      const target = byData || interactive[${Number(nodeId)}] || interactive[${Number(nodeId) - 1}] || document.activeElement;
      if (!target) return false;
      try {
        target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      } catch (e) {
        target.scrollIntoView();
      }
      return true;
    })();`;
    const result = await this.evaluate(script);
    return !!result;
  }

  async clear(selector) {
    if (!selector) return { success: false, error: 'Selector required' };
    const escapedSelector = selector.replace(/'/g, "\\'");
    const script = `(() => {
      const el = document.querySelector('${escapedSelector}');
      if (!el) return { success: false, error: 'Element not found' };
      if (el.isContentEditable) {
        el.innerText = '';
      } else if ('value' in el) {
        el.value = '';
      }
      try {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
      return { success: true };
    })();`;
    return await this.evaluate(script);
  }

  async clearElement(nodeId) {
    const script = `(() => {
      const byData = document.querySelector('[data-nodeid="${nodeId}"]');
      const interactive = Array.from(document.querySelectorAll('input,textarea,select,[contenteditable="true"],[role="textbox"], [role="searchbox"]'));
      const target = byData || interactive[${Number(nodeId)}] || interactive[${Number(nodeId) - 1}] || document.activeElement;
      if (!target) return { success: false, error: 'Element not found' };
      if (target.isContentEditable) {
        target.innerText = '';
      } else if ('value' in target) {
        target.value = '';
      }
      try {
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
      return { success: true };
    })();`;
    return await this.evaluate(script);
  }

  async pressKey(key) {
    const safeKey = JSON.stringify(key);
    const script = `(() => {
      const target = document.activeElement || document.body;
      const opts = { key: ${safeKey}, code: ${safeKey}, keyIdentifier: ${safeKey}, bubbles: true, cancelable: true };
      
      // Dispatch keyboard events
      target.dispatchEvent(new KeyboardEvent('keydown', opts));
      target.dispatchEvent(new KeyboardEvent('keypress', opts));
      target.dispatchEvent(new KeyboardEvent('keyup', opts));
      
      // For Enter key, also try to submit the form or trigger native behavior
      if (${safeKey} === 'Enter') {
        // Try form submission
        const form = target.closest('form');
        if (form) {
          // Check if there's a submit button, click it
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
          if (submitBtn) {
            submitBtn.click();
            return { submitted: 'button' };
          }
          // Otherwise submit the form directly
          form.submit();
          return { submitted: 'form' };
        }
        // For contenteditable or when no form, try simulating enter press more aggressively
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          // Create and dispatch a proper submit event
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          const form2 = target.form;
          if (form2) {
            form2.dispatchEvent(submitEvent);
            if (!submitEvent.defaultPrevented) {
              form2.submit();
            }
            return { submitted: 'form-event' };
          }
        }
      }
      
      // For single character keys, append to value
      if (target && target.value !== undefined && ${safeKey}.length === 1) {
        try {
          target.value += ${safeKey};
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {}
      }
      return { submitted: false };
    })();`;
    return await this.evaluate(script);
  }

  async waitForStability(delayMs = 200) {
    const ms = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 200;
    await new Promise((resolve) => setTimeout(resolve, ms));
    return true;
  }

  async sendInputEvent(event) {
    // Uses native Electron sendInputEvent via IPC
    return await this._browserAutomation.sendInputEvent(event);
  }

  async mouseMove(x, y) {
    return await this.sendInputEvent({
      type: 'mouseMove',
      x,
      y
    });
  }

  async mouseDown(x, y, button = 'left', clickCount = 1) {
    return await this.sendInputEvent({
      type: 'mouseDown',
      x,
      y,
      button,
      clickCount
    });
  }

  async mouseUp(x, y, button = 'left', clickCount = 1) {
    return await this.sendInputEvent({
      type: 'mouseUp',
      x,
      y,
      button,
      clickCount
    });
  }

  async click(x, y, button = 'left') {
    await this.mouseDown(x, y, button, 1);
    await this.mouseUp(x, y, button, 1);
    return { success: true };
  }

  async type(text) {
    if (!text) return { success: false, error: 'No text provided' };
    
    // Use robust typing with keyDown, char, and keyUp events
    // This ensures compatibility with React, Vue, and other frameworks
    for (const char of text) {
      // Send keyDown event
      await this.sendInputEvent({ 
        type: 'keyDown', 
        keyCode: char,
        key: char,
        code: `Key${char.toUpperCase()}`
      });
      // Send char event (for text input)
      await this.sendInputEvent({
        type: 'char',
        keyCode: char
      });
      // Send keyUp event
      await this.sendInputEvent({ 
        type: 'keyUp', 
        keyCode: char,
        key: char,
        code: `Key${char.toUpperCase()}`
      });
      // Small delay between characters for stability
      await new Promise(r => setTimeout(r, 10));
    }
    
    // Also dispatch input event via script for React compatibility
    await this.evaluate(`
      (function() {
        const el = document.activeElement;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })();
    `);
    
    return { success: true };
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

  async getCurrentPage() {
    return await this.getActivePage();
  }

  async getTabs() {
    const result = await this._browserAutomation.listTabs();
    return result.success
      ? result.tabs.map((tab) => ({ ...tab, active: tab.isActive }))
      : [];
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

  async openTab(url = null) {
    const targetUrl = url || 'https://www.google.com';
    const result = await this._browserAutomation.createTab(targetUrl);
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to open tab');
    }

    await this._browserAutomation.switchTab(result.tabId);

    let page = this._pageCache.get(result.tabId);
    if (!page) {
      page = new ElectronPage(result.tabId, this._browserAutomation);
      this._pageCache.set(result.tabId, page);
    }
    return page;
  }

  async focusTab(tabId) {
    // Ensure tabId is a number
    const numericTabId = typeof tabId === 'string' ? parseInt(tabId, 10) : tabId;
    if (isNaN(numericTabId) || numericTabId === null || numericTabId === undefined) {
      throw new Error(`Invalid tab ID: ${tabId}`);
    }

    const result = await this._browserAutomation.switchTab(numericTabId);
    if (!result || result.success === false) {
      throw new Error(result?.error || 'Failed to focus tab');
    }

    let page = this._pageCache.get(numericTabId);
    if (!page) {
      page = new ElectronPage(numericTabId, this._browserAutomation);
      this._pageCache.set(numericTabId, page);
    }
    return page;
  }

  async closeTab(tabId) {
    const result = await this._browserAutomation.closeTab(tabId);
    if (result && result.success) {
      this._pageCache.delete(tabId);
      return true;
    }
    return false;
  }

  async getBrowserStateString() {
    const page = await this.getActivePage();
    if (!page) {
      return 'BROWSER STATE:\nNo active page';
    }
    const url = await page.url();
    const title = await page.title();
    const text = await page.executeScript(
      'document.body ? (document.body.innerText || "") : ""'
    );
    return 'BROWSER STATE:\nCurrent page: ' + url + ' - ' + title + '\n\nPage text:\n' + (text || '');
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
