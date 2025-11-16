/**
 * TodoStore for managing task TODOs in Electron agent runtime.
 * 
 * Simplified port from BrowserOS agent that tracks TODO items for complex
 * multi-step tasks. Supports marking items as todo/doing/done/skipped.
 */

class TodoStore {
  constructor() {
    this.todos = [];
    this.maxTodos = 30;
  }

  getAll() {
    return [...this.todos];
  }

  addMultiple(contents) {
    const startId = this.todos.length + 1;
    const newTodos = contents.map((content, index) => ({
      id: startId + index,
      content,
      status: 'todo'
    }));

    this.todos.push(...newTodos);
    if (this.todos.length > this.maxTodos) {
      this.todos = this.todos.slice(0, this.maxTodos);
    }
  }

  complete(id) {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.status = 'done';
    }
  }

  completeMultiple(ids) {
    ids.forEach((id) => {
      this.complete(id);
    });
  }

  goBack(id) {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return;
    for (let i = index; i < this.todos.length; i += 1) {
      this.todos[i].status = 'todo';
    }
  }

  skip(id) {
    this.todos = this.todos.filter((t) => t.id !== id);
    this._reindex();
  }

  markDoing(id) {
    const existing = this.todos.find((t) => t.status === 'doing');
    if (existing && existing.id !== id) {
      throw new Error(`TODO ${existing.id} already in progress`);
    }
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.status = 'doing';
    }
  }

  getCurrentDoing() {
    return this.todos.find((t) => t.status === 'doing') || null;
  }

  getPending() {
    return this.todos.filter((t) => t.status === 'todo');
  }

  getNextTodo() {
    const current = this.getCurrentDoing();
    if (current) return current;
    const pending = this.getPending();
    if (pending.length === 0) return null;
    this.markDoing(pending[0].id);
    return pending[0];
  }

  isAllDoneOrSkipped() {
    return this.todos.every((t) => t.status === 'done' || t.status === 'skipped');
  }

  replaceAll(contents) {
    this.todos = [];
    this.addMultiple(contents);
  }

  reset() {
    this.todos = [];
  }

  getXml() {
    if (this.todos.length === 0) {
      return '<todos></todos>';
    }
    const todoElements = this.todos.map(todo =>
      `<todo id="${todo.id}" status="${todo.status}">${this._escapeXml(todo.content)}</todo>`
    ).join('\n');
    return `<todos>\n${todoElements}\n</todos>`;
  }

  getJson() {
    return [...this.todos];
  }

  _reindex() {
    this.todos.forEach((todo, index) => {
      todo.id = index + 1;
    });
  }

  _escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = {
  TodoStore
};
