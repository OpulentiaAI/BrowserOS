/**
 * TodoSet Tool - Set or update the TODO list
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTodoSetTool(context) {
  return {
    name: 'todo_set',
    description: 'Set or update the TODO list with markdown checkboxes (- [ ] pending, - [x] done)',
    parameters: {
      type: 'object',
      properties: {
        todos: {
          type: 'string',
          description: 'Markdown formatted todo list'
        }
      },
      required: ['todos']
    },
    execute: async ({ todos }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('todo_set');

        context.setTodoList(todos);

        // Parse and add to todoStore
        const lines = todos.split('\n').filter((line) => line.trim());
        const todoItems = lines.map((line) => {
          const match = line.match(/^-\s*\[(.)\]\s*(.+)$/);
          if (match) {
            return match[2].trim();
          }
          return line.replace(/^-\s*/, '').trim();
        });

        if (todoItems.length > 0) {
          context.todoStore.reset();
          context.todoStore.addMultiple(todoItems);
        }

        return toolSuccess(`Todos updated: ${todoItems.length} items`);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to update todos: ${error.message}`);
      }
    }
  };
}

module.exports = { createTodoSetTool };
