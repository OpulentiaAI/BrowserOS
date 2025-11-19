#!/usr/bin/env node

/**
 * Test script for ToolManager - Verifies AI SDK 6 Beta compatibility
 * Test case: @droid (10-581)
 */

const { ToolManager } = require('./src/agent/ToolManager');
const { tool: aiSDKTool, jsonSchema } = require('ai');

// Mock execution context
const mockExecutionContext = {
  browserContext: null
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
  }
}

function test(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    fn();
  } catch (error) {
    console.error(`❌ ERROR in ${name}:`, error.message);
    testsFailed++;
  }
}

console.log('='.repeat(60));
console.log('ToolManager Test Suite - AI SDK 6 Beta Compatibility');
console.log('Test Case: @droid (10-581)');
console.log('='.repeat(60));

// Test 1: Tool Registration
test('Tool Registration', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const testTool = {
    name: 'test_tool',
    description: 'A test tool',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    execute: async (args) => ({ result: `Processed: ${args.query}` })
  };

  toolManager.register(testTool);
  assert(toolManager.has('test_tool'), 'Tool should be registered');
  assert(toolManager.get('test_tool') === testTool, 'Tool should be retrievable');
  assert(toolManager.count() === 1, 'Tool count should be 1');
});

// Test 2: Tool without parameters
test('Tool without parameters', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const simpleTool = {
    name: 'simple_tool',
    description: 'A simple tool',
    execute: async () => ({ success: true })
  };

  toolManager.register(simpleTool);
  const aiTools = toolManager.toAISDKFormat();
  
  assert(aiTools.hasOwnProperty('simple_tool'), 'Tool should be in AI SDK format');
  assert(aiTools.simple_tool !== undefined, 'Tool object should exist');
});

// Test 3: Tool with parameters - AI SDK 6 Beta format
test('Tool with parameters - AI SDK 6 Beta format', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const searchTool = {
    name: 'search_tool',
    description: 'Search for something',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Result limit' }
      },
      required: ['query']
    },
    execute: async (args) => ({ results: [] })
  };

  toolManager.register(searchTool);
  const aiTools = toolManager.toAISDKFormat();
  
  assert(aiTools.hasOwnProperty('search_tool'), 'Search tool should be in AI SDK format');
  assert(aiTools.search_tool !== undefined, 'Search tool object should exist');
  
  // Verify the tool can be used (it should be a valid AI SDK tool)
  const tool = aiTools.search_tool;
  assert(typeof tool === 'object', 'Tool should be an object');
});

// Test 4: Multiple tools conversion
test('Multiple tools conversion', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const tools = [
    {
      name: 'tool_a',
      description: 'Tool A',
      parameters: { 
        type: 'object', 
        properties: { 
          a: { type: 'string' } 
        } 
      },
      execute: async () => ({})
    },
    {
      name: 'tool_b',
      description: 'Tool B',
      parameters: { 
        type: 'object', 
        properties: { 
          b: { type: 'number' } 
        } 
      },
      execute: async () => ({})
    }
  ];

  toolManager.registerMultiple(tools);
  const aiTools = toolManager.toAISDKFormat();
  
  assert(Object.keys(aiTools).length === 2, 'Should have 2 tools');
  assert(aiTools.hasOwnProperty('tool_a'), 'Should have tool_a');
  assert(aiTools.hasOwnProperty('tool_b'), 'Should have tool_b');
});

// Test 5: Tool with empty parameters
test('Tool with empty parameters', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const emptyParamsTool = {
    name: 'empty_params_tool',
    description: 'Tool with empty params',
    parameters: {},
    execute: async () => ({})
  };

  toolManager.register(emptyParamsTool);
  const aiTools = toolManager.toAISDKFormat();
  
  assert(aiTools.hasOwnProperty('empty_params_tool'), 'Empty params tool should be registered');
  assert(aiTools.empty_params_tool !== undefined, 'Empty params tool should exist');
});

// Test 6: Tool with required array
test('Tool with required array', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const requiredArrayTool = {
    name: 'required_array_tool',
    description: 'Tool with required array',
    parameters: {
      type: 'object',
      properties: {
        field1: { type: 'string' },
        field2: { type: 'number' }
      },
      required: ['field1']
    },
    execute: async () => ({})
  };

  toolManager.register(requiredArrayTool);
  const aiTools = toolManager.toAISDKFormat();
  
  assert(aiTools.hasOwnProperty('required_array_tool'), 'Required array tool should be registered');
  assert(aiTools.required_array_tool !== undefined, 'Required array tool should exist');
});

// Test 7: Verify JSON Schema format
test('Verify JSON Schema format compatibility', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const complexTool = {
    name: 'complex_tool',
    description: 'Complex tool with nested properties',
    parameters: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          },
          required: ['name']
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['user']
    },
    execute: async (args) => ({ processed: true })
  };

  toolManager.register(complexTool);
  const aiTools = toolManager.toAISDKFormat();
  
  assert(aiTools.hasOwnProperty('complex_tool'), 'Complex tool should be registered');
  
  // Verify the tool structure is valid
  const tool = aiTools.complex_tool;
  assert(tool !== undefined, 'Complex tool should exist');
  assert(typeof tool === 'object', 'Complex tool should be an object');
});

// Test 8: Error handling - tool without name
test('Error handling - tool without name', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  const invalidTool = {
    description: 'No name tool',
    execute: async () => {}
  };

  let errorThrown = false;
  try {
    toolManager.register(invalidTool);
  } catch (error) {
    errorThrown = true;
    assert(error.message === 'Tool must have a name', 'Should throw correct error message');
  }
  
  assert(errorThrown, 'Should throw error for tool without name');
});

// Test 9: Tool descriptions
test('Tool descriptions', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  toolManager.register({ 
    name: 'desc_tool', 
    description: 'Description test tool', 
    execute: async () => {} 
  });
  
  const descriptions = toolManager.getDescriptions();
  assert(descriptions.includes('desc_tool'), 'Descriptions should include tool name');
  assert(descriptions.includes('Description test tool'), 'Descriptions should include tool description');
});

// Test 10: Clear tools
test('Clear tools', () => {
  const toolManager = new ToolManager(mockExecutionContext);
  
  toolManager.register({ name: 'tool1', description: 'Tool 1', execute: async () => {} });
  toolManager.register({ name: 'tool2', description: 'Tool 2', execute: async () => {} });
  
  assert(toolManager.count() === 2, 'Should have 2 tools');
  
  toolManager.clear();
  assert(toolManager.count() === 0, 'Should have 0 tools after clear');
  assert(toolManager.getDescriptions() === 'No tools available.', 'Should show no tools message');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! ToolManager is compatible with AI SDK 6 Beta.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}

