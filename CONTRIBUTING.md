# Contributing to Code Executor Skill

Thank you for your interest in contributing! This document provides guidelines for contributing to the code-executor skill.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository**
   ```bash
   gh repo fork mcfearsome/cc-mcp-executor-skill
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/cc-mcp-executor-skill.git
   cd cc-mcp-executor-skill
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/mcfearsome/cc-mcp-executor-skill.git
   ```

## Development Setup

### Prerequisites

- **Deno** v1.30+ (for TypeScript development)
  ```bash
  curl -fsSL https://deno.land/install.sh | sh
  ```

- **Python** 3.8+ (for Python development)
  ```bash
  python3 --version
  ```

- **MCP Filesystem Server** (for testing)
  ```bash
  npm install -g @modelcontextprotocol/server-filesystem
  ```

### Development Tools

Install linting and formatting tools:

```bash
# Python
pip install black ruff mypy

# Deno has built-in linting and formatting
deno --version
```

### Test Environment

Create test MCP configuration:

```bash
mkdir -p ~/.claude
cat > ~/.claude/subagent-mcp.json << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}
EOF
```

## How to Contribute

### Types of Contributions

1. **Bug Fixes** - Fix issues in existing code
2. **New Cached Scripts** - Add proven patterns for common workflows
3. **New Templates** - Create starting points for common use cases
4. **Documentation** - Improve guides, examples, or API docs
5. **Performance** - Optimize existing code
6. **Tests** - Add or improve test coverage

### Contribution Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Follow coding standards (see below)
   - Add tests for new functionality
   - Update documentation

3. **Test your changes**
   ```bash
   # TypeScript
   deno lint code-executor/lib/mcp-client.ts
   deno fmt --check code-executor/
   deno check code-executor/scripts/typescript/*.ts

   # Python
   black --check code-executor/
   ruff check code-executor/
   mypy code-executor/lib/mcp_client.py --ignore-missing-imports
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new cached script for batch processing"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Use the PR template
   - Reference any related issues
   - Provide clear description of changes

## Coding Standards

### TypeScript (Deno)

- Use TypeScript interfaces for data structures
- Follow Deno style guide
- Use `deno fmt` for formatting
- Use `deno lint` for linting
- Include JSDoc comments for exported functions
- Use `import` with file extensions (`.ts`)

**Example:**
```typescript
/**
 * Call an MCP tool via the protocol
 * @param toolName - Full MCP tool name (mcp__server__tool)
 * @param parameters - Tool parameters as object
 * @returns Tool result
 */
export async function callMCPTool(
  toolName: string,
  parameters: Record<string, any> = {}
): Promise<any> {
  // Implementation
}
```

### Python

- Follow PEP 8 style guide
- Use `black` for formatting (line length: 88)
- Use `ruff` for linting
- Use type hints (Python 3.8+)
- Include docstrings for functions and classes

**Example:**
```python
async def call_mcp_tool(
    tool_name: str,
    parameters: Dict[str, Any] = None
) -> Any:
    """
    Call an MCP tool via the protocol.

    Args:
        tool_name: Full MCP tool name (mcp__server__tool)
        parameters: Tool parameters as dict

    Returns:
        Tool result

    Raises:
        MCPError: If tool call fails
    """
    # Implementation
```

### Documentation

- Use GitHub-flavored Markdown
- Include code examples for new features
- Keep line length reasonable (80-100 characters)
- Use clear, concise language
- Include YAML frontmatter in SKILL.md

### Cached Scripts

When adding new cached scripts:

1. **Header comments** must include:
   - Script name and purpose
   - Use case description
   - MCP tools used
   - How to adapt instructions
   - Example usage
   - Execution command

2. **Code structure:**
   - Import MCP client at top
   - Define TypeScript interfaces or Python TypedDicts
   - Implement main function
   - Include comprehensive error handling
   - Log progress at each step
   - Return structured result

3. **Both languages:**
   - Create TypeScript version in `scripts/typescript/`
   - Create Python version in `scripts/python/`
   - Keep logic identical between versions
   - Test both versions

**Template for new cached script:**
```typescript
/**
 * Script: [Name]
 * Purpose: [Clear description]
 * Use Case: [When to use this]
 * MCP Tools Used: [List of tools]
 *
 * How to Adapt:
 * 1. [Step 1]
 * 2. [Step 2]
 * ...
 *
 * Example Usage:
 * [Concrete example]
 *
 * Execution:
 * MCP_CONFIG_PATH=~/.claude/subagent-mcp.json deno run --allow-read --allow-run --allow-env script.ts
 */

import { callMCPTool } from '../../lib/mcp-client.ts';

// Your implementation
```

## Testing Requirements

### Required Tests

All contributions must include appropriate tests:

1. **For new features:**
   - Unit tests for new functions
   - Integration tests with MCP servers
   - Documentation examples must work

2. **For bug fixes:**
   - Test that reproduces the bug
   - Test that verifies the fix

3. **For cached scripts:**
   - Manual test with real MCP server
   - Verify both TypeScript and Python versions work
   - Test error handling

### Running Tests

```bash
# Quick smoke test
bash test-smoke.sh

# Full test suite (see TESTING.md)
MCP_CONFIG_PATH=~/.claude/subagent-mcp.json \
  deno run --allow-read --allow-run --allow-env code-executor/scripts/typescript/multi-tool-workflow.ts
```

### Test Data

Create test data in `/tmp/test-data/`:

```bash
mkdir -p /tmp/test-data
echo '{"test": "data"}' > /tmp/test-data/test.json
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Scopes

- `typescript`: TypeScript code
- `python`: Python code
- `mcp-client`: MCP client library
- `scripts`: Cached scripts
- `templates`: Templates
- `docs`: Documentation
- `ci`: CI/CD workflows

### Examples

```
feat(scripts): add batch file processing cached script

Add new TypeScript and Python cached scripts for batch file processing.
Includes filtering, parallel processing, and aggregation patterns.

Closes #123
```

```
fix(mcp-client): handle connection timeout gracefully

Add retry logic with exponential backoff when MCP server connection times out.
Improves reliability for unreliable network connections.

Fixes #456
```

```
docs(readme): clarify MCP_CONFIG_PATH usage

Update installation instructions to emphasize that MCP_CONFIG_PATH should
only be set in execution commands, not globally, to maintain architecture.
```

## Pull Request Process

### Before Submitting

1. **Update documentation** - Ensure README, guides are current
2. **Run linters** - Fix all linting errors
3. **Test thoroughly** - Verify all tests pass
4. **Update CHANGELOG** - Add entry for your changes (if applicable)
5. **Rebase on main** - Ensure clean merge

### PR Requirements

- [ ] Descriptive title following conventional commits
- [ ] Completed PR template
- [ ] Passing CI checks
- [ ] No merge conflicts
- [ ] Reviewed your own changes
- [ ] Added/updated tests
- [ ] Updated documentation
- [ ] Clean commit history

### Review Process

1. **Automated checks** - CI must pass
2. **Code review** - At least one maintainer approval required
3. **Testing** - Reviewers may test manually
4. **Revisions** - Address feedback promptly
5. **Merge** - Maintainer will merge when approved

### After Merge

- Delete your branch
- Pull latest main
- Celebrate! 🎉

## Style Guide Quick Reference

### TypeScript

```typescript
// Good
export async function callMCPTool(
  toolName: string,
  parameters: Record<string, any> = {}
): Promise<any> {
  const { server, tool } = parseMCPToolName(toolName);
  return await callToolViaStdio(server, tool, parameters);
}

// Bad
export async function callMCPTool(toolName,parameters) {
    let {server,tool}=parseMCPToolName(toolName)
    return await callToolViaStdio(server,tool,parameters)
}
```

### Python

```python
# Good
async def call_mcp_tool(
    tool_name: str,
    parameters: Dict[str, Any] = None
) -> Any:
    """Call an MCP tool."""
    if parameters is None:
        parameters = {}
    return await call_tool_via_stdio(tool_name, parameters)

# Bad
async def call_mcp_tool(tool_name,parameters={}):
    return await call_tool_via_stdio(tool_name,parameters)
```

## Questions?

- **Bugs or Features:** Open an issue
- **General Questions:** Start a discussion
- **Security Issues:** Email [security contact]

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Code Executor Skill!** 🚀
