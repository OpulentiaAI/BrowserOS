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
        const script = attribute
          ? `document.querySelector('${selector}')?.getAttribute('${attribute}')`
          : `document.querySelector('${selector}')?.textContent`;

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
