# API Reference

Complete reference documentation for code execution with MCP tools.

## Table of Contents

1. [callMCPTool() - TypeScript](#callmcptool---typescript)
2. [call_mcp_tool() - Python](#call_mcp_tool---python)
3. [Tool Naming Convention](#tool-naming-convention)
4. [Parameter Validation](#parameter-validation)
5. [Return Values](#return-values)
6. [Error Handling](#error-handling)
7. [Execution Environment](#execution-environment)
8. [Limits and Quotas](#limits-and-quotas)

---

## callMCPTool() - TypeScript

### Function Signature

```typescript
async function callMCPTool(
  toolName: string,
  parameters: Record<string, any>
): Promise<any>
```

### Parameters

#### toolName: string

The name of the MCP tool to call in the format `mcp__<server>__<tool>`.

**Format**: `mcp__<server-name>__<tool-name>`

**Rules**:
- Must start with `mcp__`
- Server and tool names separated by double underscore `__`
- Case-sensitive (must match exact tool registration)
- No spaces or special characters except underscore

**Examples**:
```typescript
'mcp__filesystem__readFile'
'mcp__database__query'
'mcp__github__createPullRequest'
'mcp__slack__sendMessage'
```

#### parameters: Record<string, any>

An object containing the parameters for the tool call.

**Rules**:
- Must be a valid JavaScript object
- Keys must match tool's schema parameter names
- Values must match expected types
- All required parameters must be included
- Optional parameters can be omitted

**Example**:
```typescript
{
  path: '/tmp/data.json',
  encoding: 'utf-8'
}
```

### Return Value

Returns a `Promise<any>` that resolves to the tool's result.

**Type**: Depends on the specific tool being called

**Common patterns**:
- Object: `{ data: [...], metadata: {...} }`
- Array: `[{ id: 1, name: 'foo' }, ...]`
- String: `"file contents..."`
- Number: `42`
- Boolean: `true`

**Example**:
```typescript
const result = await callMCPTool('mcp__database__query', {
  table: 'users',
  limit: 10
});
// result: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, ...]
```

### Errors

Throws an error if:
- Tool name is invalid or not found
- Parameters don't match schema
- Tool execution fails
- Network timeout occurs
- Permission denied

**Error Properties**:
```typescript
{
  message: string;    // Human-readable error description
  code?: string;      // Error code (if available)
  details?: any;      // Additional error details
}
```

### Usage Examples

**Simple call**:
```typescript
const content = await callMCPTool('mcp__filesystem__readFile', {
  path: '/tmp/config.json'
});
```

**With error handling**:
```typescript
try {
  const result = await callMCPTool('mcp__api__fetch', {
    url: 'https://api.example.com/data'
  });
  console.log('Success:', result);
} catch (error) {
  console.error('Failed:', error.message);
}
```

**Parallel execution**:
```typescript
const [users, posts] = await Promise.all([
  callMCPTool('mcp__db__query', { table: 'users' }),
  callMCPTool('mcp__db__query', { table: 'posts' })
]);
```

---

## call_mcp_tool() - Python

### Function Signature

```python
async def call_mcp_tool(
    tool_name: str,
    parameters: Dict[str, Any]
) -> Any
```

### Parameters

#### tool_name: str

The name of the MCP tool to call in the format `mcp__<server>__<tool>`.

**Format**: `mcp__<server-name>__<tool-name>`

**Rules**: Same as TypeScript version

**Examples**:
```python
'mcp__filesystem__read_file'
'mcp__database__query'
'mcp__github__create_pull_request'
```

#### parameters: Dict[str, Any]

A dictionary containing the parameters for the tool call.

**Rules**:
- Must be a valid Python dictionary
- Keys must match tool's schema parameter names
- Values must match expected types
- All required parameters must be included

**Example**:
```python
{
    'path': '/tmp/data.json',
    'encoding': 'utf-8'
}
```

### Return Value

Returns the tool's result (type depends on the tool).

**Common patterns**:
- Dict: `{'data': [...], 'metadata': {...}}`
- List: `[{'id': 1, 'name': 'foo'}, ...]`
- String: `"file contents..."`
- Number: `42`
- Boolean: `True`

### Errors

Raises an exception if:
- Tool name is invalid or not found
- Parameters don't match schema
- Tool execution fails
- Network timeout occurs
- Permission denied

**Exception Type**: `Exception` (or specific subclasses)

### Usage Examples

**Simple call**:
```python
content = await call_mcp_tool('mcp__filesystem__read_file', {
    'path': '/tmp/config.json'
})
```

**With error handling**:
```python
try:
    result = await call_mcp_tool('mcp__api__fetch', {
        'url': 'https://api.example.com/data'
    })
    print(f'Success: {result}')
except Exception as error:
    print(f'Failed: {error}')
```

**Parallel execution**:
```python
import asyncio

users, posts = await asyncio.gather(
    call_mcp_tool('mcp__db__query', {'table': 'users'}),
    call_mcp_tool('mcp__db__query', {'table': 'posts'})
)
```

---

## Tool Naming Convention

### Format

```
mcp__<server-name>__<tool-name>
```

### Components

**Prefix**: Always `mcp__`

**Server Name**:
- Name of the MCP server providing the tool
- Lowercase with underscores for multi-word names
- Examples: `filesystem`, `github`, `my_custom_server`

**Tool Name**:
- Name of the specific tool operation
- Lowercase with underscores for multi-word names
- Examples: `read_file`, `create_pull_request`, `send_message`

### Discovering Tool Names

To find available tools in your MCP configuration:

1. Check MCP server documentation
2. Look at `.mcp.json` configuration file
3. Use MCP introspection (if available):
   ```typescript
   const tools = await callMCPTool('mcp__meta__listTools', {});
   ```

### Naming Variations

Different MCP servers may use different naming conventions:

**CamelCase**:
```typescript
'mcp__github__createPullRequest'
```

**snake_case**:
```python
'mcp__github__create_pull_request'
```

**Always match the exact naming used in the server configuration.**

---

## Parameter Validation

### Schema Compliance

All parameters must match the tool's JSON schema definition.

**Required Parameters**:
```typescript
// If schema requires 'path' parameter:
await callMCPTool('mcp__fs__read', {
  path: '/tmp/data.json'  // ✅ Required parameter provided
});

await callMCPTool('mcp__fs__read', {});  // ❌ Missing required parameter
```

**Optional Parameters**:
```typescript
// Optional parameters can be omitted:
await callMCPTool('mcp__fs__read', {
  path: '/tmp/data.json'
  // encoding is optional, can be omitted
});

// Or included:
await callMCPTool('mcp__fs__read', {
  path: '/tmp/data.json',
  encoding: 'utf-8'  // ✅ Optional parameter provided
});
```

### Type Validation

Parameters must match expected types:

**String**:
```typescript
{ name: 'value' }          // ✅
{ name: 123 }              // ❌ Expected string, got number
```

**Number**:
```typescript
{ count: 42 }              // ✅
{ count: '42' }            // ❌ Expected number, got string
```

**Boolean**:
```typescript
{ enabled: true }          // ✅
{ enabled: 'true' }        // ❌ Expected boolean, got string
```

**Array**:
```typescript
{ items: [1, 2, 3] }       // ✅
{ items: '1,2,3' }         // ❌ Expected array, got string
```

**Object**:
```typescript
{ config: { key: 'val' } } // ✅
{ config: 'key=val' }      // ❌ Expected object, got string
```

### Validation Errors

Common validation errors:

```typescript
// Missing required parameter
Error: Missing required parameter 'path'

// Wrong type
Error: Parameter 'count' must be a number

// Invalid value
Error: Parameter 'method' must be one of: GET, POST, PUT, DELETE

// Extra parameters
Error: Unknown parameter 'invalid_param'
```

---

## Return Values

### Common Return Patterns

**Success Object**:
```typescript
{
  success: true,
  data: { /* result data */ },
  metadata: { /* optional metadata */ }
}
```

**Array of Items**:
```typescript
[
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
]
```

**Primitive Value**:
```typescript
"file contents as string"
42
true
null
```

**Paginated Results**:
```typescript
{
  items: [ /* data */ ],
  total: 100,
  page: 1,
  hasMore: true
}
```

### Type Safety

**TypeScript - Define interfaces**:
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = await callMCPTool('mcp__db__query', {
  table: 'users'
});
```

**Python - Use TypedDict**:
```python
from typing import TypedDict, List

class User(TypedDict):
    id: int
    name: str
    email: str

users: List[User] = await call_mcp_tool('mcp__db__query', {
    'table': 'users'
})
```

---

## Error Handling

### Error Types

**Tool Not Found**:
```
Error: MCP tool 'mcp__invalid__tool' not found
```

**Parameter Validation**:
```
Error: Missing required parameter 'path'
Error: Parameter 'count' must be a number
```

**Execution Failure**:
```
Error: Failed to read file: Permission denied
Error: Database connection timeout
```

**Network Errors**:
```
Error: Request timeout after 30000ms
Error: Network unreachable
```

### Error Handling Patterns

**Basic try-catch**:
```typescript
try {
  const result = await callMCPTool('mcp__tool__op', { params });
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}
```

**Retry with backoff**:
```typescript
async function callWithRetry(tool: string, params: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callMCPTool(tool, params);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

**Fallback strategy**:
```typescript
let result;
try {
  result = await callMCPTool('mcp__primary__fetch', { id });
} catch (error) {
  console.warn('Primary failed, trying fallback');
  result = await callMCPTool('mcp__fallback__fetch', { id });
}
```

**Partial failure handling**:
```typescript
const results = await Promise.allSettled([
  callMCPTool('mcp__api1__fetch', {}),
  callMCPTool('mcp__api2__fetch', {}),
  callMCPTool('mcp__api3__fetch', {})
]);

const successes = results.filter(r => r.status === 'fulfilled');
const failures = results.filter(r => r.status === 'rejected');
```

---

## Execution Environment

### TypeScript (Deno)

**Runtime**: Deno 1.x+

**Features Available**:
- ES2022 JavaScript
- TypeScript type checking
- Async/await
- Promises
- Standard library
- Web APIs (fetch, etc.)

**Not Available**:
- Node.js APIs (`require`, `process`, etc.)
- NPM packages
- Direct filesystem access outside /tmp
- Unrestricted network access

### Python

**Runtime**: Python 3.8+

**Features Available**:
- Python standard library
- async/await with asyncio
- Common third-party packages (requests, etc.)

**Not Available**:
- Direct filesystem access outside /tmp
- Unrestricted network access
- System-level operations

### Permissions

**Filesystem**:
- Read/write: `/tmp` directory only
- No access to: `/etc`, `/home`, system directories

**Network**:
- Restricted to allowed hosts
- Localhost reserved for MCP proxy
- Cannot access arbitrary external hosts

**Environment**:
- No access to environment variables
- No system command execution

---

## Limits and Quotas

### Execution Limits

**Timeout**:
- Default: 30-60 seconds (configurable)
- Exceeding timeout results in termination

**Memory**:
- TypeScript: 128MB heap limit
- Python: System-dependent memory limits

**CPU**:
- Fair-use CPU scheduling
- Long-running operations may be throttled

### Concurrency

**Connection Pool**:
- Maximum 100 concurrent MCP tool calls
- Requests queued if pool is full
- Automatic retry on pool exhaustion

**Rate Limiting**:
- May vary by MCP server configuration
- Typically 100-1000 requests per minute
- Rate limit errors returned if exceeded

### Size Limits

**Request Size**:
- Maximum parameter payload: 10MB
- Large files should use streaming APIs

**Response Size**:
- Maximum response size: 50MB
- Larger responses may be truncated

### Quotas

Check with your MCP server administrator for specific quotas:
- Daily request limits
- Storage limits
- API call limits
- Custom quotas per tool

---

## Debugging

### Logging

```typescript
// Log tool calls for debugging
console.log('Calling tool:', toolName, parameters);
const result = await callMCPTool(toolName, parameters);
console.log('Result:', result);
```

### Timing

```typescript
const start = Date.now();
const result = await callMCPTool('mcp__tool__op', { params });
const duration = Date.now() - start;
console.log(`Operation took ${duration}ms`);
```

### Error Details

```typescript
try {
  await callMCPTool('mcp__tool__op', { params });
} catch (error) {
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
}
```

---

## See Also

- `SKILL.md` - Main skill documentation
- `TYPESCRIPT_GUIDE.md` - TypeScript patterns and examples
- `PYTHON_GUIDE.md` - Python patterns and examples
- `EXAMPLES.md` - Real-world usage examples
