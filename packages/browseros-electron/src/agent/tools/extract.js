/**
 * Extract Tool - Extract data from the current page
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createExtractTool(context) {
  return {
    name: 'extract',
    description: 'Extract text content from the current page using a CSS selector',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to extract content from'
        },
        attribute: {
          type: 'string',
          description: 'Attribute to extract (optional, defaults to textContent)'
        }
      },
      required: ['selector']
    },
    execute: async ({ selector, attribute }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('extract');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to extract from');
        }

        // Sanitize selector to prevent injection
        const safeSelector = selector.replace(/'/g, "\\'");
        const safeAttribute = attribute ? attribute.replace(/'/g, "\\'") : null;
        
        const script = safeAttribute
          ? `document.querySelector('${safeSelector}')?.getAttribute('${safeAttribute}')`
          : `document.querySelector('${safeSelector}')?.textContent`;

        const result = await page.executeScript(script);

        if (result === null || result === undefined) {
          return toolError(`No element found matching selector: ${selector}`);
        }

        return toolSuccess(`Extracted: ${result}`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Extraction failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createExtractTool };
