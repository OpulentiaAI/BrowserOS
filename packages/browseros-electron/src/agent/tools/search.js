/**
 * Search Tool - Perform a web search with proper step sequence
 * 
 * This tool ensures proper search execution by:
 * 1. Focusing the search input
 * 2. Typing the query
 * 3. Pressing Enter
 * 4. Waiting for results
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createSearchTool(context) {
  return {
    name: 'search',
    description: `Perform a web search. This tool handles clicking the search input, typing the query, and pressing Enter. 
Use this when you need to search on Google or any page with a search box.
IMPORTANT: This is the preferred way to search - it ensures all steps are completed correctly.`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to type and submit'
        },
        engine: {
          type: 'string',
          description: 'Search engine to use (google, bing, duckduckgo). Default: google',
          enum: ['google', 'bing', 'duckduckgo']
        }
      },
      required: ['query']
    },
    execute: async ({ query, engine = 'google' }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('search');

        if (!query || typeof query !== 'string' || query.trim() === '') {
          return toolError('Search query is required');
        }

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to search on');
        }

        // Step 1: Focus the search input
        const focusResult = await page.evaluate(`
          (function() {
            // Try common search input selectors
            const selectors = [
              'input[name="q"]',           // Google search
              'input[type="search"]',      // Generic search input
              'input[aria-label*="search" i]',
              'input[placeholder*="search" i]',
              'textarea[name="q"]',        // Google search textarea
              '#search',
              '.search-input',
              '[role="searchbox"]',
              'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
            ];
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && el.offsetParent !== null) {
                el.focus();
                el.click();
                // Clear any existing text
                if ('value' in el) {
                  el.value = '';
                } else if (el.isContentEditable) {
                  el.textContent = '';
                }
                return { success: true, element: el.tagName, selector: sel };
              }
            }
            return { success: false, error: 'No search input found on page' };
          })();
        `);

        if (!focusResult || !focusResult.success) {
          return toolError(focusResult?.error || 'Could not find search input on page');
        }

        // Step 2: Type the query
        await page.type(query.trim());

        // Step 3: Press Enter
        await page.pressKey('Enter');

        // Step 4: Wait for results to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        await page.waitForStability();

        return toolSuccess(`Searched for "${query}" using ${focusResult.element} (${focusResult.selector}). Results should now be loading.`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Search failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createSearchTool };
