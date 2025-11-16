/**
 * Tool interface utilities for Electron agents.
 * 
 * Defines structured output format for tools: { ok: boolean, output: string }
 * and provides helper functions for creating success/error responses.
 */

/**
 * Create a successful tool output
 * @param {string} message - Success message
 * @returns {{ok: boolean, output: string}}
 */
function toolSuccess(message) {
  return { ok: true, output: message };
}

/**
 * Create an error tool output
 * @param {string} message - Error message
 * @returns {{ok: boolean, output: string}}
 */
function toolError(message) {
  return { ok: false, output: message };
}

module.exports = {
  toolSuccess,
  toolError
};
