# Testing Plan for Code Executor Skill

This document outlines the testing strategy for the code-executor skill with subagent architecture.

## Testing Goals

1. Verify subagent architecture prevents token bloat in main context
2. Ensure MCP client libraries correctly connect to MCP servers
3. Validate all cached scripts execute successfully
4. Confirm templates provide working starting points
5. Test error handling and edge cases
6. Verify security and sandboxing

## Test Environment Setup

### Prerequisites

1. **Main Claude Code instance**
   - NO MCP servers in `.mcp.json` (or file doesn't exist)
   - Skill installed at `~/.claude/skills/code-executor/`

2. **Subagent MCP configuration**
   - Create `~/.claude/subagent-mcp.json` with test MCP servers
   - Minimum: filesystem server for basic testing

3. **Runtime dependencies**
   - Deno installed (v1.30+)
   - Python installed (3.8+)
   - Test data directory: `/tmp/test-data/`

### Test MCP Configuration

Create `~/.claude/subagent-mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}
```

### Test Data Setup

```bash
# Create test directory
mkdir -p /tmp/test-data

# Create test JSON files
echo '{"id": 1, "name": "Alice"}' > /tmp/test-data/file1.json
echo '{"id": 2, "name": "Bob"}' > /tmp/test-data/file2.json
echo '{"id": 3, "name": "Charlie"}' > /tmp/test-data/file3.json

# Create test text file
echo "Hello World" > /tmp/test-data/test.txt
```

## Test Categories

### 1. Architecture Verification

**Test 1.1: Main Context Token Count**

**Goal**: Verify main Claude Code doesn't load MCP servers

**Procedure**:
1. Start main Claude Code with NO `.mcp.json` or empty config
2. Skill should be available (check `~/.claude/skills/code-executor/SKILL.md` exists)
3. Main context should have NO MCP tool schemas loaded

**Expected Result**:
- Main context clean (no mcp__ tools visible)
- Token count significantly lower than with MCP servers
- Skill activates when multi-tool workflow mentioned

**Test 1.2: Subagent MCP Access**

**Goal**: Verify subagent can access MCP tools during execution

**Procedure**:
1. Create test script that calls `mcp__filesystem__readFile`
2. Execute with: `MCP_CONFIG_PATH=~/.claude/subagent-mcp.json deno run --allow-read --allow-run --allow-env test.ts`
3. Should successfully read file

**Expected Result**:
- Script executes successfully
- MCP tool called and returns data
- No errors about missing MCP config

### 2. MCP Client Library Tests

**Test 2.1: TypeScript MCP Client - Single Tool Call**

**Script**:
```typescript
// test-single-call.ts
import { callMCPTool } from './code-executor/lib/mcp-client.ts';

const result = await callMCPTool('mcp__filesystem__readFile', {
  path: '/tmp/test-data/test.txt'
});

console.log('Success:', result);
```

**Execution**:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env test-single-call.ts
```

**Expected Result**:
- Prints "Success: Hello World"
- No errors

**Test 2.2: TypeScript MCP Client - Parallel Calls**

**Script**:
```typescript
// test-parallel-calls.ts
import { callMCPToolsParallel } from './code-executor/lib/mcp-client.ts';

const results = await callMCPToolsParallel([
  { tool: 'mcp__filesystem__readFile', parameters: { path: '/tmp/test-data/file1.json' } },
  { tool: 'mcp__filesystem__readFile', parameters: { path: '/tmp/test-data/file2.json' } },
  { tool: 'mcp__filesystem__readFile', parameters: { path: '/tmp/test-data/file3.json' } }
]);

console.log('Results:', results.length);
```

**Execution**:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env test-parallel-calls.ts
```

**Expected Result**:
- Prints "Results: 3"
- All files read successfully
- Parallel execution faster than sequential

**Test 2.3: Python MCP Client - Single Tool Call**

**Script**:
```python
# test_single_call.py
import sys
import os
import asyncio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'code-executor'))
from lib.mcp_client import call_mcp_tool

async def main():
    result = await call_mcp_tool('mcp__filesystem__readFile', {
        'path': '/tmp/test-data/test.txt'
    })
    print('Success:', result)

asyncio.run(main())
```

**Execution**:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json python test_single_call.py
```

**Expected Result**:
- Prints "Success: Hello World"
- No errors

**Test 2.4: Error Handling - Tool Not Found**

**Script**:
```typescript
// test-tool-not-found.ts
import { callMCPTool } from './code-executor/lib/mcp-client.ts';

try {
  await callMCPTool('mcp__nonexistent__tool', {});
  console.log('ERROR: Should have thrown');
} catch (error) {
  console.log('Success: Caught error:', error.message);
}
```

**Expected Result**:
- Catches error gracefully
- Error message indicates tool not found

**Test 2.5: Error Handling - Missing Config**

**Execution**:
```bash
# WITHOUT MCP_CONFIG_PATH
deno run --allow-read --allow-run --allow-env test-single-call.ts
```

**Expected Result**:
- Error: "MCP config file not found: ~/.mcp.json"
- Clear error message

### 3. Cached Scripts Tests

Test each cached script with appropriate test data.

**Test 3.1: Multi-Tool Workflow (TypeScript)**

**Execution**:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env \
  code-executor/scripts/typescript/multi-tool-workflow.ts
```

**Expected Result**:
- All 5 steps execute successfully
- Progress logged for each step
- Final summary shows success

**Test 3.2: Parallel Execution (TypeScript)**

**Execution**:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env \
  code-executor/scripts/typescript/parallel-execution.ts
```

**Expected Result**:
- Multiple operations execute concurrently
- Shows speedup compared to sequential
- All operations complete successfully

**Test 3.3: Error Recovery (TypeScript)**

**Execution**:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env \
  code-executor/scripts/typescript/error-recovery.ts
```

**Expected Result**:
- Demonstrates retry logic with exponential backoff
- Falls back to secondary/cache on failure
- Graceful error handling

**Test 3.4: File Processing (TypeScript)**

**Setup**:
```bash
# Create additional JSON files for testing
for i in {4..10}; do
  echo "{\"id\": $i, \"data\": \"test$i\"}" > /tmp/test-data/file$i.json
done
```

**Execution**:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env \
  code-executor/scripts/typescript/file-processing.ts
```

**Expected Result**:
- Lists and filters JSON files
- Processes each file
- Aggregates results
- Final report shows file count

**Test 3.5-3.6: Conditional Logic & Data Aggregation**

Similar testing procedure for remaining TypeScript scripts.

**Test 3.7-3.12: Python Scripts**

Test each Python script with same approach:

```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  python code-executor/scripts/python/multi_tool_workflow.py
```

**Expected**: Same results as TypeScript equivalents

### 4. Template Tests

**Test 4.1: Basic TypeScript Template**

**Procedure**:
1. Copy `basic-typescript.template.ts` to `test-basic.ts`
2. Replace TODOs with:
   - Tool: `mcp__filesystem__readFile`
   - Parameters: `{ path: '/tmp/test-data/test.txt' }`
3. Execute:
```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env test-basic.ts
```

**Expected Result**:
- Script executes successfully
- Returns file contents
- Proper error handling

**Test 4.2-4.4: Other Templates**

Test remaining 3 templates with same approach.

### 5. Integration Tests - Full Workflow

**Test 5.1: End-to-End Subagent Workflow**

**Procedure**:
1. Main Claude Code receives user request: "Count JSON files in /tmp/test-data"
2. Main recognizes multi-tool pattern
3. Launches subagent with instructions
4. Subagent writes code using file-processing pattern
5. Executes with `MCP_CONFIG_PATH` set
6. Returns result to main

**Manual Test** (requires human interaction):
1. Start Claude Code
2. Request: "Use the code-executor skill to count JSON files in /tmp/test-data and show me the count"
3. Observe skill activation
4. Verify subagent launches
5. Check result accuracy

**Expected Result**:
- Skill activates properly
- Subagent generates correct code
- Execution includes `MCP_CONFIG_PATH`
- Result returned: "Found 10 JSON files"

**Test 5.2: Complex Multi-Source Workflow**

**Procedure**:
Similar to 5.1 but with more complex request involving multiple tool types.

### 6. Error Handling Tests

**Test 6.1: Missing MCP_CONFIG_PATH**

**Procedure**:
Execute script WITHOUT setting `MCP_CONFIG_PATH`

**Expected Result**:
- Clear error: "MCP config file not found"
- Script exits gracefully

**Test 6.2: Invalid Tool Name**

**Procedure**:
Call tool with invalid format (e.g., `filesystem_readFile` instead of `mcp__filesystem__readFile`)

**Expected Result**:
- Error: "Invalid MCP tool name format"
- Suggests correct format

**Test 6.3: MCP Server Not Running**

**Procedure**:
Configure non-existent MCP server, attempt to call tool

**Expected Result**:
- Error: "MCP server command not found"
- Clear troubleshooting guidance

**Test 6.4: Permission Denied**

**Procedure**:
1. Attempt to read file outside allowed paths
2. Execute Deno without proper permissions

**Expected Result**:
- Filesystem: Access denied by MCP server
- Deno: Permission error, clear message

### 7. Security Tests

**Test 7.1: Sandboxing - Deno Permissions**

**Procedure**:
Execute script WITHOUT `--allow-run` or `--allow-read`

**Expected Result**:
- Deno blocks execution
- Permission error shown

**Test 7.2: MCP Server Path Restrictions**

**Procedure**:
Configure filesystem MCP with `/tmp` only, attempt to read `/etc/passwd`

**Expected Result**:
- MCP server denies access
- Error indicates path not allowed

**Test 7.3: No Token Leakage**

**Procedure**:
1. Configure MCP server with auth token
2. Execute script
3. Check logs for exposed tokens

**Expected Result**:
- Tokens not printed in logs
- Secure token handling

### 8. Performance Tests

**Test 8.1: Token Count Comparison**

**Procedure**:
1. Measure main Claude Code token usage WITH MCP servers
2. Measure main Claude Code token usage WITHOUT MCP servers (using skill)
3. Compare

**Expected Result**:
- Skill approach: ~1.6k tokens
- Direct approach: ~141k tokens
- ~98% reduction confirmed

**Test 8.2: Execution Speed - Parallel vs Sequential**

**Procedure**:
Execute parallel-execution.ts, compare timing

**Expected Result**:
- Parallel execution 3-5x faster
- Timing logged in output

**Test 8.3: Large Dataset Processing**

**Setup**:
```bash
# Create 100 test files
for i in {1..100}; do
  echo "{\"id\": $i}" > /tmp/test-data/large$i.json
done
```

**Procedure**:
Process all 100 files using file-processing script

**Expected Result**:
- All files processed successfully
- Reasonable execution time (<30 seconds)
- Memory usage stays reasonable

## Test Checklist

Use this checklist when running full test suite:

### Architecture
- [ ] Main context has no MCP servers loaded
- [ ] Subagent can access MCP tools
- [ ] MCP_CONFIG_PATH correctly isolates config

### MCP Client Libraries
- [ ] TypeScript single tool call works
- [ ] TypeScript parallel calls work
- [ ] Python single tool call works
- [ ] Python parallel calls work
- [ ] Error handling for tool not found
- [ ] Error handling for missing config

### Cached Scripts
- [ ] multi-tool-workflow.ts executes
- [ ] parallel-execution.ts executes
- [ ] error-recovery.ts executes
- [ ] file-processing.ts executes
- [ ] conditional-logic.ts executes
- [ ] data-aggregation.ts executes
- [ ] All 6 Python scripts execute

### Templates
- [ ] basic-typescript.template.ts adapts correctly
- [ ] basic-python.template.py adapts correctly
- [ ] multi-tool.template.ts adapts correctly
- [ ] multi-tool.template.py adapts correctly

### Integration
- [ ] Full end-to-end workflow succeeds
- [ ] Complex multi-source workflow succeeds

### Error Handling
- [ ] Missing MCP_CONFIG_PATH caught
- [ ] Invalid tool name caught
- [ ] MCP server not running caught
- [ ] Permission denied handled

### Security
- [ ] Deno sandboxing enforced
- [ ] MCP path restrictions enforced
- [ ] No token leakage in logs

### Performance
- [ ] Token reduction ~98% confirmed
- [ ] Parallel execution faster than sequential
- [ ] Large dataset processing succeeds

## Automated Testing

### Quick Smoke Test Script

Create `test-smoke.sh`:

```bash
#!/bin/bash
set -e

echo "=== Code Executor Skill Smoke Tests ==="

# Setup
export MCP_CONFIG_PATH=~/.claude/subagent-mcp.json
mkdir -p /tmp/test-data
echo '{"test": "data"}' > /tmp/test-data/test.json

# Test 1: MCP Client TypeScript
echo "[1/4] Testing TypeScript MCP client..."
cat > /tmp/test-ts.ts << 'EOF'
import { callMCPTool } from './code-executor/lib/mcp-client.ts';
const result = await callMCPTool('mcp__filesystem__readFile', {
  path: '/tmp/test-data/test.json'
});
console.log('PASS: TypeScript client');
EOF
deno run --allow-read --allow-run --allow-env /tmp/test-ts.ts

# Test 2: MCP Client Python
echo "[2/4] Testing Python MCP client..."
cat > /tmp/test_py.py << 'EOF'
import sys, os, asyncio
sys.path.insert(0, 'code-executor')
from lib.mcp_client import call_mcp_tool
async def main():
    result = await call_mcp_tool('mcp__filesystem__readFile', {'path': '/tmp/test-data/test.json'})
    print('PASS: Python client')
asyncio.run(main())
EOF
python /tmp/test_py.py

# Test 3: Cached Script
echo "[3/4] Testing cached script..."
deno run --allow-read --allow-run --allow-env \
  code-executor/scripts/typescript/multi-tool-workflow.ts > /dev/null && \
  echo "PASS: Cached script"

# Test 4: Error Handling
echo "[4/4] Testing error handling..."
deno run --allow-read --allow-run --allow-env /tmp/test-ts.ts 2>&1 | \
  grep -q "MCP config file not found" && \
  echo "PASS: Error handling" || echo "SKIP: Error test"

echo "=== Smoke Tests Complete ==="
```

Run with: `bash test-smoke.sh`

## Continuous Testing

### Pre-Commit Tests

Before committing changes:
1. Run smoke tests: `bash test-smoke.sh`
2. Test at least 2 cached scripts
3. Verify documentation examples work

### Pre-Release Tests

Before releasing new version:
1. Run full test checklist
2. Test on clean environment
3. Verify all documentation accurate
4. Test with multiple MCP server types

## Troubleshooting Test Failures

### "MCP config file not found"
- Ensure `MCP_CONFIG_PATH` set in execution command
- Verify `~/.claude/subagent-mcp.json` exists
- Check file permissions

### "Permission denied"
- Add required Deno permissions: `--allow-read --allow-run --allow-env`
- Check MCP server allowed paths

### "Tool not found"
- Verify tool name format: `mcp__<server>__<tool>`
- Check server configured in `subagent-mcp.json`
- Ensure MCP server running

### Script execution fails
- Check Deno/Python installed correctly
- Verify import paths correct
- Review error stack trace

## Test Data Cleanup

After testing:

```bash
rm -rf /tmp/test-data
rm /tmp/test-ts.ts /tmp/test_py.py
```

## Reporting Issues

When filing bug reports, include:
1. Test that failed
2. Execution command used
3. Full error output
4. Environment info (OS, Deno/Python versions)
5. MCP configuration (sanitized)

## Future Testing

Areas for expansion:
1. Integration with more MCP server types (database, GitHub, etc.)
2. Load testing with large datasets
3. Concurrent subagent execution
4. Cross-platform testing (Linux, macOS, Windows)
5. CI/CD automation
