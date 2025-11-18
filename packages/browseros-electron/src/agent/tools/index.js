/**
 * Tools Index - Export all agent tools
 * 
 * Import and register these tools with the ToolManager for use in agents.
 */

// Essential browser actions
const { createNavigateTool } = require('./navigate');
const { createClickTool } = require('./click');
const { createTypeTool } = require('./type');
const { createScreenshotTool } = require('./screenshot');
const { createExtractTool } = require('./extract');
const { createDoneTool } = require('./done');
const { createWaitTool } = require('./wait');
const { createScrollTool } = require('./scroll');
const { createKeyTool } = require('./key');
const { createClearTool } = require('./clear');

// Tab management
const { createTabsTool } = require('./tabs');
const { createTabOpenTool } = require('./tabOpen');
const { createTabFocusTool } = require('./tabFocus');
const { createTabCloseTool } = require('./tabClose');

// TODO/Planning
const { createTodoSetTool } = require('./todoSet');
const { createTodoGetTool } = require('./todoGet');
const { createPlannerTool } = require('./planner');

// Advanced
const { createHumanInputTool } = require('./humanInput');
const { createVisualClickTool } = require('./visualClick');
const { createVisualTypeTool } = require('./visualType');
const { createClickAtCoordinatesTool } = require('./clickAtCoordinates');
const { createTypeAtCoordinatesTool } = require('./typeAtCoordinates');
const { createGrepElementsTool } = require('./grepElements');
const { createGetSelectedTabsTool } = require('./getSelectedTabsTool');
const { createGroupTabsTool } = require('./groupTabsTool');
const { createCelebrationTool } = require('./celebration');
const { createDateTool } = require('./dateTool');
const { createBrowserOSInfoTool } = require('./browserOSInfoTool');
const { createMCPTool } = require('./mcpTool');

/**
 * Create all tools for a given execution context
 * @param {ExecutionContext} context - The execution context
 * @returns {Array} - Array of all tools
 */
function createAllTools(context) {
  return [
    // Essential browser actions
    createNavigateTool(context),
    createClickTool(context),
    createTypeTool(context),
    createScreenshotTool(context),
    createExtractTool(context),
    createDoneTool(context),
    createWaitTool(context),
    createScrollTool(context),
    createKeyTool(context),
    createClearTool(context),
    
    // Tab management
    createTabsTool(context),
    createTabOpenTool(context),
    createTabFocusTool(context),
    createTabCloseTool(context),
    
    // TODO/Planning
    createTodoSetTool(context),
    createTodoGetTool(context),
    createPlannerTool(context),
    
    // Advanced
    createHumanInputTool(context),
    createVisualClickTool(context),
    createVisualTypeTool(context),
    createClickAtCoordinatesTool(context),
    createTypeAtCoordinatesTool(context),
    createGrepElementsTool(context),
    createGetSelectedTabsTool(context),
    createGroupTabsTool(context),
    createCelebrationTool(context),
    createDateTool(context),
    createBrowserOSInfoTool(context),
    createMCPTool(context)
  ];
}

/**
 * Create essential tools only (for faster initialization or limited contexts)
 * @param {ExecutionContext} context - The execution context
 * @returns {Array} - Array of essential tools
 */
function createEssentialTools(context) {
  return [
    createNavigateTool(context),
    createClickTool(context),
    createTypeTool(context),
    createScreenshotTool(context),
    createExtractTool(context),
    createDoneTool(context),
    createWaitTool(context),
    createScrollTool(context),
    createKeyTool(context)
  ];
}

/**
 * Create tab management tools only
 * @param {ExecutionContext} context - The execution context
 * @returns {Array} - Array of tab management tools
 */
function createTabTools(context) {
  return [
    createTabsTool(context),
    createTabOpenTool(context),
    createTabFocusTool(context),
    createTabCloseTool(context)
  ];
}

module.exports = {
  // Individual tool creators
  createNavigateTool,
  createClickTool,
  createTypeTool,
  createScreenshotTool,
  createExtractTool,
  createDoneTool,
  createWaitTool,
  createScrollTool,
  createKeyTool,
  createClearTool,
  createTabsTool,
  createTabOpenTool,
  createTabFocusTool,
  createTabCloseTool,
  createTodoSetTool,
  createTodoGetTool,
  createPlannerTool,
  createHumanInputTool,
  createVisualClickTool,
  createVisualTypeTool,
  createClickAtCoordinatesTool,
  createTypeAtCoordinatesTool,
  createGrepElementsTool,
  createGetSelectedTabsTool,
  createGroupTabsTool,
  createCelebrationTool,
  createDateTool,
  createBrowserOSInfoTool,
  createMCPTool,
  
  // Batch creators
  createAllTools,
  createEssentialTools,
  createTabTools
};
