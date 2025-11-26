/**
 * Extract Tool - Extract data from the current page
 * Enhanced to get meaningful content for summarization
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createExtractTool(context) {
  return {
    name: 'extract',
    description: `Extract text content from the current page for analysis and summarization.
Use selector="body" to get the main page content.
For search results pages, this will return the headlines and snippets you can summarize.
IMPORTANT: After extracting, read the content carefully and use it to provide an intelligent summary in your done message.`,
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to extract content from. Use "body" for full page content, or specific selectors like "#search-results"'
        },
        maxLength: {
          type: 'number',
          description: 'Maximum characters to extract (default: 3000). Increase for more detailed extraction.'
        }
      },
      required: ['selector']
    },
    execute: async ({ selector, maxLength = 3000 }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('extract');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to extract from');
        }

        // Enhanced extraction script that gets clean, readable content
        const script = `
          (function() {
            const selector = '${selector.replace(/'/g, "\\'")}';
            const maxLen = ${maxLength};
            const el = document.querySelector(selector);
            if (!el) return null;
            
            // For body selector, try to get meaningful content
            if (selector === 'body') {
              // Remove script and style content
              const clone = el.cloneNode(true);
              clone.querySelectorAll('script, style, noscript, svg, path').forEach(e => e.remove());
              
              // Get text content and clean it up
              let text = clone.innerText || clone.textContent || '';
              
              // Clean up whitespace
              text = text.replace(/\\s+/g, ' ').trim();
              
              // For Google search results, try to extract just the results
              const searchResults = document.querySelectorAll('#search .g, [data-hveid] h3, .yuRUbf a h3');
              if (searchResults.length > 0) {
                const headlines = [];
                searchResults.forEach((r, i) => {
                  if (i < 10) { // Top 10 results
                    const title = r.innerText || r.textContent;
                    if (title && title.trim().length > 5) {
                      headlines.push((i + 1) + '. ' + title.trim());
                    }
                  }
                });
                if (headlines.length > 0) {
                  text = 'Search Results Headlines:\\n' + headlines.join('\\n') + '\\n\\nFull page content:\\n' + text;
                }
              }
              
              return text.substring(0, maxLen);
            }
            
            // For specific selectors
            return (el.innerText || el.textContent || '').substring(0, maxLen);
          })()
        `;

        const result = await page.evaluate(script);

        if (result === null || result === undefined) {
          return toolError(`No element found matching selector: ${selector}`);
        }

        return toolSuccess(`Page content extracted (${result.length} chars):\n\n${result}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Extraction failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createExtractTool };
