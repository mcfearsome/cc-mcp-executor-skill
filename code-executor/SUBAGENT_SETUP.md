# Subagent Setup Guide

This guide explains how to configure Claude Code to use the code-executor skill with subagents for efficient MCP tool composition.

## Architecture Overview

```
Main Claude Code Context (No MCP servers configured)
    ↓
    Has code-executor skill installed
    ↓
    Launches subagent via Task tool
    ↓
Subagent Context (MCP servers configured)
    ↓
    Writes TypeScript/Python code
    ↓
    Executes code via Bash (deno run / python)
    ↓
    Code imports local MCP client library
    ↓
    MCP client connects to MCP servers
    ↓
    Returns results to main context
```

## Why This Architecture?

**Problem**: Loading all MCP tool schemas into the main context causes token bloat (141k tokens for 47 tools).

**Solution**:
- Main context has NO MCP servers → no token bloat
- Subagent has MCP servers → isolated context
- Skill teaches subagent to write code that calls multiple tools
- Code executes efficiently within subagent context
- Results return to main context

**Benefits**:
- ✅ 98% token reduction in main context
- ✅ Multi-tool composition in single code execution
- ✅ Complex logic, loops, and data transformations
- ✅ Subagent context is disposable after task completion

## Configuration Steps

### Step 1: Main Claude Code Configuration

Your main Claude Code instance should **NOT** have MCP servers configured in `.mcp.json`:

```json
{
  "mcpServers": {
    // NO MCP servers here - keep main context clean
  }
}
```

Or simply don't create a `.mcp.json` file for the main instance.

### Step 2: Subagent MCP Configuration

Create a configuration file for subagents that specifies which MCP servers are available:

**Option A: Global subagent config**

Create `~/.claude/subagent-mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp", "/home/user/projects"]
    },
    "postgres": {
      "command": "mcp-server-postgres",
      "args": ["--connection", "postgresql://localhost/mydb"]
    },
    "github": {
      "command": "mcp-server-github",
      "args": ["--token-file", "/home/user/.github-token"]
    }
  }
}
```

**Option B: Project-specific config**

Create `.claude/subagent-mcp.json` in your project:

```json
{
  "mcpServers": {
    "project-db": {
      "command": "mcp-server-sqlite",
      "args": ["--database", "./data/app.db"]
    },
    "project-api": {
      "command": "node",
      "args": ["./mcp-servers/custom-api-server.js"]
    }
  }
}
```

### Step 3: Understand MCP Client Configuration

The MCP client library (`lib/mcp-client.ts` and `lib/mcp_client.py`) reads MCP configuration from:

1. `MCP_CONFIG_PATH` environment variable (if set)
2. `~/.mcp.json` (default fallback)

**CRITICAL: Do NOT symlink or copy subagent-mcp.json to ~/.mcp.json**

Why? If you symlink `~/.claude/subagent-mcp.json` to `~/.mcp.json`, then **main Claude Code will load all MCP servers**, defeating the entire purpose of this architecture (98% token reduction).

**Correct approach:**

The subagent will set `MCP_CONFIG_PATH` in the Bash execution command:

```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json deno run --allow-read --allow-run --allow-env script.ts
```

This way:
- ✅ Main Claude Code has NO MCP servers (no `~/.mcp.json` or empty)
- ✅ Subagent execution sets `MCP_CONFIG_PATH` temporarily
- ✅ MCP client reads from subagent config only during execution
- ✅ Token overhead stays in subagent context only

**No action needed in this step** - just understand the pattern. The subagent will handle setting `MCP_CONFIG_PATH` when it executes code.

### Step 4: Install the Skill

Install the code-executor skill in Claude Code:

```bash
# Clone or copy the skill
git clone https://github.com/mcfearsome/cc-mcp-executor-skill.git

# Install for main Claude Code instance
cp -r cc-mcp-executor-skill/code-executor ~/.claude/skills/

# Or for project-specific use
mkdir -p .claude/skills
cp -r cc-mcp-executor-skill/code-executor .claude/skills/
```

### Step 5: Verify Installation

Test that everything is configured correctly:

**1. Check skill is installed:**

```bash
ls -la ~/.claude/skills/code-executor/
```

You should see: `SKILL.md`, `lib/`, `scripts/`, `templates/`

**2. Test MCP client library:**

Create a test script:

```typescript
// test-mcp-client.ts
import { callMCPTool } from './code-executor/lib/mcp-client.ts';

// Test a simple MCP tool call
const result = await callMCPTool('mcp__filesystem__listDirectory', {
  path: '/tmp'
});

console.log('MCP client works!', result);
```

Run it:

```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env test-mcp-client.ts
```

## How It Works in Practice

### User Request

```
User: "Read all JSON files in /tmp/data, aggregate the data, and store in database"
```

### Main Claude Code (has skill, no MCP servers)

1. Recognizes this needs multi-tool MCP workflow
2. Activates code-executor skill
3. Launches subagent via Task tool:

```typescript
Task({
  subagent_type: "general-purpose",
  prompt: `You have access to filesystem and database MCP tools via the code-executor skill.

  Task: Read all JSON files in /tmp/data, parse them, aggregate the data, and store in database table 'aggregated_data'.

  Write TypeScript code that:
  1. Lists files in /tmp/data using mcp__filesystem__listDirectory
  2. Filters for .json files
  3. Reads each file using mcp__filesystem__readFile
  4. Parses and aggregates the JSON data
  5. Stores results using mcp__database__insert

  Use the cached script pattern from scripts/typescript/file-processing.ts as reference.

  Return: Summary with file count and record count stored.`
})
```

### Subagent (has MCP servers configured)

1. Receives task prompt
2. Consults cached script `scripts/typescript/file-processing.ts`
3. Writes adapted TypeScript code:

```typescript
import { callMCPTool } from '../../lib/mcp-client.ts';

// List files
const files = await callMCPTool('mcp__filesystem__listDirectory', {
  path: '/tmp/data'
});

// Filter and process JSON files
const jsonFiles = files.filter(f => f.name.endsWith('.json'));
const allData = [];

for (const file of jsonFiles) {
  const content = await callMCPTool('mcp__filesystem__readFile', {
    path: file.path
  });
  allData.push(JSON.parse(content));
}

// Aggregate
const aggregated = {
  total_records: allData.length,
  data: allData.flat(),
  timestamp: new Date().toISOString()
};

// Store in database
await callMCPTool('mcp__database__insert', {
  table: 'aggregated_data',
  record: aggregated
});

console.log(`Processed ${jsonFiles.length} files, ${aggregated.total_records} records`);
```

4. Executes code via Bash:

```bash
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json deno run --allow-read --allow-run --allow-env /tmp/generated-script.ts
```

5. Returns results to main Claude Code

### Main Claude Code Receives Results

```
Processed 15 files, 1,247 records stored in database
```

## MCP Server Configuration Reference

### Common MCP Servers

**Filesystem**:
```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
  }
}
```

Available tools:
- `mcp__filesystem__readFile`
- `mcp__filesystem__writeFile`
- `mcp__filesystem__listDirectory`
- `mcp__filesystem__createDirectory`
- `mcp__filesystem__deleteFile`

**PostgreSQL Database**:
```json
{
  "postgres": {
    "command": "mcp-server-postgres",
    "args": ["--connection", "postgresql://user:pass@host/db"]
  }
}
```

Available tools:
- `mcp__postgres__query`
- `mcp__postgres__insert`
- `mcp__postgres__update`
- `mcp__postgres__delete`

**GitHub**:
```json
{
  "github": {
    "command": "mcp-server-github",
    "args": ["--token", "ghp_..."]
  }
}
```

Available tools:
- `mcp__github__createIssue`
- `mcp__github__createPullRequest`
- `mcp__github__listRepos`
- `mcp__github__getFile`

**SQLite**:
```json
{
  "sqlite": {
    "command": "mcp-server-sqlite",
    "args": ["--database", "/path/to/database.db"]
  }
}
```

Available tools:
- `mcp__sqlite__query`
- `mcp__sqlite__execute`

## Troubleshooting

### Issue: "MCP config file not found"

**Solution**: Check that your MCP config is in the right location:

```bash
ls -la ~/.mcp.json
# or
ls -la ~/.claude/subagent-mcp.json
```

Set `MCP_CONFIG_PATH` if using custom location.

### Issue: "MCP tool 'mcp__server__tool' not found"

**Cause**: Server not configured in subagent MCP config.

**Solution**:
1. Check server name in your config: `cat ~/.mcp.json`
2. Verify tool name format: `mcp__<server-name>__<tool-name>`
3. Ensure server command is executable: `which <command>`

### Issue: "Permission denied" when calling MCP tools

**Cause**: MCP server doesn't have permission for the requested operation.

**Solution**:
- **Filesystem**: Check that paths are in allowed directories (specified in args)
- **Database**: Verify connection string has correct permissions
- **API**: Check API token/credentials are valid

### Issue: Code executes but MCP calls fail

**Cause**: MCP servers not running or not accessible.

**Solution**:
1. Test MCP server manually:
   ```bash
   echo '{"jsonrpc":"2.0","id":"1","method":"tools/list"}' | npx -y @modelcontextprotocol/server-filesystem /tmp
   ```

2. Check server logs (usually in stderr)

3. Verify Deno/Python has required permissions and MCP_CONFIG_PATH:
   ```bash
   MCP_CONFIG_PATH=~/.claude/subagent-mcp.json deno run --allow-read --allow-run --allow-env script.ts
   MCP_CONFIG_PATH=~/.claude/subagent-mcp.json python script.py
   ```

### Issue: Subagent doesn't have code-executor skill

**Cause**: Skill only installed for main instance.

**Solution**: Skills are automatically available to subagents launched from main instance. No additional installation needed.

## Advanced Configuration

### Multiple Subagent Profiles

You can create different MCP configurations for different use cases:

**Development**:
```bash
MCP_CONFIG_PATH=~/.claude/mcp-dev.json
```

**Production**:
```bash
MCP_CONFIG_PATH=~/.claude/mcp-prod.json
```

**Testing**:
```bash
MCP_CONFIG_PATH=~/.claude/mcp-test.json
```

### Custom MCP Servers

To add a custom MCP server:

1. Create your MCP server following the [MCP specification](https://modelcontextprotocol.io)
2. Add to subagent config:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "node",
      "args": ["/path/to/my-mcp-server.js"]
    }
  }
}
```

3. Use in code:

```typescript
const result = await callMCPTool('mcp__my-custom-server__myTool', {
  param1: 'value'
});
```

### Security Considerations

1. **Filesystem access**: Only allow necessary directories in filesystem server args
2. **Database access**: Use read-only connection strings where possible
3. **API tokens**: Store in files, not in config directly
4. **Network access**: MCP servers can access network - review server code
5. **Code execution**: Subagent writes and executes code - audit generated scripts

## Next Steps

- Review [SKILL.md](./SKILL.md) for usage patterns
- Explore [cached scripts](./scripts/) for examples
- Read [TYPESCRIPT_GUIDE.md](./TYPESCRIPT_GUIDE.md) for TypeScript patterns
- Read [PYTHON_GUIDE.md](./PYTHON_GUIDE.md) for Python patterns
- Check [EXAMPLES.md](./EXAMPLES.md) for complete use cases

## Support

For issues:
- **Skill setup**: Open issue in this repository
- **MCP protocol**: See https://modelcontextprotocol.io
- **Claude Code**: See https://docs.claude.com/en/docs/claude-code
