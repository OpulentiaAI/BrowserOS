/**
 * Screenshot Tool - Capture a screenshot of the current page
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createScreenshotTool(context) {
  return {
    name: 'screenshot',
    description: `Capture a screenshot of the current page. Use liberally - screenshots are fast and free!

SIZE OPTIONS:
• small (256px): Low detail, minimal token usage - just visual layout checks
• medium (768px): Balanced quality and token usage - DEFAULT
• large (1028px): High detail - for complex pages or detailed analysis

USE FOR DECISION-MAKING:
• Choosing between multiple options (products, buttons, links)
• Before important actions (Place Order, Submit, Confirm)
• Verifying prices, ratings, or details before proceeding
• Comparing different items or pages

USE FOR DEBUGGING:
• Can't find an element after trying
• Page looks different than expected
• Before calling human_input
• Understanding error messages

Screenshots help you see what's on the page and make better decisions.`,
    parameters: {
      type: 'object',
      properties: {
        size: {
          type: 'string',
          enum: ['small', 'medium', 'large'],
          description: 'Screenshot size (default: medium)'
        }
      }
    },
    execute: async ({ size = 'medium' }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('screenshot');

        // Check token budget
        const maxTokens = context.getMaxTokens();
        const MIN_TOKENS_FOR_SCREENSHOTS = 64000;

        if (maxTokens < MIN_TOKENS_FOR_SCREENSHOTS) {
          return toolSuccess(`Screenshots disabled for models with < 128k tokens. Current model has ${maxTokens} tokens.`);
        }

        // Smart default: smaller size for lower token models
        let selectedSize = size;
        if (!size && maxTokens < 200000) {
          selectedSize = 'small';
        }

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolSuccess('No active page to screenshot. Proceeding without visual capture.');
        }
        
        const screenshotResult = await page.takeScreenshot(selectedSize);

        if (!screenshotResult || !screenshotResult.success) {
          return toolSuccess('Screenshot unavailable. Proceeding without visual capture.');
        }

        const screenshotDataUrl = screenshotResult.data;

        // Add screenshot to message history
        context.messageManager.addScreenshot(screenshotDataUrl, `Captured screenshot`);

        const result = {
          message: `Captured screenshot of the page.`,
          screenshot: screenshotDataUrl
        };

        return toolSuccess(JSON.stringify(result));
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Screenshot failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createScreenshotTool };
