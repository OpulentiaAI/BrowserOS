/**
 * Type Tool - Type text into an input element
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTypeTool(context) {
  return {
    name: 'type',
    description: 'Type text into an input element',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the input element (optional if nodeId provided)'
        },
        nodeId: {
          type: 'number',
          description: 'NodeId from element list (optional if selector provided)'
        },
        text: {
          type: 'string',
          description: 'Text to type into the element'
        }
      },
      required: ['text']
    },
    execute: async ({ selector, nodeId, text }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('type');

        const page = await context.browserContext.getCurrentPage();

        // Enhanced logic: Try to find element by selector, then by common attributes if selector fails
        const safeText = text.replace(/'/g, "\\'");
        const safeSelector = selector ? selector.replace(/'/g, "\\'") : '';

        // If selector is provided but might be brittle (e.g., dynamic ID or complex path),
        // we can try fallback strategies within the browser script.
        
        const script = `
          (function() {
            // Helper to find element by selector or common text attributes
            function findInput(sel) {
              let el = null;
              if (sel) {
                try { el = document.querySelector(sel); } catch (e) {}
              }
              if (!el) {
                // Fallback: Try common search inputs if the intent seems to be searching
                if (sel.includes('q') || sel.includes('search')) {
                   el = document.querySelector('input[name="q"]') || 
                        document.querySelector('input[type="search"]') ||
                        document.querySelector('input[aria-label*="Search"]') ||
                        document.querySelector('textarea[name="q"]'); // Google sometimes uses textarea
                }
              }
              return el;
            }

            const element = findInput('${safeSelector}');
            
            if (element) {
              element.focus();
              element.value = '${safeText}';
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              
              // For React/modern frameworks, value setting might need property descriptor override
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
              if (nativeInputValueSetter) {
                  nativeInputValueSetter.call(element, '${safeText}');
                  element.dispatchEvent(new Event('input', { bubbles: true }));
              }
              
              return { success: true };
            }
            return { success: false, error: 'Element not found with selector: ${safeSelector}' };
          })();
        `;
        
        const result = await page.evaluate(script);
        
        if (result && result.success) {
          return toolSuccess(`Successfully typed "${text}" into element`);
        } else {
          // If generic selector failure, provide a hint
          const hint = "Try using a different selector or 'visual_type' if available.";
          return toolError(`${result?.error || 'Failed to type'}. ${hint}`);
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to type: ${error.message}`);
      }
    }
  };
}

module.exports = { createTypeTool };
