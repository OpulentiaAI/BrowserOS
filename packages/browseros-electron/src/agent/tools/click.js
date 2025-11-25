/**
 * Click Tool - Click an element by selector or nodeId
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createClickTool(context) {
  return {
    name: 'click',
    description: 'Click an element by its selector or nodeId',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to click (optional if nodeId provided)'
        },
        nodeId: {
          type: 'number',
          description: 'NodeId from element list (optional if selector provided)'
        }
      }
    },
    execute: async ({ selector, nodeId }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('click');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to interact with');
        }

        if (nodeId !== undefined && nodeId !== null) {
          // Click by nodeId - find interactive element by index or data attribute
          const script = `
            (function() {
              const byData = document.querySelector('[data-nodeid="${nodeId}"]');
              const interactive = Array.from(document.querySelectorAll('a,button,input,textarea,select,[contenteditable="true"],[role="button"],[role="link"],[role="textbox"]'));
              const target = byData || interactive[${Number(nodeId)}] || interactive[${Number(nodeId) - 1}];
              if (target) {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                target.focus();
                target.click();
                return { success: true, element: target.tagName };
              }
              return { success: false, error: 'Element not found with nodeId: ${nodeId}' };
            })();
          `;
          const result = await page.evaluate(script);
          if (result && result.success) {
            return toolSuccess(`Successfully clicked element (nodeId: ${nodeId}, tag: ${result.element})`);
          } else {
            return toolError(result?.error || 'Failed to click element by nodeId');
          }
        } else if (selector) {
          // Use JavaScript to click the element by selector
          const script = `
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
              if (element) {
                element.scrollIntoView({ block: 'center', behavior: 'smooth' });
                element.focus();
                element.click();
                return { success: true };
              }
              return { success: false, error: 'Element not found' };
            })();
          `;
          const result = await page.evaluate(script);
          if (result && result.success) {
            return toolSuccess(`Successfully clicked ${selector}`);
          } else {
            return toolError(result?.error || 'Failed to click element');
          }
        } else {
          return toolError('Either selector or nodeId is required for clicking elements');
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to click: ${error.message}`);
      }
    }
  };
}

module.exports = { createClickTool };
