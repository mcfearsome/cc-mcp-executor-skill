# Python Execution Guide

This guide provides detailed information about writing Python code for MCP tool execution in the subprocess environment.

## Python Environment Overview

Your Python code executes in an isolated subprocess with Python 3.8+ and specific permissions.

### Available Features

**Standard Library**:
- All Python 3.8+ standard library modules
- async/await and asyncio
- List/dict comprehensions
- JSON encoding/decoding
- File I/O (limited to allowed paths)
- Date/time operations
- Regular expressions
- Math operations
- Logging

**Third-Party Libraries** (commonly available):
- `requests` - HTTP client
- `asyncio` - Async I/O
- Common data processing libraries may be available

### Permissions

Your code runs with restricted permissions:

```python
# ✅ Allowed
result = await call_mcp_tool('mcp__filesystem__read', {'path': '/tmp/data.json'})
print('Logging is allowed')
data = json.loads(json_string)

# ❌ Not allowed (will fail)
# open('/etc/passwd').read()  # Filesystem access outside /tmp
# os.environ['SECRET_KEY']  # Environment variable access blocked
```

### Execution Limits

- Execution timeout: 30-60 seconds (configurable)
- Memory limits enforced
- CPU usage monitored

## call_mcp_tool() Function

### Signature

```python
async def call_mcp_tool(
    tool_name: str,
    parameters: dict
) -> Any
```

### Parameters

**tool_name**: String in format `mcp__<server>__<tool>`
- Must be exact match to configured MCP tool
- Case-sensitive
- Example: `'mcp__filesystem__read_file'`

**parameters**: Dictionary containing tool-specific parameters
- Must match the tool's JSON schema
- All required parameters must be included
- Types must match schema (str, int, bool, dict, list)

### Return Value

Returns the tool's result. The structure depends on the specific tool, but typically a dict or list:

```python
{
    # Tool-specific data
    # Could be any valid JSON value
}
```

### Error Handling

Raises an exception if:
- Tool name is invalid or not found
- Parameters don't match schema
- Tool execution fails
- Network timeout occurs
- Permission denied

```python
try:
    result = await call_mcp_tool('mcp__tool__operation', {
        'param1': 'value'
    })
    return result
except Exception as error:
    # error contains description
    print(f'Tool call failed: {error}')
    raise  # Re-raise or handle
```

## Python Patterns

### Basic Tool Call

```python
import json

# Simple async call
file_content = await call_mcp_tool('mcp__filesystem__read_file', {
    'path': '/tmp/config.json'
})

parsed = json.loads(file_content)
print(f'Config loaded: {parsed}')
```

### Multiple Sequential Calls

```python
# Execute one after another
files = await call_mcp_tool('mcp__filesystem__list_directory', {
    'path': '/tmp/data'
})

print(f'Found {len(files)} files')

for file in files:
    content = await call_mcp_tool('mcp__filesystem__read_file', {
        'path': file['path']
    })

    print(f"Processing {file['name']}...")
    # Process content
```

### Parallel Execution

```python
import asyncio

# Execute multiple independent calls concurrently
users, posts, settings = await asyncio.gather(
    call_mcp_tool('mcp__database__query', {
        'table': 'users',
        'limit': 100
    }),
    call_mcp_tool('mcp__database__query', {
        'table': 'posts',
        'limit': 100
    }),
    call_mcp_tool('mcp__config__get', {
        'key': 'app_settings'
    })
)

print(f'Fetched: {len(users)} users and {len(posts)} posts')
```

### Partial Failure Handling

```python
import asyncio

# Use gather with return_exceptions to handle partial failures
results = await asyncio.gather(
    call_mcp_tool('mcp__api1__fetch', {}),
    call_mcp_tool('mcp__api2__fetch', {}),
    call_mcp_tool('mcp__api3__fetch', {}),
    return_exceptions=True
)

successes = [r for r in results if not isinstance(r, Exception)]
failures = [r for r in results if isinstance(r, Exception)]

print(f'Success: {len(successes)}, Failed: {len(failures)}')

return {
    'data': successes,
    'errors': [str(f) for f in failures]
}
```

### Conditional Logic

```python
# Make decisions based on tool results
file_info = await call_mcp_tool('mcp__filesystem__stat', {
    'path': '/tmp/data.txt'
})

if file_info['size'] > 1000000:
    # Large file - read in chunks
    content = await call_mcp_tool('mcp__filesystem__read_file_chunked', {
        'path': '/tmp/data.txt',
        'chunk_size': 100000
    })
else:
    # Small file - read all at once
    content = await call_mcp_tool('mcp__filesystem__read_file', {
        'path': '/tmp/data.txt'
    })
```

### Retry Logic with Exponential Backoff

```python
import asyncio
from typing import Any, Dict

async def call_with_retry(
    tool_name: str,
    params: Dict[str, Any],
    max_retries: int = 3
) -> Any:
    """Call MCP tool with retry logic and exponential backoff."""
    for attempt in range(max_retries):
        try:
            return await call_mcp_tool(tool_name, params)
        except Exception as error:
            if attempt == max_retries - 1:
                raise

            delay = 2 ** attempt  # 1s, 2s, 4s
            print(f'Attempt {attempt + 1} failed, retrying in {delay}s...')
            await asyncio.sleep(delay)

# Usage
result = await call_with_retry('mcp__api__fetch', {'url': endpoint})
```

### Data Transformation Pipeline

```python
from typing import List, Dict, Any
from datetime import datetime
import json

# Fetch raw data
raw_data: List[Dict[str, Any]] = await call_mcp_tool('mcp__api__fetch', {
    'endpoint': '/api/data'
})

# Transform
processed = [{
    'id': item['id'],
    'created_date': datetime.fromisoformat(item['created_at']),
    'user_name': item['user_name'],
    'processed': True
} for item in raw_data]

# Filter
recent = [
    item for item in processed
    if (datetime.now() - item['created_date']).days <= 7
]

# Store results
await call_mcp_tool('mcp__database__bulk_insert', {
    'table': 'processed_data',
    'records': [
        {**r, 'created_date': r['created_date'].isoformat()}
        for r in recent
    ]
})

return {'processed': len(recent), 'total': len(raw_data)}
```

### Error Aggregation

```python
from typing import List, Dict, Any

# Collect and report errors from multiple operations
operations = [
    {'tool': 'mcp__service1__sync', 'params': {}},
    {'tool': 'mcp__service2__sync', 'params': {}},
    {'tool': 'mcp__service3__sync', 'params': {}}
]

errors: List[Dict[str, str]] = []
successes: List[Dict[str, Any]] = []

for op in operations:
    try:
        result = await call_mcp_tool(op['tool'], op['params'])
        successes.append({'tool': op['tool'], 'result': result})
        print(f"✓ {op['tool']} succeeded")
    except Exception as error:
        errors.append({'tool': op['tool'], 'error': str(error)})
        print(f"✗ {op['tool']} failed: {error}")

return {
    'summary': {
        'total': len(operations),
        'succeeded': len(successes),
        'failed': len(errors)
    },
    'successes': successes,
    'errors': errors
}
```

## Type Hints

### Using Type Hints

```python
from typing import Dict, List, Any, Optional

# Define types for tool parameters
async def read_file(
    path: str,
    encoding: Optional[str] = None
) -> str:
    """Read a file with optional encoding."""
    params: Dict[str, Any] = {'path': path}
    if encoding:
        params['encoding'] = encoding

    result: str = await call_mcp_tool('mcp__filesystem__read_file', params)
    return result

# Use types for safety
content: str = await read_file('/tmp/data.json', 'utf-8')
```

### TypedDict for Structured Data

```python
from typing import TypedDict, List

class User(TypedDict):
    id: int
    name: str
    email: str

class QueryResult(TypedDict):
    users: List[User]
    total: int

# Type-safe call
result: QueryResult = await call_mcp_tool('mcp__database__query', {
    'table': 'users',
    'limit': 100
})

# Now Python knows the structure
print(result['users'][0]['email'])  # Type-safe access
```

### Generic Helper Functions

```python
from typing import TypeVar, Dict, Any

T = TypeVar('T')

async def fetch_typed(
    tool_name: str,
    params: Dict[str, Any],
    result_type: type[T]
) -> T:
    """Generic typed fetch helper."""
    result = await call_mcp_tool(tool_name, params)
    return result  # Type checker will validate

# Usage with type hint
users: List[Dict[str, Any]] = await fetch_typed(
    'mcp__database__query',
    {'table': 'users'},
    list
)
```

## Performance Optimization

### Minimize Tool Calls

```python
# ❌ Bad: Multiple small calls
for user_id in user_ids:
    await call_mcp_tool('mcp__database__get_user', {'id': user_id})

# ✅ Good: Batch call
users = await call_mcp_tool('mcp__database__batch_get', {
    'table': 'users',
    'ids': user_ids
})
```

### Use Parallel Execution

```python
import asyncio

# ❌ Bad: Sequential when order doesn't matter
data1 = await call_mcp_tool('mcp__api1__fetch', {})
data2 = await call_mcp_tool('mcp__api2__fetch', {})
data3 = await call_mcp_tool('mcp__api3__fetch', {})

# ✅ Good: Parallel
data1, data2, data3 = await asyncio.gather(
    call_mcp_tool('mcp__api1__fetch', {}),
    call_mcp_tool('mcp__api2__fetch', {}),
    call_mcp_tool('mcp__api3__fetch', {})
)
```

### Cache Results

```python
from typing import Dict, Any, Callable, Awaitable

# Simple cache implementation
cache: Dict[str, Any] = {}

async def get_cached(
    key: str,
    fetcher: Callable[[], Awaitable[Any]]
) -> Any:
    """Cache expensive results."""
    if key in cache:
        print(f'Cache hit for: {key}')
        return cache[key]

    print(f'Cache miss for: {key}')
    result = await fetcher()
    cache[key] = result
    return result

# Usage
config = await get_cached(
    'app_config',
    lambda: call_mcp_tool('mcp__config__get', {'key': 'app_config'})
)
```

## Async/Await Patterns

### Creating Async Tasks

```python
import asyncio

# Create tasks that run concurrently
async def process_file(path: str) -> Dict[str, Any]:
    content = await call_mcp_tool('mcp__filesystem__read_file', {'path': path})
    # Process content
    return {'path': path, 'size': len(content)}

# Create multiple tasks
tasks = [process_file(path) for path in file_paths]

# Wait for all to complete
results = await asyncio.gather(*tasks)
```

### Task Timeouts

```python
import asyncio

# Add timeout to operations
try:
    result = await asyncio.wait_for(
        call_mcp_tool('mcp__slow__operation', {}),
        timeout=10.0  # 10 seconds
    )
except asyncio.TimeoutError:
    print('Operation timed out')
    result = None
```

### Background Tasks

```python
import asyncio
from typing import List, Any

# Run some tasks in background while processing main task
async def main_task() -> Any:
    # Start background tasks
    background = [
        asyncio.create_task(call_mcp_tool('mcp__cache__warm', {})),
        asyncio.create_task(call_mcp_tool('mcp__metrics__send', {}))
    ]

    # Do main work
    result = await call_mcp_tool('mcp__main__operation', {})

    # Wait for background tasks (optional)
    await asyncio.gather(*background, return_exceptions=True)

    return result
```

## Debugging

### Logging Best Practices

```python
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log execution flow
logger.info('=== Starting data sync ===')
logger.info('Fetching users...')

users = await call_mcp_tool('mcp__api__get_users', {})
logger.info(f'Fetched {len(users)} users')

logger.info('Processing users...')
# Process...

logger.info('=== Sync complete ===')
```

### Error Context

```python
# Provide context in errors
try:
    result = await call_mcp_tool('mcp__database__query', {
        'query': complex_query
    })
except Exception as error:
    logger.error('Database query failed')
    logger.error(f'Query: {complex_query}')
    logger.error(f'Error: {error}')
    raise Exception(f'Query failed: {error}') from error
```

### Timing Operations

```python
import time
from typing import Dict, Any

# Measure execution time
start_time = time.time()

result = await call_mcp_tool('mcp__expensive__operation', {})

duration = time.time() - start_time
print(f'Operation took {duration:.2f}s')

return {'result': result, 'execution_time': duration}
```

## Common Pitfalls

### Forgetting await

```python
# ❌ Bad: Forgot await
result = call_mcp_tool('mcp__tool__op', {})
# result is a coroutine, not the actual value!

# ✅ Good: Always await
result = await call_mcp_tool('mcp__tool__op', {})
```

### Not Using async def

```python
# ❌ Bad: Regular function can't await
def process_data():
    result = await call_mcp_tool('mcp__tool__op', {})  # SyntaxError!

# ✅ Good: Use async def
async def process_data():
    result = await call_mcp_tool('mcp__tool__op', {})
```

### Not Handling Errors

```python
# ❌ Bad: No error handling
data = await call_mcp_tool('mcp__api__fetch', {})

# ✅ Good: Handle potential errors
try:
    data = await call_mcp_tool('mcp__api__fetch', {})
    return {'success': True, 'data': data}
except Exception as error:
    return {'success': False, 'error': str(error)}
```

### Incorrect Tool Names

```python
# ❌ Bad: Wrong format
await call_mcp_tool('filesystem_read_file', {})  # Wrong format
await call_mcp_tool('mcp-filesystem-read-file', {})  # Wrong separator

# ✅ Good: Correct format
await call_mcp_tool('mcp__filesystem__read_file', {})
```

## Complete Example

Here's a comprehensive example combining multiple patterns:

```python
"""
Sync user data from multiple sources and generate a report
"""
import asyncio
import json
from typing import Dict, List, Any
from datetime import datetime

async def sync_users() -> Dict[str, Any]:
    """Sync users from multiple sources."""
    start_time = datetime.now()
    errors: List[str] = []
    all_users: List[Dict[str, Any]] = []

    # Fetch from multiple sources in parallel
    sources = ['api1', 'api2', 'api3']
    results = await asyncio.gather(*[
        call_mcp_tool(f'mcp__{source}__get_users', {})
        for source in sources
    ], return_exceptions=True)

    # Process results
    for i, result in enumerate(results):
        source = sources[i]

        if isinstance(result, Exception):
            errors.append(f'{source}: {str(result)}')
            print(f'✗ {source} failed')
            continue

        users = [{'source': source, **u} for u in result]
        all_users.extend(users)
        print(f'✓ {source}: {len(users)} users')

    # Deduplicate by email
    unique_users_map = {u['email']: u for u in all_users}
    unique_users = list(unique_users_map.values())

    # Store in database
    try:
        await call_mcp_tool('mcp__database__bulk_upsert', {
            'table': 'users',
            'records': unique_users,
            'conflict_key': 'email'
        })
        print(f'Stored {len(unique_users)} unique users')
    except Exception as error:
        errors.append(f'Database upsert failed: {str(error)}')

    # Generate report by source
    by_source: Dict[str, int] = {}
    for user in unique_users:
        source = user['source']
        by_source[source] = by_source.get(source, 0) + 1

    duration = (datetime.now() - start_time).total_seconds()

    report = {
        'success': len(errors) == 0,
        'total_users': len(unique_users),
        'by_source': by_source,
        'errors': errors,
        'duration': duration
    }

    print(f'Sync complete: {json.dumps(report, indent=2)}')
    return report

# Execute and return results
report = await sync_users()
```

## Best Practices Summary

1. **Always use async/await**: All MCP tool calls are async
2. **Handle errors**: Wrap calls in try/except
3. **Use type hints**: Make code more maintainable
4. **Parallel when possible**: Use asyncio.gather for independent operations
5. **Log important operations**: Aid debugging and monitoring
6. **Validate inputs**: Check parameters before calling tools
7. **Return structured data**: Use consistent return formats
8. **Cache expensive operations**: Avoid redundant calls
9. **Set timeouts**: Prevent hanging on slow operations
10. **Clean up resources**: Ensure proper cleanup even on errors

## Next Steps

- See `TYPESCRIPT_GUIDE.md` for TypeScript execution patterns
- See `EXAMPLES.md` for complete real-world examples
- See `REFERENCE.md` for complete API reference
- Check `scripts/python/` for proven patterns you can adapt
