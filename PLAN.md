# Code Executor MCP → Claude Code Skill Translation Plan

## Executive Summary

This document outlines the strategy for translating the [code-executor-MCP](https://github.com/aberemia24/code-executor-MCP) into a Claude Code Skill. The goal is to teach Claude Code how to use code execution for efficient multi-tool MCP workflows.

## Background Research

### Code-Executor-MCP Analysis

**Problem it solves:** Token bloat from exposing too many MCP tools
- Without it: 47 MCP tools = 141k tokens just for schemas
- With it: 2 tools = 1.6k tokens (98% reduction)

**How it works:**
- Exposes `executeTypescript` and `executePython` tools
- Code can call `callMCPTool(toolName, params)` to invoke other MCPs dynamically
- Uses progressive disclosure: schemas loaded only when actually needed

**Security features:**
- Sandboxed Deno execution for TypeScript
- Subprocess isolation for Python
- Allowlisting, rate limiting, audit logs
- Schema validation with AJV

**Architecture highlights:**
- TypeScript codebase with 139 tests
- Connection pooling (max 100 concurrent)
- LRU caching with mutex locking
- Streaming proxy for real-time output
- File integrity checks (SHA-256 hashing)

### Claude Code Skills Analysis

**What are Skills:**
- Model-invoked capabilities (Claude decides when to activate)
- Folder-based structure with `SKILL.md` + optional supporting files
- Located in `~/.claude/skills/` or `.claude/skills/`

**File structure:**
```
skill-name/
├── SKILL.md (required: YAML frontmatter + instructions)
├── examples.md (optional)
├── reference.md (optional)
└── scripts/ (optional)
```

**YAML frontmatter requirements:**
```yaml
---
name: lowercase-with-hyphens (max 64 chars)
description: What it does and when to use it (max 1024 chars)
allowed-tools: [optional tool restrictions]
---
```

**Best practices:**
- One Skill = one focused capability
- Discoverable descriptions with trigger keywords
- Progressive loading (main SKILL.md → supporting files as needed)
- Share via plugins or git

## Translation Strategy

### Core Concept

The code-executor-MCP server will remain unchanged. The Skill teaches Claude Code **when and how** to use the existing `executeTypescript` and `executePython` MCP tools effectively.

### Mapping MCP Server → Skill

| MCP Server Component | Skill Equivalent |
|---------------------|------------------|
| `executeTypescript` tool | Instructions on writing TS code with `callMCPTool()` |
| `executePython` tool | Instructions on writing Python code with `call_mcp_tool()` |
| Sandbox security | Guidelines for safe code patterns |
| Schema validation | Instructions on proper parameter formatting |
| Tool allowlisting | Best practices for tool selection |
| Connection pooling | Context about concurrent execution limits |
| Audit logging | Awareness of execution tracking |

### Proposed Skill Structure

```
code-executor/
├── SKILL.md               # Main instructions and patterns
├── TYPESCRIPT_GUIDE.md    # Deep dive on TS execution
├── PYTHON_GUIDE.md        # Deep dive on Python execution
├── EXAMPLES.md            # Common use cases and recipes
└── REFERENCE.md           # API reference for callMCPTool
```

## Detailed Design

### SKILL.md Structure

#### Frontmatter
```yaml
---
name: code-executor
description: Execute TypeScript or Python code to dynamically call multiple MCP tools in a single operation. Use when you need to compose multiple MCP tool calls, process their results together, or reduce token overhead from many MCP tools. Provides progressive disclosure pattern for efficient context usage.
allowed-tools: [executeTypescript, executePython]
---
```

#### Content Sections

1. **Overview**
   - What is code execution for MCP tools
   - Benefits: composition, progressive disclosure, token efficiency
   - When to use vs. direct tool calls

2. **When to Use Code Execution**
   - ✅ Composing multiple MCP operations
   - ✅ Complex conditional logic based on tool results
   - ✅ Processing results from multiple tools together
   - ✅ Reducing token overhead (3+ MCP servers)
   - ❌ Simple single-tool operations
   - ❌ When direct tool call is clearer

3. **TypeScript Quick Start**
   ```typescript
   // Basic pattern
   const result = await callMCPTool('mcp__server__tool', {
     param1: 'value',
     param2: 123
   });

   // Multi-tool composition
   const files = await callMCPTool('mcp__filesystem__list', { path: '/data' });
   const processed = files.map(f => processFile(f));
   const results = await Promise.all(processed);
   ```

4. **Python Quick Start**
   ```python
   # Basic pattern
   result = await call_mcp_tool('mcp__server__tool', {
       'param1': 'value',
       'param2': 123
   })

   # Multi-tool composition
   files = await call_mcp_tool('mcp__filesystem__list', {'path': '/data'})
   results = [await process_file(f) for f in files]
   ```

5. **Common Patterns**
   - Multi-tool workflows
   - Conditional execution
   - Result aggregation
   - Error handling and recovery
   - Parallel execution

6. **Tool Naming Convention**
   - Format: `mcp__<server-name>__<tool-name>`
   - Discovery: list available tools via MCP introspection
   - Examples: `mcp__filesystem__readFile`, `mcp__database__query`

7. **Best Practices**
   - Validate inputs before calling tools
   - Handle errors gracefully with try/catch
   - Return structured results
   - Keep code focused and readable
   - Use TypeScript types when available
   - Log important operations

8. **Security Considerations**
   - Code runs in sandboxed environment
   - Limited filesystem access
   - Network restrictions
   - Memory limits (128MB for TS)
   - Execution timeouts
   - Audit logging active

### TYPESCRIPT_GUIDE.md Content

- Deno environment overview
- Available global functions
- `callMCPTool()` signature and return types
- Async/await patterns
- Error handling with TypeScript
- Type safety best practices
- Available libraries and imports
- Example: Complex multi-step workflow

### PYTHON_GUIDE.md Content

- Python execution environment
- `call_mcp_tool()` signature and return types
- Async patterns in Python
- Error handling with try/except
- Type hints and validation
- Available modules
- Example: Data processing pipeline

### EXAMPLES.md Content

Concrete, copy-paste examples:

1. **File Processing Workflow**
   - List files → Filter → Read → Process → Write results

2. **Multi-API Composition**
   - Fetch from API 1 → Transform data → Post to API 2 → Update database

3. **Data Analysis Pipeline**
   - Read spreadsheet → Analyze data → Generate charts → Create report

4. **Conditional Tool Selection**
   - Check conditions → Call appropriate tool → Handle results differently

5. **Error Recovery Pattern**
   - Try primary tool → Catch error → Fallback to alternative → Log outcome

6. **Parallel Execution**
   - Map tasks → Execute in parallel → Aggregate results

### REFERENCE.md Content

- Full `callMCPTool()` API documentation
- Parameter types and validation
- Return value structure
- Error formats and codes
- Available environment variables
- Execution limits and quotas
- Debugging techniques

## Key Differences from MCP Server

| Aspect | MCP Server | Claude Code Skill |
|--------|-----------|-------------------|
| Purpose | Executes code and proxies MCP calls | Teaches Claude when/how to write code |
| Implementation | TypeScript with Deno/subprocess | Markdown instructions |
| Security | Enforces sandboxing, validation | Documents safe patterns |
| Activation | Always available as MCP tool | Model decides when relevant |
| Scope | Technical implementation | Pattern guidance |

## Implementation Checklist

- [ ] Create `.claude/skills/code-executor/` directory
- [ ] Write `SKILL.md` with frontmatter and main instructions
- [ ] Create `TYPESCRIPT_GUIDE.md` with detailed TS patterns
- [ ] Create `PYTHON_GUIDE.md` with detailed Python patterns
- [ ] Create `EXAMPLES.md` with 6+ real-world examples
- [ ] Create `REFERENCE.md` with API documentation
- [ ] Test skill activation with various prompts
- [ ] Validate YAML frontmatter syntax
- [ ] Test with actual code-executor-MCP server
- [ ] Refine description based on activation accuracy
- [ ] Add installation instructions to README
- [ ] Document prerequisites and setup

## Prerequisites

**For Users:**
1. code-executor-MCP server installed and configured
2. MCP servers properly configured in `.mcp.json`
3. `executeTypescript` and `executePython` tools available
4. Deno installed (for TypeScript execution)
5. Python 3.8+ installed (for Python execution)

**For Development:**
1. Access to code-executor-MCP repository for reference
2. Understanding of MCP protocol
3. Knowledge of Claude Code Skills system
4. Test MCP servers for validation

## Success Metrics

The skill should enable Claude Code to:

✅ Recognize when code execution is more efficient than sequential tool calls
✅ Write syntactically correct TypeScript/Python for MCP tool calls
✅ Properly format tool names (`mcp__server__tool`)
✅ Structure parameters correctly as JSON objects
✅ Handle errors and edge cases gracefully
✅ Compose multi-step workflows efficiently
✅ Reduce overall token consumption in MCP-heavy setups
✅ Make appropriate trade-offs between code execution vs. direct tools

## Testing Strategy

1. **Activation Testing**
   - Verify skill activates for multi-tool scenarios
   - Confirm it doesn't activate for simple single-tool cases
   - Test with various phrasings and contexts

2. **Code Generation Testing**
   - Validate generated TypeScript syntax
   - Validate generated Python syntax
   - Check proper tool naming format
   - Verify parameter structure

3. **Integration Testing**
   - Test with actual code-executor-MCP server
   - Verify code executes successfully
   - Confirm MCP tools are called correctly
   - Validate error handling

4. **Pattern Testing**
   - Multi-tool composition
   - Conditional logic
   - Parallel execution
   - Error recovery

## Limitations and Considerations

**Limitations:**
- Requires code-executor-MCP server installation
- User must configure MCP servers correctly
- Requires TypeScript/Python knowledge
- Security depends on server configuration
- Execution limits (memory, timeout) apply

**When NOT to use this skill:**
- Simple single-tool operations
- When direct tool call is clearer
- UI-focused interactions (use slash commands)
- When code complexity outweighs benefits

**Alternatives:**
- Direct MCP tool calls for simplicity
- Slash commands for user-triggered workflows
- Subagents for complex multi-step tasks

## Future Enhancements

- [ ] Add support for more languages (JavaScript, Go)
- [ ] Include debugging guide
- [ ] Add performance optimization patterns
- [ ] Create testing framework guide
- [ ] Integrate with CI/CD examples
- [ ] Add tool discovery automation
- [ ] Create interactive examples

## References

- [code-executor-MCP repository](https://github.com/aberemia24/code-executor-MCP)
- [Claude Code Skills documentation](https://code.claude.com/docs/en/skills)
- [Anthropic Skills repository](https://github.com/anthropics/skills)
- [MCP Protocol documentation](https://modelcontextprotocol.io)
- [Claude Code MCP integration](https://code.claude.com/docs/en/build/mcp)

## Version History

- **v1.0** (2025-11-11): Initial planning document
