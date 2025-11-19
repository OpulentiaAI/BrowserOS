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
            }
            // Click at current position (or new position if moved)
            // We need to know current position if coordinate not provided?
            // Electron sendInputEvent requires x,y.
            // If coordinate missing, we might fail or need to track state.
            // For now, require coordinate for clicks to be safe, or assume 0,0 if missing (bad).
            // Better: Planner should provide coordinates.
            if (!coordinate) return toolError('coordinate required for left_click (state tracking not fully implemented)');
            await page.click(coordinate[0], coordinate[1], 'left');
            return toolSuccess(`Left clicked at ${coordinate[0]}, ${coordinate[1]}`);

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
            // Automatically press Enter after typing to ensure submission, as this is the most common intent for "search" tasks
            // and prevents the agent from getting stuck in a "type -> nothing happens -> retry" loop.
            await page.pressKey('Enter'); 
            return toolSuccess(`Typed "${text}" and pressed Enter`);

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
