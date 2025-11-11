# TypeScript Execution Guide

This guide provides detailed information about writing TypeScript code for MCP tool execution in the Deno environment.

## Deno Environment Overview

Your TypeScript code executes in a sandboxed Deno runtime with specific permissions and constraints.

### Available Features

**Standard Library**:
- All TypeScript/JavaScript ES2022 features
- Async/await and Promises
- Array methods (map, filter, reduce, etc.)
- Object manipulation
- JSON parsing and stringification
- Console logging
- Date and time operations
- Math operations
- Regular expressions

**Deno-Specific**:
- No Node.js APIs (use Deno equivalents)
- No `require()` (use ES modules with `import`)
- No `process` global (use Deno equivalents)
- Web-standard APIs (fetch, Response, Request, etc.)

### Permissions

Your code runs with restricted permissions:

```typescript
// ✅ Allowed
await callMCPTool('mcp__filesystem__read', { path: '/tmp/data.json' });
console.log('Logging is allowed');
const data = JSON.parse(jsonString);

// ❌ Not allowed (will fail)
// Deno.readTextFile('/etc/passwd'); // Filesystem access outside /tmp
// fetch('https://malicious-site.com'); // Network access to non-allowed hosts
// Deno.env.get('SECRET_KEY'); // Environment variable access blocked
```

### Memory Limits

- Maximum heap size: 128MB
- Execution timeout: 30-60 seconds (configurable)
- Stack size limits enforced

## callMCPTool() Function

### Signature

```typescript
async function callMCPTool(
  toolName: string,
  parameters: Record<string, any>
): Promise<any>
```

### Parameters

**toolName**: String in format `mcp__<server>__<tool>`
- Must be an exact match to configured MCP tool
- Case-sensitive
- Example: `'mcp__filesystem__readFile'`

**parameters**: Object containing tool-specific parameters
- Must match the tool's JSON schema
- All required parameters must be included
- Types must match schema (string, number, boolean, object, array)

### Return Value

Returns a Promise that resolves to the tool's result. The structure depends on the specific tool, but typically:

```typescript
{
  // Tool-specific data
  // Could be any valid JSON value
}
```

### Error Handling

Throws an error if:
- Tool name is invalid or not found
- Parameters don't match schema
- Tool execution fails
- Network timeout occurs
- Permission denied

```typescript
try {
  const result = await callMCPTool('mcp__tool__operation', {
    param1: 'value'
  });
  return result;
} catch (error) {
  // error.message contains description
  // error.code may contain error code
  console.error('Tool call failed:', error);
  throw error; // Re-throw or handle
}
```

## TypeScript Patterns

### Basic Tool Call

```typescript
// Simple synchronous-style call (but actually async)
const fileContent = await callMCPTool('mcp__filesystem__readFile', {
  path: '/tmp/config.json'
});

const parsed = JSON.parse(fileContent);
console.log('Config loaded:', parsed);
```

### Multiple Sequential Calls

```typescript
// Execute one after another
const files = await callMCPTool('mcp__filesystem__listDirectory', {
  path: '/tmp/data'
});

console.log(`Found ${files.length} files`);

for (const file of files) {
  const content = await callMCPTool('mcp__filesystem__readFile', {
    path: file.path
  });

  console.log(`Processing ${file.name}...`);
  // Process content
}
```

### Parallel Execution

```typescript
// Execute multiple independent calls concurrently
const [users, posts, settings] = await Promise.all([
  callMCPTool('mcp__database__query', {
    table: 'users',
    limit: 100
  }),
  callMCPTool('mcp__database__query', {
    table: 'posts',
    limit: 100
  }),
  callMCPTool('mcp__config__get', {
    key: 'app_settings'
  })
]);

console.log('Fetched:', users.length, 'users and', posts.length, 'posts');
```

### Partial Failure Handling

```typescript
// Use Promise.allSettled to handle partial failures
const results = await Promise.allSettled([
  callMCPTool('mcp__api1__fetch', {}),
  callMCPTool('mcp__api2__fetch', {}),
  callMCPTool('mcp__api3__fetch', {})
]);

const successes = results.filter(r => r.status === 'fulfilled');
const failures = results.filter(r => r.status === 'rejected');

console.log(`Success: ${successes.length}, Failed: ${failures.length}`);

return {
  data: successes.map(r => (r as PromiseFulfilledResult<any>).value),
  errors: failures.map(r => (r as PromiseRejectedResult).reason)
};
```

### Conditional Logic

```typescript
// Make decisions based on tool results
const fileInfo = await callMCPTool('mcp__filesystem__stat', {
  path: '/tmp/data.txt'
});

let content;
if (fileInfo.size > 1000000) {
  // Large file - read in chunks
  content = await callMCPTool('mcp__filesystem__readFileChunked', {
    path: '/tmp/data.txt',
    chunkSize: 100000
  });
} else {
  // Small file - read all at once
  content = await callMCPTool('mcp__filesystem__readFile', {
    path: '/tmp/data.txt'
  });
}
```

### Retry Logic with Exponential Backoff

```typescript
async function callWithRetry(
  toolName: string,
  params: Record<string, any>,
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callMCPTool(toolName, params);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
const result = await callWithRetry('mcp__api__fetch', { url: endpoint });
```

### Data Transformation Pipeline

```typescript
// Complex data processing workflow
interface RawData {
  id: string;
  created_at: string;
  user_name: string;
}

interface ProcessedData {
  id: string;
  createdDate: Date;
  userName: string;
  processed: boolean;
}

// Fetch raw data
const rawData: RawData[] = await callMCPTool('mcp__api__fetch', {
  endpoint: '/api/data'
});

// Transform
const processed: ProcessedData[] = rawData.map(item => ({
  id: item.id,
  createdDate: new Date(item.created_at),
  userName: item.user_name,
  processed: true
}));

// Filter
const recent = processed.filter(item => {
  const daysSince = (Date.now() - item.createdDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 7;
});

// Store results
await callMCPTool('mcp__database__bulkInsert', {
  table: 'processed_data',
  records: recent
});

return { processed: recent.length, total: rawData.length };
```

### Error Aggregation

```typescript
// Collect and report errors from multiple operations
const operations = [
  { tool: 'mcp__service1__sync', params: {} },
  { tool: 'mcp__service2__sync', params: {} },
  { tool: 'mcp__service3__sync', params: {} }
];

const errors: Array<{ tool: string; error: string }> = [];
const successes: Array<{ tool: string; result: any }> = [];

for (const op of operations) {
  try {
    const result = await callMCPTool(op.tool, op.params);
    successes.push({ tool: op.tool, result });
    console.log(`✓ ${op.tool} succeeded`);
  } catch (error) {
    errors.push({ tool: op.tool, error: error.message });
    console.error(`✗ ${op.tool} failed:`, error.message);
  }
}

return {
  summary: {
    total: operations.length,
    succeeded: successes.length,
    failed: errors.length
  },
  successes,
  errors
};
```

## Type Safety

### Defining Interfaces

```typescript
// Define types for tool parameters
interface ReadFileParams {
  path: string;
  encoding?: string;
}

interface FileContent {
  content: string;
  size: number;
  mimeType: string;
}

// Use types for safety
const params: ReadFileParams = {
  path: '/tmp/data.json',
  encoding: 'utf-8'
};

const result: FileContent = await callMCPTool('mcp__filesystem__readFile', params);
```

### Generic Helper Functions

```typescript
// Create reusable typed helpers
async function fetchTyped<T>(toolName: string, params: Record<string, any>): Promise<T> {
  const result = await callMCPTool(toolName, params);
  return result as T;
}

interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe call
const users = await fetchTyped<User[]>('mcp__database__query', {
  table: 'users'
});

// Now TypeScript knows users is User[]
console.log(users[0].email); // Type-safe access
```

## Performance Optimization

### Minimize Tool Calls

```typescript
// ❌ Bad: Multiple small calls
for (const id of userIds) {
  await callMCPTool('mcp__database__getUser', { id });
}

// ✅ Good: Batch call
const users = await callMCPTool('mcp__database__batchGet', {
  table: 'users',
  ids: userIds
});
```

### Use Parallel Execution

```typescript
// ❌ Bad: Sequential when order doesn't matter
const data1 = await callMCPTool('mcp__api1__fetch', {});
const data2 = await callMCPTool('mcp__api2__fetch', {});
const data3 = await callMCPTool('mcp__api3__fetch', {});

// ✅ Good: Parallel
const [data1, data2, data3] = await Promise.all([
  callMCPTool('mcp__api1__fetch', {}),
  callMCPTool('mcp__api2__fetch', {}),
  callMCPTool('mcp__api3__fetch', {})
]);
```

### Cache Results

```typescript
// Cache expensive results
const cache = new Map<string, any>();

async function getCached(key: string, fetcher: () => Promise<any>): Promise<any> {
  if (cache.has(key)) {
    console.log('Cache hit for:', key);
    return cache.get(key);
  }

  console.log('Cache miss for:', key);
  const result = await fetcher();
  cache.set(key, result);
  return result;
}

// Usage
const config = await getCached('app_config', () =>
  callMCPTool('mcp__config__get', { key: 'app_config' })
);
```

## Debugging

### Logging Best Practices

```typescript
// Log execution flow
console.log('=== Starting data sync ===');
console.log('Fetching users...');

const users = await callMCPTool('mcp__api__getUsers', {});
console.log(`Fetched ${users.length} users`);

console.log('Processing users...');
// Process...

console.log('=== Sync complete ===');
```

### Error Context

```typescript
// Provide context in errors
try {
  const result = await callMCPTool('mcp__database__query', {
    query: complexQuery
  });
} catch (error) {
  console.error('Database query failed');
  console.error('Query:', complexQuery);
  console.error('Error:', error.message);
  throw new Error(`Query failed: ${error.message}`);
}
```

### Timing Operations

```typescript
// Measure execution time
const startTime = Date.now();

const result = await callMCPTool('mcp__expensive__operation', {});

const duration = Date.now() - startTime;
console.log(`Operation took ${duration}ms`);

return { result, executionTime: duration };
```

## Common Pitfalls

### Forgetting await

```typescript
// ❌ Bad: Forgot await
const result = callMCPTool('mcp__tool__op', {});
// result is a Promise, not the actual value!

// ✅ Good: Always await
const result = await callMCPTool('mcp__tool__op', {});
```

### Not Handling Errors

```typescript
// ❌ Bad: No error handling
const data = await callMCPTool('mcp__api__fetch', {});

// ✅ Good: Handle potential errors
try {
  const data = await callMCPTool('mcp__api__fetch', {});
  return { success: true, data };
} catch (error) {
  return { success: false, error: error.message };
}
```

### Incorrect Tool Names

```typescript
// ❌ Bad: Wrong format
await callMCPTool('filesystem_readFile', {}); // Wrong format
await callMCPTool('mcp-filesystem-readFile', {}); // Wrong separator

// ✅ Good: Correct format
await callMCPTool('mcp__filesystem__readFile', {});
```

## Complete Example

Here's a comprehensive example combining multiple patterns:

```typescript
/**
 * Sync user data from multiple sources and generate a report
 */

interface User {
  id: string;
  name: string;
  email: string;
  source: string;
}

interface SyncReport {
  success: boolean;
  totalUsers: number;
  bySource: Record<string, number>;
  errors: string[];
  duration: number;
}

async function syncUsers(): Promise<SyncReport> {
  const startTime = Date.now();
  const errors: string[] = [];
  const allUsers: User[] = [];

  // Fetch from multiple sources in parallel
  const sources = ['api1', 'api2', 'api3'];
  const results = await Promise.allSettled(
    sources.map(source =>
      callMCPTool(`mcp__${source}__getUsers`, {})
    )
  );

  // Process results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = sources[i];

    if (result.status === 'fulfilled') {
      const users = result.value.map((u: any) => ({
        ...u,
        source
      }));
      allUsers.push(...users);
      console.log(`✓ ${source}: ${users.length} users`);
    } else {
      errors.push(`${source}: ${result.reason.message}`);
      console.error(`✗ ${source} failed`);
    }
  }

  // Deduplicate by email
  const uniqueUsers = Array.from(
    new Map(allUsers.map(u => [u.email, u])).values()
  );

  // Store in database
  try {
    await callMCPTool('mcp__database__bulkUpsert', {
      table: 'users',
      records: uniqueUsers,
      conflictKey: 'email'
    });
    console.log(`Stored ${uniqueUsers.length} unique users`);
  } catch (error) {
    errors.push(`Database upsert failed: ${error.message}`);
  }

  // Generate report
  const bySource: Record<string, number> = {};
  for (const user of uniqueUsers) {
    bySource[user.source] = (bySource[user.source] || 0) + 1;
  }

  const duration = Date.now() - startTime;

  return {
    success: errors.length === 0,
    totalUsers: uniqueUsers.length,
    bySource,
    errors,
    duration
  };
}

// Execute and return results
const report = await syncUsers();
console.log('Sync complete:', JSON.stringify(report, null, 2));
return report;
```

## Next Steps

- See `PYTHON_GUIDE.md` for Python execution patterns
- See `EXAMPLES.md` for complete real-world examples
- See `REFERENCE.md` for complete API reference
- Check `scripts/typescript/` for proven patterns you can adapt
