#!/usr/bin/env node

/**
 * Browser Automation Interface Test
 *
 * This script tests the integration between:
 * - BrowserContext / ElectronPage
 * - ExecutionContext
 * - computer tool
 *
 * It uses a mocked browserAutomation implementation that simulates
 * real tab management and low-level input events, giving us confidence
 * that our browser automation layer behaves correctly.
 */

const { BrowserContext } = require('./src/agent/BrowserContext');
const { ExecutionContext } = require('./src/agent/ExecutionContext');
const { createComputerTool } = require('./src/agent/tools/computer');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTest(name, fn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await fn();
  } catch (error) {
    console.error(`❌ ERROR in ${name}:`, error.message);
    console.error(error.stack);
    testsFailed++;
  }
}

console.log('='.repeat(70));
console.log('Browser Automation Interface Test Suite');
console.log('='.repeat(70));

// Simple in-memory mock of browserAutomation used by BrowserContext
function createMockBrowserAutomation() {
  const events = [];
  const tabs = [
    { id: 1, url: 'https://example.com', title: 'Example Domain', isActive: true }
  ];

  return {
    events,
    async listTabs() {
      return { success: true, tabs: tabs.slice() };
    },
    async createTab(url) {
      const id = tabs.length + 1;
      const tab = { id, url: url || 'https://example.com', title: 'New Tab', isActive: false };
      tabs.push(tab);
      return { success: true, tabId: id };
    },
    async switchTab(tabId) {
      tabs.forEach((t) => (t.isActive = t.id === tabId));
      events.push({ type: 'switchTab', tabId });
      return { success: true };
    },
    async navigate(url) {
      const active = tabs.find((t) => t.isActive);
      if (!active) return { success: false, error: 'No active tab' };
      active.url = url;
      active.title = `Title for ${url}`;
      events.push({ type: 'navigate', tabId: active.id, url });
      return { success: true };
    },
    async screenshot() {
      events.push({ type: 'screenshot' });
      return { success: true, data: 'FAKE_BASE64_DATA' };
    },
    async executeScript(script) {
      events.push({ type: 'executeScript', script: String(script).slice(0, 80) });
      // Return a generic success payload similar to what real automation might return
      return { success: true, result: { ok: true } };
    },
    async sendInputEvent(event) {
      events.push({ type: 'input', event });
      return { success: true };
    },
    async closeTab(tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return { success: false, error: 'Tab not found' };
      tabs.splice(idx, 1);
      events.push({ type: 'closeTab', tabId });
      return { success: true };
    }
  };
}

async function main() {
  // Test 1: BrowserContext getCurrentPage & navigation
  await runTest('BrowserContext basic navigation', async () => {
    const browserAutomation = createMockBrowserAutomation();
    const browserContext = new BrowserContext(browserAutomation);

    const page = await browserContext.getCurrentPage();
    assert(page !== null, 'getCurrentPage should return a page');

    const urlBefore = await page.url();
    assert(urlBefore === 'https://example.com', 'Initial URL should be example.com');

    await page.navigate('https://example.org');
    const urlAfter = await page.url();
    assert(urlAfter === 'https://example.org', 'URL should update after navigate');

    // Ensure underlying automation recorded navigation
    const navEvent = browserAutomation.events.find((e) => e.type === 'navigate');
    assert(!!navEvent && navEvent.url === 'https://example.org', 'Mock automation should record navigation');
  });

  // Test 2: ElectronPage scrolling and clear via executeScript
  await runTest('ElectronPage scroll and clear behaviors', async () => {
    const browserAutomation = createMockBrowserAutomation();
    const browserContext = new BrowserContext(browserAutomation);
    const page = await browserContext.getCurrentPage();

    await page.scrollDown(1);
    await page.scrollUp(1);
    await page.clear('#search');

    const scripts = browserAutomation.events.filter((e) => e.type === 'executeScript');
    assert(scripts.length >= 3, 'Should have executed scripts for scroll and clear');
  });

  // Test 3: ElectronPage input events (pressKey/mouse)
  await runTest('ElectronPage low-level input events', async () => {
    const browserAutomation = createMockBrowserAutomation();
    const browserContext = new BrowserContext(browserAutomation);
    const page = await browserContext.getCurrentPage();

    await page.mouseMove(100, 200);
    await page.mouseDown(100, 200, 'left');
    await page.mouseUp(100, 200, 'left');
    await page.pressKey('Enter');

    const inputEvents = browserAutomation.events.filter((e) => e.type === 'input');
    assert(inputEvents.length >= 4, 'Should have sent multiple input events');
    const hasMouseMove = inputEvents.some((e) => e.event.type === 'mouseMove');
    const hasKeyEvent = inputEvents.some((e) => e.event.type === 'keyDown' || e.event.type === 'keyUp' || e.event.type === 'char');
    assert(hasMouseMove, 'Should include mouseMove event');
    assert(hasKeyEvent, 'Should include key events');
  });

  // Test 4: computer tool end-to-end against BrowserContext
  await runTest('computer tool with BrowserContext', async () => {
    const browserAutomation = createMockBrowserAutomation();
    const browserContext = new BrowserContext(browserAutomation);

    // ExecutionContext needs browserContext injected
    const context = new ExecutionContext({ browserContext });

    const computerTool = createComputerTool(context);

    // mouse_move
    const moveResult = await computerTool.execute({ action: 'mouse_move', coordinate: [10, 20] });
    assert(moveResult.ok === true, 'mouse_move should succeed');

    // left_click
    const clickResult = await computerTool.execute({ action: 'left_click', coordinate: [10, 20] });
    assert(clickResult.ok === true, 'left_click should succeed');

    // type
    const typeResult = await computerTool.execute({ action: 'type', text: 'hello world' });
    assert(typeResult.ok === true, 'type should succeed');

    // key
    const keyResult = await computerTool.execute({ action: 'key', key: 'Enter' });
    assert(keyResult.ok === true, 'key action should succeed');

    // screenshot
    const screenshotResult = await computerTool.execute({ action: 'screenshot' });
    assert(screenshotResult.ok === true, 'screenshot should succeed');
    assert(!!screenshotResult.data, 'screenshot should return data');

    // Ensure underlying automation saw corresponding calls
    const events = browserAutomation.events;
    const hasMouseMove = events.some((e) => e.type === 'input' && e.event.type === 'mouseMove');
    const hasClick = events.some((e) => e.type === 'input' && e.event.type === 'mouseDown');
    const hasScreenshot = events.some((e) => e.type === 'screenshot');
    assert(hasMouseMove, 'Automation should see mouseMove from computer tool');
    assert(hasClick, 'Automation should see click from computer tool');
    assert(hasScreenshot, 'Automation should see screenshot from computer tool');
  });

  console.log('\n' + '='.repeat(70));
  console.log('Browser Automation Interface Test Summary');
  console.log('='.repeat(70));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 All browser automation interface tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some browser automation interface tests failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error while running tests:', err);
  process.exit(1);
});
