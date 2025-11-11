"""
Script: Conditional Logic
Purpose: Demonstrate dynamic tool selection based on conditions and data
Use Case: Routing to different services, handling multiple scenarios, adaptive workflows
MCP Tools Used: Various tools selected conditionally based on runtime data

How to Adapt:
1. Define your decision criteria and conditions
2. Map conditions to appropriate tool calls
3. Add your specific business logic
4. Customize error handling for each path
5. Update result formatting based on different outcomes

Example Usage:
Route requests to different APIs based on data type, select processing
method based on file size, choose storage backend based on content
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from lib.mcp_client import call_mcp_tool, call_mcp_tools_parallel, call_mcp_tools_parallel_safe

import json
from typing import Dict, Any, Literal
from datetime import datetime

async def route_by_data_type(data: str, data_type: str) -> Dict[str, Any]:
    """Route processing based on data type."""
    start_time = datetime.now()

    print(f'\n=== Routing by Data Type: {data_type} ===')

    # Decision logic based on data type
    if data_type == 'json':
        tool = 'mcp__json__parse'
        params = {'content': data, 'validate': True}
        reason = 'JSON data detected, using JSON parser with validation'
    elif data_type == 'xml':
        tool = 'mcp__xml__parse'
        params = {'content': data, 'schema': 'auto'}
        reason = 'XML data detected, using XML parser with schema detection'
    elif data_type == 'csv':
        tool = 'mcp__csv__parse'
        params = {'content': data, 'has_headers': True}
        reason = 'CSV data detected, using CSV parser assuming headers'
    elif data_type == 'binary':
        tool = 'mcp__binary__decode'
        params = {'content': data, 'encoding': 'base64'}
        reason = 'Binary data detected, using binary decoder'
    else:
        tool = 'mcp__text__process'
        params = {'content': data}
        reason = 'Unknown type, defaulting to text processor'

    print(f'Decision: {reason}')
    print(f'Tool: {tool}')

    try:
        result = await call_mcp_tool(tool, params)
        duration = (datetime.now() - start_time).total_seconds()

        return {
            'success': True,
            'path': 'type-based-routing',
            'tool': tool,
            'reason': reason,
            'data': result,
            'duration': duration
        }
    except Exception as error:
        print(f'Error: {error}')
        duration = (datetime.now() - start_time).total_seconds()

        return {
            'success': False,
            'path': 'type-based-routing',
            'tool': tool,
            'reason': f'Failed: {error}',
            'duration': duration
        }

async def select_processing_strategy(
    data_type: str,
    priority: Literal['high', 'medium', 'low'],
    size: int,
    requires_validation: bool
) -> Dict[str, Any]:
    """Select processing strategy based on size and priority."""
    start_time = datetime.now()

    print('\n=== Selecting Processing Strategy ===')
    print(f'Size: {size} bytes, Priority: {priority}')

    # Complex decision tree
    if size > 10 * 1024 * 1024:  # Large files (>10MB)
        if priority == 'high':
            tool = 'mcp__processor__parallel_batch'
            params = {'chunk_size': 1024 * 1024, 'workers': 4}
            reason = 'Large file + high priority = parallel batch processing'
        else:
            tool = 'mcp__processor__background_queue'
            params = {'queue_name': 'large-files'}
            reason = 'Large file + normal priority = background queue'
    elif size > 1024 * 1024:  # Medium files (1-10MB)
        tool = 'mcp__processor__standard'
        params = {'optimize': True}
        reason = 'Medium file = standard optimized processing'
    else:  # Small files (<1MB)
        if requires_validation:
            tool = 'mcp__processor__validate_and_process'
            params = {'strict_mode': True}
            reason = 'Small file + validation required = validate and process'
        else:
            tool = 'mcp__processor__fast'
            params = {'skip_validation': True}
            reason = 'Small file + no validation = fast processing'

    print(f'Decision: {reason}')
    print(f'Tool: {tool}')

    try:
        result = await call_mcp_tool(tool, params)
        duration = (datetime.now() - start_time).total_seconds()

        return {
            'success': True,
            'path': 'strategy-selection',
            'tool': tool,
            'reason': reason,
            'data': result,
            'duration': duration
        }
    except Exception as error:
        print(f'Error: {error}')
        duration = (datetime.now() - start_time).total_seconds()

        return {
            'success': False,
            'path': 'strategy-selection',
            'tool': tool,
            'reason': f'Failed: {error}',
            'duration': duration
        }

async def cascading_fallback(item_id: str) -> Dict[str, Any]:
    """Cascading fallback with multiple conditions."""
    start_time = datetime.now()

    print(f'\n=== Cascading Fallback for: {item_id} ===')

    # Try to get item metadata to determine best source
    try:
        metadata = await call_mcp_tool('mcp__metadata__get', {'id': item_id})
        print('✓ Metadata retrieved')
    except Exception:
        print('⚠ Could not retrieve metadata, using defaults')
        metadata = {'source': 'unknown', 'cached': False}

    # Decision based on metadata
    sources = []

    if metadata.get('cached'):
        sources.append({
            'name': 'cache',
            'tool': 'mcp__cache__get',
            'params': {'key': item_id},
            'reason': 'Item is marked as cached'
        })

    if metadata.get('source') == 'database':
        sources.append({
            'name': 'database',
            'tool': 'mcp__database__get',
            'params': {'table': 'items', 'id': item_id},
            'reason': 'Item source is database'
        })

    if metadata.get('source') in ['api', 'unknown']:
        sources.append({
            'name': 'api',
            'tool': 'mcp__api__fetch',
            'params': {'endpoint': f'/items/{item_id}'},
            'reason': 'Item source is API or unknown'
        })

    # Always add storage as final fallback
    sources.append({
        'name': 'storage',
        'tool': 'mcp__storage__retrieve',
        'params': {'key': item_id},
        'reason': 'Fallback to cold storage'
    })

    print(f'Attempting {len(sources)} sources in order...')

    # Try each source in order
    for source in sources:
        print(f"\nTrying {source['name']}: {source['reason']}")

        try:
            result = await call_mcp_tool(source['tool'], source['params'])

            if result and result.get('data'):
                print(f"✓ Success from {source['name']}")
                duration = (datetime.now() - start_time).total_seconds()

                return {
                    'success': True,
                    'path': 'cascading-fallback',
                    'tool': source['tool'],
                    'reason': f"Retrieved from {source['name']}: {source['reason']}",
                    'data': result['data'],
                    'duration': duration
                }
            else:
                print(f"✗ {source['name']} returned empty result")
        except Exception as error:
            print(f"✗ {source['name']} failed: {error}")

    # All sources failed
    duration = (datetime.now() - start_time).total_seconds()
    return {
        'success': False,
        'path': 'cascading-fallback',
        'tool': 'none',
        'reason': 'All sources exhausted',
        'duration': duration
    }

async def handle_by_permissions(user_id: str, action: str) -> Dict[str, Any]:
    """Switch based on user role/permissions."""
    start_time = datetime.now()

    print('\n=== Permission-Based Handling ===')
    print(f'User: {user_id}, Action: {action}')

    # Get user permissions
    permissions = await call_mcp_tool('mcp__auth__get_permissions', {
        'user_id': user_id
    })

    print(f"Permissions: {permissions['role']} ({permissions['level']})")

    # Route based on permissions
    if permissions['role'] == 'admin':
        tool = 'mcp__admin__execute_action'
        params = {'action': action, 'user_id': user_id, 'skip_approval': True}
        reason = 'Admin user - direct execution without approval'
    elif permissions['role'] == 'power-user' and permissions['level'] >= 5:
        tool = 'mcp__poweruser__execute_action'
        params = {'action': action, 'user_id': user_id, 'with_audit': True}
        reason = 'Power user with sufficient level - execute with audit'
    elif permissions['role'] == 'user':
        if action in ['read', 'list']:
            tool = 'mcp__user__read_action'
            params = {'action': action, 'user_id': user_id}
            reason = 'Regular user - read-only action allowed'
        else:
            tool = 'mcp__workflow__create_approval_request'
            params = {'action': action, 'user_id': user_id, 'requires_approval': True}
            reason = 'Regular user - write action requires approval'
    else:
        tool = 'mcp__auth__deny'
        params = {'user_id': user_id, 'action': action, 'reason': 'Insufficient permissions'}
        reason = 'Insufficient permissions - action denied'

    print(f'Decision: {reason}')
    print(f'Tool: {tool}')

    try:
        result = await call_mcp_tool(tool, params)
        duration = (datetime.now() - start_time).total_seconds()

        return {
            'success': True,
            'path': 'permission-based',
            'tool': tool,
            'reason': reason,
            'data': result,
            'duration': duration
        }
    except Exception as error:
        duration = (datetime.now() - start_time).total_seconds()

        return {
            'success': False,
            'path': 'permission-based',
            'tool': tool,
            'reason': f'Failed: {error}',
            'duration': duration
        }

# Execute examples
print('=== Conditional Logic Examples ===\n')

# Example 1: Data type routing
ex1 = await route_by_data_type('{"key": "value"}', 'json')
print(f"\nResult 1: {'✓' if ex1['success'] else '✗'} - {ex1['reason']}")

# Example 2: Processing strategy
ex2 = await select_processing_strategy(
    data_type='json',
    priority='high',
    size=15 * 1024 * 1024,
    requires_validation=True
)
print(f"\nResult 2: {'✓' if ex2['success'] else '✗'} - {ex2['reason']}")

# Example 3: Cascading fallback
ex3 = await cascading_fallback('item-12345')
print(f"\nResult 3: {'✓' if ex3['success'] else '✗'} - {ex3['reason']}")

# Example 4: Permission-based routing
ex4 = await handle_by_permissions('user-789', 'delete')
print(f"\nResult 4: {'✓' if ex4['success'] else '✗'} - {ex4['reason']}")

print('\n=== All Examples Complete ===')
