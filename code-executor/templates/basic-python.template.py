"""
Template: Basic Python MCP Tool Call
Purpose: Minimal starting point for single tool call
Use Case: When you need to call one MCP tool and process its result

How to Adapt:
1. Replace 'mcp__server__tool' with your actual tool name
2. Update parameters dict with required parameters for your tool
3. Add your custom processing logic in the process section
4. Customize error handling for your specific needs
5. Update return value structure as needed

Example Usage:
Copy this template, rename it, and modify for your specific use case
"""

# TODO: Replace with your tool name (format: mcp__server__tool)
TOOL_NAME = 'mcp__server__tool'

# TODO: Define parameters for your tool call
parameters = {
    # Add your parameters here
    # Example:
    # 'path': '/tmp/data.json',
    # 'encoding': 'utf-8'
}

try:
    print(f'Calling {TOOL_NAME}...')

    # Step 1: Call MCP tool
    result = await call_mcp_tool(TOOL_NAME, parameters)

    print('Tool call successful')

    # Step 2: TODO: Process the result
    # Add your custom logic here
    processed = result  # Replace with actual processing

    # Step 3: TODO: Return your result
    return {
        'success': True,
        'data': processed
        # Add any additional fields you need
    }

except Exception as error:
    # Step 4: Handle errors
    print(f'Error calling {TOOL_NAME}: {error}')

    return {
        'success': False,
        'error': str(error)
    }
