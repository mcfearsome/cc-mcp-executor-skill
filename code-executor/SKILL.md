---
name: code-executor
description: Execute TypeScript or Python code to dynamically call multiple MCP tools in a single operation. Use when you need to compose multiple MCP tool calls, process their results together, or reduce token overhead from many MCP tools. Provides progressive disclosure pattern for efficient context usage.
---

# Code Executor Skill

## Overview

This skill teaches Claude Code how to use code execution to efficiently compose multiple MCP tool operations. Instead of making sequential direct tool calls, you can write TypeScript or Python code that calls multiple MCP tools dynamically, processes their results, and returns aggregated data.

### Key Benefits

**Progressive Disclosure**: Reduce token overhead by ~98% when working with many MCP servers. Instead of loading all 47+ tool schemas upfront (141k tokens), load only what's needed (1.6k tokens).

**Composition**: Combine multiple MCP operations in a single execution with complex logic, data transformations, and conditional flows.

**Efficiency**: Process results from multiple tools together, apply transformations, and return exactly what's needed.

**Cached Patterns**: Reference proven script examples in `scripts/` directory instead of generating code from scratch.

### When to Use vs. Direct Tool Calls

**✅ USE CODE EXECUTION when:**
- Composing multiple MCP operations (3+ tool calls)
- Complex conditional logic based on tool results
- Processing/transforming results from multiple tools together
- Reducing token overhead with many MCP servers configured
- Implementing retry logic or error recovery patterns
- Parallel execution of independent operations

**❌ USE DIRECT TOOL CALLS when:**
- Simple single-tool operations
- Straightforward reads/writes without processing
- When direct tool call is clearer and simpler
- UI-focused interactions (use slash commands instead)

## Quick Start

### TypeScript Pattern

```typescript
// Basic single tool call
const result = await callMCPTool('mcp__filesystem__readFile', {
  path: '/data/config.json'
});

// Multi-tool composition
const files = await callMCPTool('mcp__filesystem__listDirectory', {
  path: '/data'
});

const contents = await Promise.all(
  files.map(file => callMCPTool('mcp__filesystem__readFile', {
    path: file.path
  }))
);

const processed = contents.map(content => JSON.parse(content));
return { files: processed };
```

### Python Pattern

```python
# Basic single tool call
result = await call_mcp_tool('mcp__filesystem__read_file', {
    'path': '/data/config.json'
})

# Multi-tool composition
files = await call_mcp_tool('mcp__filesystem__list_directory', {
    'path': '/data'
})

contents = await asyncio.gather(*[
    call_mcp_tool('mcp__filesystem__read_file', {'path': f['path']})
    for f in files
])

processed = [json.loads(c) for c in contents]
return {'files': processed}
```

## Using Cached Scripts

This skill includes a library of proven patterns you can reference and adapt:

### Templates (Starting Points)

Located in `templates/` - minimal starting points with TODOs:
- `basic-typescript.template.ts` - Single tool call skeleton
- `basic-python.template.py` - Single tool call skeleton
- `multi-tool.template.ts` - Multiple tool composition structure
- `multi-tool.template.py` - Multiple tool composition structure

### Pattern Scripts (Complete Examples)

Located in `scripts/typescript/` and `scripts/python/`:

**`multi-tool-workflow`** - Sequential operations with data flow
- Example: List files → Read → Process → Write results
- Use when: Building data processing pipelines

**`file-processing`** - File system operations patterns
- Example: Read directory → Filter → Process each → Aggregate
- Use when: Working with multiple files or directories

**`parallel-execution`** - Concurrent tool calls
- Example: Execute multiple independent operations simultaneously
- Use when: Operations don't depend on each other (Promise.all/asyncio.gather)

**`error-recovery`** - Retry logic and fallback strategies
- Example: Try primary tool → Catch error → Fallback to alternative
- Use when: Dealing with unreliable operations or need resilience

**`conditional-logic`** - Dynamic tool selection
- Example: Check conditions → Call appropriate tools based on data
- Use when: Different workflows for different scenarios

**`data-aggregation`** - Combining results from multiple sources
- Example: Call multiple APIs → Transform → Merge results
- Use when: Building comprehensive reports or dashboards

### How to Use Cached Scripts

1. **Identify Pattern**: Find the cached script that matches your use case
2. **Read Script**: Open the script to understand the pattern and structure
3. **Study Header**: Review the header comment for adaptation instructions
4. **Copy & Modify**: Copy relevant code and adapt for your specific needs
5. **Execute**: Use executeTypescript or executePython with your adapted code

Example:
```
See scripts/typescript/parallel-execution.ts for pattern
Adapt the Promise.all structure for your specific tools
Replace example tool names with actual MCP tools you need
```

## Tool Naming Convention

MCP tools are called using a specific naming format:

**Format**: `mcp__<server-name>__<tool-name>`

**Examples**:
- `mcp__filesystem__readFile`
- `mcp__database__query`
- `mcp__github__createPullRequest`
- `mcp__slack__sendMessage`

**Discovery**: To find available tools, check your MCP configuration or use MCP introspection capabilities.

## Common Patterns

### Sequential Workflow
```typescript
// Step 1 → Step 2 → Step 3
const data = await callMCPTool('mcp__api__fetch', { url: endpoint });
const transformed = processData(data);
const result = await callMCPTool('mcp__database__insert', { data: transformed });
```

### Parallel Execution
```typescript
// Execute multiple operations concurrently
const [users, posts, comments] = await Promise.all([
  callMCPTool('mcp__api__getUsers', {}),
  callMCPTool('mcp__api__getPosts', {}),
  callMCPTool('mcp__api__getComments', {})
]);
```

### Conditional Logic
```typescript
// Different tools based on conditions
const fileType = await callMCPTool('mcp__filesystem__getFileType', { path });

if (fileType === 'json') {
  result = await callMCPTool('mcp__json__parse', { path });
} else if (fileType === 'xml') {
  result = await callMCPTool('mcp__xml__parse', { path });
}
```

### Error Recovery
```typescript
// Try primary, fallback on error
try {
  return await callMCPTool('mcp__primary__operation', { data });
} catch (error) {
  console.log('Primary failed, trying fallback...');
  return await callMCPTool('mcp__fallback__operation', { data });
}
```

### Result Aggregation
```typescript
// Combine data from multiple sources
const sources = ['api1', 'api2', 'api3'];
const results = await Promise.all(
  sources.map(source => callMCPTool(`mcp__${source}__fetch`, {}))
);

return {
  combined: results.reduce((acc, r) => ({ ...acc, ...r }), {}),
  count: results.length
};
```

## Best Practices

### Input Validation
```typescript
// Validate inputs before calling tools
if (!path || typeof path !== 'string') {
  throw new Error('Invalid path parameter');
}
```

### Error Handling
```typescript
// Always handle errors gracefully
try {
  const result = await callMCPTool('mcp__tool__operation', { params });
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error.message);
  return { success: false, error: error.message };
}
```

### Return Structured Results
```typescript
// Return consistent, well-structured data
return {
  success: true,
  data: processedData,
  metadata: {
    toolsCalled: ['tool1', 'tool2'],
    executionTime: Date.now() - startTime
  }
};
```

### Keep Code Focused
```typescript
// Break complex operations into clear steps
// Use comments to explain non-obvious logic
// Keep functions small and focused

// Step 1: Fetch data
const rawData = await callMCPTool('mcp__api__fetch', { endpoint });

// Step 2: Transform data
const transformed = rawData.map(item => ({
  id: item.id,
  name: item.full_name,
  created: new Date(item.created_at)
}));

// Step 3: Store results
await callMCPTool('mcp__database__bulkInsert', { items: transformed });
```

### Use TypeScript Types
```typescript
// Define types for better safety
interface ApiResponse {
  id: string;
  data: unknown;
  timestamp: number;
}

const result: ApiResponse = await callMCPTool('mcp__api__fetch', {});
```

### Log Important Operations
```typescript
// Log key operations for debugging
console.log('Fetching data from endpoint:', endpoint);
const data = await callMCPTool('mcp__api__fetch', { endpoint });
console.log('Received:', data.length, 'records');
```

## Security Considerations

### Sandboxed Environment
- TypeScript code runs in a sandboxed Deno environment
- Python code runs in isolated subprocess
- Limited filesystem access (typically /tmp only)
- Network access restricted to allowed hosts
- Memory limits enforced (128MB for TypeScript)

### Execution Limits
- Execution timeout enforced (typically 30-60 seconds)
- Connection pooling limits concurrent operations (max 100)
- Rate limiting may apply based on configuration

### Audit Logging
- All code executions are logged
- Tool calls are tracked for security auditing
- Execution time and results recorded

### Safe Patterns
```typescript
// ✅ Good: Validate and sanitize inputs
const safePath = path.replace(/\.\./g, '').replace(/^\//, '');

// ❌ Bad: Don't execute arbitrary code from external sources
// const code = await fetchCodeFromUrl(url);
// eval(code); // NEVER DO THIS

// ✅ Good: Use explicit tool allowlists
const allowedTools = ['mcp__filesystem__read', 'mcp__filesystem__write'];
if (!allowedTools.includes(toolName)) {
  throw new Error('Tool not allowed');
}
```

## Advanced Topics

For more detailed information, see:
- `TYPESCRIPT_GUIDE.md` - Deep dive on TypeScript execution, Deno environment, advanced patterns
- `PYTHON_GUIDE.md` - Deep dive on Python execution, async patterns, available modules
- `EXAMPLES.md` - Complete real-world examples with full context
- `REFERENCE.md` - API reference for callMCPTool, return values, error formats

## Workflow Summary

1. **Identify Need**: Recognize when code execution is more efficient than direct tool calls
2. **Find Pattern**: Check `scripts/` directory for similar cached pattern
3. **Adapt Code**: Copy and modify pattern for your specific use case
4. **Validate**: Ensure proper error handling and input validation
5. **Execute**: Use executeTypescript or executePython tool
6. **Review**: Check results and refine if needed

Remember: Code execution is powerful but adds complexity. Use it when the benefits (composition, efficiency, progressive disclosure) outweigh the simplicity of direct tool calls.
