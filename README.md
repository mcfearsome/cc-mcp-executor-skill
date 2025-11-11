# Code Executor Skill for Claude Code

A comprehensive Claude Code skill that teaches Claude how to use code execution for efficient multi-tool MCP workflows, reducing token overhead by up to 98%.

## Overview

This skill enables Claude Code to compose multiple MCP tool calls efficiently by writing TypeScript or Python code that dynamically calls tools as needed, rather than loading all tool schemas upfront. This **progressive disclosure** pattern dramatically reduces token consumption while maintaining full functionality.

### Key Benefits

- **98% Token Reduction**: Load only 2 tools instead of 47+ (1.6k tokens vs 141k tokens)
- **Composition**: Combine multiple MCP operations in a single execution
- **Efficiency**: Process results from multiple tools together with complex logic
- **Cached Patterns**: 12 proven script examples (6 TypeScript + 6 Python)
- **Progressive Disclosure**: Only load tool schemas when actually needed

## Prerequisites

Before installing this skill, you need:

1. **code-executor-MCP server** installed and configured
   - See: https://github.com/aberemia24/code-executor-MCP
   - Provides `executeTypescript` and `executePython` tools

2. **Claude Code** installed
   - Terminal or web version

3. **MCP servers** configured in `.mcp.json`
   - At least one MCP server providing tools you want to call

4. **Deno** installed (for TypeScript execution)
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

5. **Python 3.8+** installed (for Python execution)

## Installation

### Option 1: Copy to Skills Directory

```bash
# Clone this repository
git clone https://github.com/mcfearsome/cc-mcp-executor-skill.git

# Copy the skill to your Claude Code skills directory
cp -r cc-mcp-executor-skill/code-executor ~/.claude/skills/

# Or for project-specific use:
cp -r cc-mcp-executor-skill/code-executor .claude/skills/
```

### Option 2: Symbolic Link (for development)

```bash
# Clone the repository
git clone https://github.com/mcfearsome/cc-mcp-executor-skill.git

# Create symbolic link
ln -s "$(pwd)/cc-mcp-executor-skill/code-executor" ~/.claude/skills/code-executor
```

### Verify Installation

```bash
# List installed skills
ls -la ~/.claude/skills/

# Check skill structure
ls -la ~/.claude/skills/code-executor/
```

You should see:
- `SKILL.md` (main skill file)
- `TYPESCRIPT_GUIDE.md`, `PYTHON_GUIDE.md`
- `EXAMPLES.md`, `REFERENCE.md`
- `scripts/` directory with TypeScript and Python examples
- `templates/` directory with starting templates

## Skill Structure

```
code-executor/
├── SKILL.md                    # Main skill instructions (activated by Claude Code)
├── TYPESCRIPT_GUIDE.md         # Deep dive on TypeScript patterns
├── PYTHON_GUIDE.md             # Deep dive on Python patterns
├── EXAMPLES.md                 # Real-world usage examples
├── REFERENCE.md                # Complete API reference
├── scripts/                    # Cached executable scripts
│   ├── typescript/
│   │   ├── multi-tool-workflow.ts
│   │   ├── file-processing.ts
│   │   ├── parallel-execution.ts
│   │   ├── error-recovery.ts
│   │   ├── conditional-logic.ts
│   │   └── data-aggregation.ts
│   └── python/
│       ├── multi_tool_workflow.py
│       ├── file_processing.py
│       ├── parallel_execution.py
│       ├── error_recovery.py
│       ├── conditional_logic.py
│       └── data_aggregation.py
└── templates/                  # Minimal starting points
    ├── basic-typescript.template.ts
    ├── basic-python.template.py
    ├── multi-tool.template.ts
    └── multi-tool.template.py
```

## How It Works

### 1. MCP Tool Discovery

The skill works with your existing MCP configuration:

```json
// .mcp.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "database": {
      "command": "mcp-database-server",
      "args": ["--connection", "postgresql://..."]
    }
  }
}
```

### 2. Tool Naming Convention

MCP tools are called using the format: `mcp__<server>__<tool>`

Examples:
- `mcp__filesystem__readFile`
- `mcp__database__query`
- `mcp__github__createPullRequest`

### 3. Skill Activation

Claude Code automatically activates this skill when you need to:
- Compose multiple MCP tool operations
- Process results from multiple tools together
- Implement complex conditional logic
- Reduce token overhead with many MCP servers

### 4. Code Execution

The skill teaches Claude Code to write code like:

**TypeScript:**
```typescript
// Fetch data from multiple sources in parallel
const [users, orders, products] = await Promise.all([
  callMCPTool('mcp__database__query', { table: 'users' }),
  callMCPTool('mcp__database__query', { table: 'orders' }),
  callMCPTool('mcp__database__query', { table: 'products' })
]);

// Process and combine results
const enriched = users.map(user => ({
  ...user,
  orders: orders.filter(o => o.user_id === user.id),
  favoriteProduct: products.find(p => p.id === user.favorite_product_id)
}));

return enriched;
```

**Python:**
```python
# Fetch data from multiple sources in parallel
import asyncio

users, orders, products = await asyncio.gather(
    call_mcp_tool('mcp__database__query', {'table': 'users'}),
    call_mcp_tool('mcp__database__query', {'table': 'orders'}),
    call_mcp_tool('mcp__database__query', {'table': 'products'})
)

# Process and combine results
enriched = [{
    **user,
    'orders': [o for o in orders if o['user_id'] == user['id']],
    'favorite_product': next((p for p in products if p['id'] == user.get('favorite_product_id')), None)
} for user in users]

return enriched
```

## Usage Examples

### Example 1: Simple File Processing

```
User: "Read all JSON files in /tmp/data and count the total number of records"

Claude Code (activates code-executor skill):
- Recognizes need for multi-step workflow
- Writes TypeScript code using cached pattern from scripts/typescript/file-processing.ts
- Executes via executeTypescript tool
- Returns aggregated count
```

### Example 2: Multi-API Data Aggregation

```
User: "Fetch users from the database, enrich with their profile data from the API, and store in a new table"

Claude Code (activates code-executor skill):
- Identifies pattern similar to scripts/typescript/data-aggregation.ts
- Adapts script for user's specific tools
- Executes parallel fetches and enrichment
- Stores results
```

### Example 3: Error Recovery

```
User: "Fetch data from the primary API, but if it fails, try the backup API, then cache"

Claude Code (activates code-executor skill):
- Uses pattern from scripts/typescript/error-recovery.ts
- Implements retry logic with exponential backoff
- Falls back through multiple sources
- Reports which source was used
```

## Cached Scripts

The skill includes 12 complete, working scripts you can reference:

### TypeScript Scripts

1. **multi-tool-workflow.ts** - Sequential pipeline with data flow
2. **file-processing.ts** - Batch file operations with filtering
3. **parallel-execution.ts** - Concurrent operations with Promise.all
4. **error-recovery.ts** - Retry logic and fallback strategies
5. **conditional-logic.ts** - Dynamic tool selection based on data
6. **data-aggregation.ts** - Combine data from multiple sources

### Python Scripts

1. **multi_tool_workflow.py** - Sequential pipeline with data flow
2. **file_processing.py** - Batch file operations with filtering
3. **parallel_execution.py** - Concurrent operations with asyncio.gather
4. **error_recovery.py** - Retry logic and fallback strategies
5. **conditional_logic.py** - Dynamic tool selection based on data
6. **data_aggregation.py** - Combine data from multiple sources

Each script includes:
- Comprehensive header with purpose and use case
- Complete working code with error handling
- Adaptation instructions
- Multiple pattern variations

## Templates

Four template files provide minimal starting points:

- `basic-typescript.template.ts` - Single tool call skeleton
- `basic-python.template.py` - Single tool call skeleton
- `multi-tool.template.ts` - Multiple tool composition
- `multi-tool.template.py` - Multiple tool composition

## When to Use This Skill

### ✅ Use Code Execution When:

- Composing 3+ MCP tool calls
- Complex conditional logic based on tool results
- Processing/transforming results from multiple tools
- Reducing token overhead with many MCP servers
- Implementing retry logic or error recovery
- Parallel execution of independent operations

### ❌ Use Direct Tool Calls When:

- Simple single-tool operations
- Straightforward reads/writes without processing
- When direct tool call is clearer
- UI-focused interactions (use slash commands)

## Documentation

- **SKILL.md** - Main skill instructions and quick start
- **TYPESCRIPT_GUIDE.md** - TypeScript patterns, Deno environment, best practices
- **PYTHON_GUIDE.md** - Python patterns, async/await, type hints
- **EXAMPLES.md** - 6 complete real-world examples
- **REFERENCE.md** - Complete API reference for callMCPTool/call_mcp_tool

## Troubleshooting

### Skill Not Activating

**Problem**: Claude Code doesn't use the skill

**Solutions**:
1. Check skill is installed: `ls ~/.claude/skills/code-executor/SKILL.md`
2. Verify YAML frontmatter in SKILL.md is valid
3. Try more explicit language: "Use code execution to call multiple MCP tools"

### Tool Not Found Error

**Problem**: `Error: MCP tool 'mcp__server__tool' not found`

**Solutions**:
1. Check tool name format: `mcp__<server>__<tool>`
2. Verify MCP server is running: Check `.mcp.json` configuration
3. List available tools (if your setup supports introspection)

### Execution Timeout

**Problem**: Code execution times out

**Solutions**:
1. Reduce the number of operations
2. Use parallel execution (Promise.all/asyncio.gather)
3. Increase timeout in code-executor-MCP configuration
4. Break into smaller chunks

### Permission Denied

**Problem**: Cannot read/write files or access network

**Solutions**:
1. Check file paths are within allowed directories (typically /tmp)
2. Verify network hosts are in allowlist
3. Review code-executor-MCP security configuration

## Configuration

### Skill Configuration

The skill is configured via the YAML frontmatter in `SKILL.md`:

```yaml
---
name: code-executor
description: Execute TypeScript or Python code to dynamically call multiple MCP tools...
allowed-tools: [executeTypescript, executePython]
---
```

### code-executor-MCP Configuration

Configure the MCP server in `.mcp.json`:

```json
{
  "mcpServers": {
    "code-executor": {
      "command": "code-executor-mcp",
      "args": ["--config", ".mcp.json"]
    }
  }
}
```

## Security Considerations

### Sandboxed Execution

- **TypeScript**: Runs in sandboxed Deno environment
- **Python**: Runs in isolated subprocess
- **Filesystem**: Limited to /tmp and approved paths
- **Network**: Restricted to allowed hosts
- **Memory**: 128MB limit for TypeScript

### Best Practices

1. **Validate inputs** before calling tools
2. **Handle errors** gracefully with try/catch
3. **Use allowlists** to restrict which tools can be called
4. **Avoid sensitive data** in logs
5. **Review generated code** before execution in sensitive contexts

## Contributing

Contributions welcome! To add new cached scripts or improve documentation:

1. Fork the repository
2. Create a feature branch
3. Add your script to `scripts/typescript/` or `scripts/python/`
4. Include comprehensive header with:
   - Purpose and use case
   - Adaptation instructions
   - Example usage
5. Test the script
6. Submit a pull request

## Development

### Adding New Scripts

1. Create script file in appropriate directory
2. Include header documentation
3. Test with actual MCP tools
4. Update this README if adding new categories

### Testing Scripts

```bash
# Test TypeScript script (requires code-executor-MCP running)
deno run --allow-net scripts/typescript/your-script.ts

# Test Python script
python scripts/python/your_script.py
```

## License

MIT License - See LICENSE file for details

## Related Projects

- [code-executor-MCP](https://github.com/aberemia24/code-executor-MCP) - The MCP server that executes the code
- [Claude Code](https://docs.claude.com/en/docs/claude-code) - The AI coding assistant
- [MCP Protocol](https://modelcontextprotocol.io) - Model Context Protocol specification

## Support

For issues related to:
- **This skill**: Open an issue in this repository
- **code-executor-MCP**: See https://github.com/aberemia24/code-executor-MCP
- **Claude Code**: See https://docs.claude.com/en/docs/claude-code
- **MCP Protocol**: See https://modelcontextprotocol.io

## Changelog

### v1.0.0 (2025-11-11)

- Initial release
- 12 cached scripts (6 TypeScript + 6 Python)
- 4 template files
- Comprehensive documentation (5 guide files)
- Support for both TypeScript (Deno) and Python execution

## Acknowledgments

- Inspired by [code-executor-MCP](https://github.com/aberemia24/code-executor-MCP) by aberemia24
- Built for the Claude Code ecosystem by Anthropic
- Thanks to the MCP community for the protocol specification
