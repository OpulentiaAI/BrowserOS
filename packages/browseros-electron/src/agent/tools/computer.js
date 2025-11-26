/**
 * Computer Tool - Unified mouse and keyboard interaction
 * Inspired by Scrapybara's computer tool.
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createComputerTool(context) {
  return {
    name: 'computer',
    description: 'Unified tool for mouse and keyboard interaction. Supports moving mouse, clicking, dragging, typing, and pressing keys.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'mouse_move',
            'left_click',
            'left_click_drag',
            'right_click',
            'middle_click',
            'double_click',
            'type',
            'key',
            'screenshot'
          ],
          description: 'The action to perform'
        },
        coordinate: {
          type: 'array',
          items: { type: 'integer' },
          minItems: 2,
          maxItems: 2,
          description: '(x, y) coordinates for mouse actions'
        },
        text: {
          type: 'string',
          description: 'Text to type (for type action)'
        },
        key: {
          type: 'string',
          description: 'Key to press (for key action)'
        }
      },
      required: ['action']
    },
    execute: async ({ action, coordinate, text, key }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('computer');

        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return toolError('No active page to interact with');
        }

        switch (action) {
          case 'mouse_move':
            if (!coordinate) return toolError('coordinate required for mouse_move');
            await page.mouseMove(coordinate[0], coordinate[1]);
            return toolSuccess(`Moved mouse to ${coordinate[0]}, ${coordinate[1]}`);

          case 'left_click':
            if (coordinate) {
              await page.mouseMove(coordinate[0], coordinate[1]);
              await page.click(coordinate[0], coordinate[1], 'left');
              return toolSuccess(`Left clicked at ${coordinate[0]}, ${coordinate[1]}`);
            }
            // No coordinates provided - try to find and focus a clickable input
            // This is useful for search boxes where we don't know exact position
            const clickResult = await page.evaluate(`
              (function() {
                // Try common search input selectors
                const selectors = [
                  'input[name="q"]',           // Google search
                  'input[type="search"]',      // Generic search input
                  'input[aria-label*="search" i]',
                  'input[placeholder*="search" i]',
                  'textarea[name="q"]',        // Google search textarea
                  '[contenteditable="true"]',
                  'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
                ];
                for (const sel of selectors) {
                  const el = document.querySelector(sel);
                  if (el && el.offsetParent !== null) {
                    el.focus();
                    el.click();
                    const rect = el.getBoundingClientRect();
                    return { 
                      success: true, 
                      element: el.tagName,
                      selector: sel,
                      x: Math.round(rect.x + rect.width/2),
                      y: Math.round(rect.y + rect.height/2)
                    };
                  }
                }
                return { success: false, error: 'No clickable input found' };
              })();
            `);
            if (clickResult && clickResult.success) {
              return toolSuccess(`Clicked and focused ${clickResult.element} (${clickResult.selector}) at ${clickResult.x}, ${clickResult.y}`);
            }
            return toolError(clickResult?.error || 'coordinate required for left_click and no input found to auto-focus');

          case 'right_click':
            if (!coordinate) return toolError('coordinate required for right_click');
            await page.mouseDown(coordinate[0], coordinate[1], 'right');
            await page.mouseUp(coordinate[0], coordinate[1], 'right');
            return toolSuccess(`Right clicked at ${coordinate[0]}, ${coordinate[1]}`);

          case 'double_click':
            if (!coordinate) return toolError('coordinate required for double_click');
            await page.click(coordinate[0], coordinate[1], 'left');
            await page.click(coordinate[0], coordinate[1], 'left'); // Simplified double click
            return toolSuccess(`Double clicked at ${coordinate[0]}, ${coordinate[1]}`);

          case 'left_click_drag':
            if (!coordinate) return toolError('coordinate required for left_click_drag (start point)');
            // This implies we are already at some point? Or this is the destination?
            // Scrapybara's DragMouseAction takes a path.
            // Here we simplify: "drag from current to coordinate" or "drag from coordinate to text"?
            // Let's assume this tool moves TO `coordinate` with button down.
            // But we need to know where we started.
            // If the model sends 'mouse_move' to start, then 'left_click_drag' to end...
            // But sendInputEvent needs x,y for every event.
            // Let's implement simplistic drag: Move to coord (drag destination) with button down?
            // Or drag FROM coordinate?
            // Standard: Move to Start -> Mouse Down -> Move to End -> Mouse Up.
            // The tool call might need start AND end.
            // For now, let's omit complex drag or implement it as "Drag to this coordinate from wherever you are".
            // But we don't know "wherever you are" in the stateless tool call easily without querying cursor.
            // Let's skip drag for now or make it explicit in args if needed.
            return toolError('left_click_drag not fully implemented yet');

          case 'type':
            if (!text) return toolError('text required for type');
            await page.type(text);
            // Note: We do NOT auto-press Enter here - the agent should explicitly press Enter if needed
            // This gives more control and avoids unintended form submissions
            return toolSuccess(`Typed "${text}"`);

          case 'key':
            if (!key) return toolError('key required for key action');
            await page.pressKey(key); // Uses existing pressKey implementation
            return toolSuccess(`Pressed key "${key}"`);

          case 'screenshot':
            const result = await page.takeScreenshot();
            if (result && result.success) {
              return {
                ok: true,
                output: 'Screenshot taken',
                data: result.data // Base64 image
              };
            }
            return toolError('Failed to take screenshot');

          default:
            return toolError(`Unknown action: ${action}`);
        }
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Computer tool error: ${error.message}`);
      }
    }
  };
}

module.exports = { createComputerTool };
