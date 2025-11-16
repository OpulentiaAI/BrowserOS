/**
 * TodoGet Tool - Get the current TODO list
 */

const { toolSuccess, toolError } = require('../ToolInterface');

function createTodoGetTool(context) {
  return {
    name: 'todo_get',
    description: 'Get the current TODO list',
    parameters: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['xml', 'json', 'markdown'],
          description: 'Format to return the todos in (default: json)'
        }
      }
    },
    execute: async ({ format = 'json' }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('todo_get');

        let output;
        if (format === 'xml') {
          output = context.todoStore.getXml();
        } else if (format === 'json') {
          output = context.todoStore.getJson();
        } else {
          // markdown
          const todos = context.todoStore.getAll();
          output = todos.map((todo) => {
            const checkbox = todo.status === 'done' ? '[x]' : '[ ]';
            return `- ${checkbox} ${todo.content}`;
          }).join('\n');
        }

        return toolSuccess(output);
      } catch (error) {
        context.incrementMetric('errors');
        return toolError(`Failed to get todos: ${error.message}`);
      }
    }
  };
}

module.exports = { createTodoGetTool };
