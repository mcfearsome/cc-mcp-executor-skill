"""
Script: Data Aggregation
Purpose: Fetch data from multiple sources, transform, and combine into unified format
Use Case: Building dashboards, generating reports, combining data from multiple APIs/databases
MCP Tools Used: Multiple data source tools (APIs, databases, services)

How to Adapt:
1. Replace data source tools with your actual sources
2. Customize data transformation logic for your schema
3. Adjust aggregation methods (merge, join, union)
4. Add your specific calculations and metrics
5. Update output format for your use case

Example Usage:
Combine user data from multiple databases, aggregate metrics from
different analytics services, merge API responses
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from lib.mcp_client import call_mcp_tool, call_mcp_tools_parallel, call_mcp_tools_parallel_safe

import asyncio
import json
from typing import List, Dict, Any, Callable
from datetime import datetime

def transform_source_a(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Transform data from source A to common format."""
    return [{
        'id': item['user_id'],
        'name': item['full_name'],
        'email': item['email_address'],
        'joined': datetime.fromisoformat(item['created_at']),
        'source': 'source-a',
        'metadata': {
            'original_id': item['user_id'],
            'last_seen': item.get('last_login')
        }
    } for item in data]

def transform_source_b(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Transform data from source B to common format."""
    return [{
        'id': str(item['id']),
        'name': f"{item['first_name']} {item['last_name']}",
        'email': item['contact']['email'],
        'joined': datetime.fromisoformat(item['registration_date']),
        'source': 'source-b',
        'metadata': {
            'original_id': item['id'],
            'subscription': item.get('subscription_type')
        }
    } for item in data]

def transform_source_c(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Transform data from source C to common format."""
    return [{
        'id': item['uid'],
        'name': item['display_name'],
        'email': item['primary_email'],
        'joined': datetime.fromtimestamp(item['signup_timestamp']),
        'source': 'source-c',
        'metadata': {
            'original_id': item['uid'],
            'verified': item.get('is_verified')
        }
    } for item in data]

async def aggregate_from_multiple_sources() -> Dict[str, Any]:
    """Fetch and transform data from multiple sources."""
    start_time = datetime.now()

    print('=== Data Aggregation from Multiple Sources ===\n')

    # Define data sources with their transformations
    sources = [
        {
            'name': 'Database A',
            'tool': 'mcp__database__query',
            'params': {
                'connection': 'postgres-prod',
                'query': 'SELECT * FROM users WHERE active = true LIMIT 1000'
            },
            'transform': transform_source_a
        },
        {
            'name': 'API B',
            'tool': 'mcp__api__fetch',
            'params': {
                'endpoint': '/api/v2/users',
                'method': 'GET',
                'params': {'limit': 1000, 'active': True}
            },
            'transform': transform_source_b
        },
        {
            'name': 'Service C',
            'tool': 'mcp__service__get_users',
            'params': {
                'filter': 'active',
                'max_results': 1000
            },
            'transform': transform_source_c
        }
    ]

    # Fetch from all sources in parallel
    print('Fetching from all sources in parallel...\n')

    async def fetch_and_transform(source: Dict[str, Any], index: int) -> Dict[str, Any]:
        source_start = datetime.now()
        print(f"[{index + 1}/{len(sources)}] Fetching from {source['name']}...")

        try:
            raw_data = await call_mcp_tool(source['tool'], source['params'])
            duration = (datetime.now() - source_start).total_seconds() * 1000

            print(f"✓ [{index + 1}/{len(sources)}] {source['name']}: {len(raw_data)} records ({duration:.0f}ms)")

            # Transform to common format
            transformed = source['transform'](raw_data) if source.get('transform') else raw_data

            return {
                'source_name': source['name'],
                'success': True,
                'data': transformed,
                'record_count': len(transformed),
                'duration': duration
            }
        except Exception as error:
            duration = (datetime.now() - source_start).total_seconds() * 1000
            print(f"✗ [{index + 1}/{len(sources)}] {source['name']} failed: {error} ({duration:.0f}ms)")

            return {
                'source_name': source['name'],
                'success': False,
                'error': str(error),
                'duration': duration
            }

    results = await asyncio.gather(*[
        fetch_and_transform(source, i) for i, source in enumerate(sources)
    ], return_exceptions=True)

    # Process results
    successful = [r for r in results if not isinstance(r, Exception) and r['success']]
    failed = [r for r in results if isinstance(r, Exception) or not r['success']]

    print(f'\n✓ Succeeded: {len(successful)}/{len(sources)}')
    print(f'✗ Failed: {len(failed)}/{len(sources)}')

    # Combine all data
    all_data = []
    for s in successful:
        all_data.extend(s['data'])

    print(f'\nTotal records fetched: {len(all_data)}')

    # Deduplicate by email (example deduplication strategy)
    print('Deduplicating records...')
    unique_data = {item['email']: item for item in all_data}.values()
    unique_list = list(unique_data)

    print(f'Unique records: {len(unique_list)}')

    # Calculate statistics
    source_distribution = {s['source_name']: s['record_count'] for s in successful}

    stats = {
        'total_fetched': len(all_data),
        'unique_records': len(unique_list),
        'duplicates_removed': len(all_data) - len(unique_list),
        'by_source': source_distribution,
        'oldest_record': min(unique_list, key=lambda x: x['joined'])['joined'].isoformat() if unique_list else None,
        'newest_record': max(unique_list, key=lambda x: x['joined'])['joined'].isoformat() if unique_list else None
    }

    duration = (datetime.now() - start_time).total_seconds() * 1000

    print('\n=== Aggregation Complete ===')
    print(f'Duration: {duration:.0f}ms')
    print(f'Records: {len(unique_list)} unique from {len(all_data)} total')

    return {
        'sources': [s['source_name'] for s in successful],
        'record_count': len(unique_list),
        'data': unique_list,
        'metadata': {
            'timestamp': datetime.now().isoformat(),
            'duration': duration,
            'sources_succeeded': len(successful),
            'sources_failed': len(failed)
        }
    }

async def aggregate_metrics() -> Dict[str, Any]:
    """Aggregate metrics from multiple analytics sources."""
    print('\n\n=== Aggregating Metrics from Multiple Sources ===\n')

    start_time = datetime.now()

    # Fetch metrics from different sources in parallel
    web_analytics, mobile_analytics, server_metrics = await asyncio.gather(
        call_mcp_tool('mcp__analytics__get_web_metrics', {
            'period': 'last_7_days',
            'metrics': ['pageviews', 'sessions', 'bounce_rate']
        }),
        call_mcp_tool('mcp__analytics__get_mobile_metrics', {
            'period': 'last_7_days',
            'metrics': ['app_opens', 'active_users', 'crash_rate']
        }),
        call_mcp_tool('mcp__monitoring__get_server_metrics', {
            'period': 'last_7_days',
            'metrics': ['cpu', 'memory', 'requests']
        })
    )

    print('✓ All metrics fetched')

    # Combine and calculate aggregate metrics
    combined = {
        'period': 'last_7_days',
        'timestamp': datetime.now().isoformat(),
        'web': {
            'total_pageviews': sum(web_analytics['pageviews']),
            'avg_sessions': sum(web_analytics['sessions']) / 7,
            'bounce_rate': sum(web_analytics['bounce_rate']) / 7
        },
        'mobile': {
            'total_app_opens': sum(mobile_analytics['app_opens']),
            'avg_active_users': sum(mobile_analytics['active_users']) / 7,
            'crash_rate': sum(mobile_analytics['crash_rate']) / 7
        },
        'server': {
            'avg_cpu': sum(server_metrics['cpu']) / 7,
            'avg_memory': sum(server_metrics['memory']) / 7,
            'total_requests': sum(server_metrics['requests'])
        },
        'metadata': {
            'duration': (datetime.now() - start_time).total_seconds() * 1000,
            'sources': ['web-analytics', 'mobile-analytics', 'server-monitoring']
        }
    }

    print('✓ Metrics aggregated and calculated')

    # Store aggregated metrics
    await call_mcp_tool('mcp__database__insert', {
        'table': 'aggregated_metrics',
        'record': combined
    })

    print('✓ Aggregated metrics stored')

    return combined

async def join_data_sources() -> List[Dict[str, Any]]:
    """Join data from multiple sources based on common key."""
    print('\n\n=== Joining Data from Multiple Sources ===\n')

    start_time = datetime.now()

    # Fetch related data in parallel
    users, orders, preferences = await asyncio.gather(
        call_mcp_tool('mcp__database__query', {
            'table': 'users',
            'fields': ['id', 'name', 'email']
        }),
        call_mcp_tool('mcp__database__query', {
            'table': 'orders',
            'fields': ['id', 'user_id', 'total', 'created_at']
        }),
        call_mcp_tool('mcp__database__query', {
            'table': 'user_preferences',
            'fields': ['user_id', 'theme', 'notifications']
        })
    )

    print(f'✓ Fetched: {len(users)} users, {len(orders)} orders, {len(preferences)} preferences')

    # Create lookup maps for efficient joining
    prefs_map = {p['user_id']: p for p in preferences}
    orders_map: Dict[str, List[Dict[str, Any]]] = {}

    # Group orders by user
    for order in orders:
        user_id = order['user_id']
        if user_id not in orders_map:
            orders_map[user_id] = []
        orders_map[user_id].append(order)

    # Join data
    enriched_users = []
    for user in users:
        user_orders = orders_map.get(user['id'], [])
        user_prefs = prefs_map.get(user['id'], {})

        enriched_users.append({
            **user,
            'preferences': user_prefs,
            'orders': {
                'count': len(user_orders),
                'total': sum(o['total'] for o in user_orders),
                'recent': user_orders[:5]
            }
        })

    duration = (datetime.now() - start_time).total_seconds() * 1000

    print(f'✓ Joined data for {len(enriched_users)} users')
    print(f'Duration: {duration:.0f}ms')

    return enriched_users

# Execute all aggregation examples
print('=== Running All Aggregation Examples ===\n')

# Example 1: Multi-source aggregation
agg1 = await aggregate_from_multiple_sources()
print(f"\nExample 1 Complete: {agg1['record_count']} records from {len(agg1['sources'])} sources")

# Example 2: Metrics aggregation
agg2 = await aggregate_metrics()
print(f"\nExample 2 Complete: Metrics from {len(agg2['metadata']['sources'])} sources")

# Example 3: Data joining
agg3 = await join_data_sources()
print(f'\nExample 3 Complete: {len(agg3)} enriched records')

print('\n=== All Aggregation Examples Complete ===')
