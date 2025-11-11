/**
 * Script: Data Aggregation
 * Purpose: Fetch data from multiple sources, transform, and combine into unified format
 * Use Case: Building dashboards, generating reports, combining data from multiple APIs/databases
 * MCP Tools Used: Multiple data source tools (APIs, databases, services)
 *
 * How to Adapt:
 * 1. Replace data source tools with your actual sources
 * 2. Customize data transformation logic for your schema
 * 3. Adjust aggregation methods (merge, join, union)
 * 4. Add your specific calculations and metrics
 * 5. Update output format for your use case
 *
 * Example Usage:
 * Combine user data from multiple databases, aggregate metrics from
 * different analytics services, merge API responses
 *
 * Execution:
 * deno run --allow-read --allow-run --allow-env data-aggregation.ts
 */

import { callMCPTool, callMCPToolsParallel, callMCPToolsParallelSettled } from '../../lib/mcp-client.ts';

interface DataSource {
  name: string;
  tool: string;
  params: Record<string, any>;
  transform?: (data: any) => any;
}

interface AggregatedData {
  sources: string[];
  recordCount: number;
  data: any;
  metadata: {
    timestamp: string;
    duration: number;
    sourcesSucceeded: number;
    sourcesFailed: number;
  };
}

/**
 * Transform data from source A to common format
 */
function transformSourceA(data: any[]): any[] {
  return data.map(item => ({
    id: item.user_id,
    name: item.full_name,
    email: item.email_address,
    joined: new Date(item.created_at),
    source: 'source-a',
    metadata: {
      originalId: item.user_id,
      lastSeen: item.last_login
    }
  }));
}

/**
 * Transform data from source B to common format
 */
function transformSourceB(data: any[]): any[] {
  return data.map(item => ({
    id: item.id.toString(),
    name: `${item.first_name} ${item.last_name}`,
    email: item.contact.email,
    joined: new Date(item.registration_date),
    source: 'source-b',
    metadata: {
      originalId: item.id,
      subscription: item.subscription_type
    }
  }));
}

/**
 * Transform data from source C to common format
 */
function transformSourceC(data: any[]): any[] {
  return data.map(item => ({
    id: item.uid,
    name: item.display_name,
    email: item.primary_email,
    joined: new Date(item.signup_timestamp * 1000),
    source: 'source-c',
    metadata: {
      originalId: item.uid,
      verified: item.is_verified
    }
  }));
}

/**
 * Fetch and transform data from multiple sources
 */
async function aggregateFromMultipleSources(): Promise<AggregatedData> {
  const startTime = Date.now();

  console.log('=== Data Aggregation from Multiple Sources ===\n');

  // Define data sources with their transformations
  const sources: DataSource[] = [
    {
      name: 'Database A',
      tool: 'mcp__database__query',
      params: {
        connection: 'postgres-prod',
        query: 'SELECT * FROM users WHERE active = true LIMIT 1000'
      },
      transform: transformSourceA
    },
    {
      name: 'API B',
      tool: 'mcp__api__fetch',
      params: {
        endpoint: '/api/v2/users',
        method: 'GET',
        params: { limit: 1000, active: true }
      },
      transform: transformSourceB
    },
    {
      name: 'Service C',
      tool: 'mcp__service__getUsers',
      params: {
        filter: 'active',
        maxResults: 1000
      },
      transform: transformSourceC
    }
  ];

  // Fetch from all sources in parallel
  console.log('Fetching from all sources in parallel...\n');

  const results = await Promise.allSettled(
    sources.map(async (source, index) => {
      const sourceStart = Date.now();
      console.log(`[${index + 1}/${sources.length}] Fetching from ${source.name}...`);

      try {
        const rawData = await callMCPTool(source.tool, source.params);
        const duration = Date.now() - sourceStart;

        console.log(`✓ [${index + 1}/${sources.length}] ${source.name}: ${rawData.length} records (${duration}ms)`);

        // Transform to common format
        const transformed = source.transform ? source.transform(rawData) : rawData;

        return {
          sourceName: source.name,
          success: true,
          data: transformed,
          recordCount: transformed.length,
          duration
        };
      } catch (error) {
        const duration = Date.now() - sourceStart;
        console.error(`✗ [${index + 1}/${sources.length}] ${source.name} failed: ${error.message} (${duration}ms)`);

        return {
          sourceName: source.name,
          success: false,
          error: error.message,
          duration
        };
      }
    })
  );

  // Process results
  const successful = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
    .map(r => r.value);

  const failed = results
    .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
    .map(r => {
      if (r.status === 'rejected') {
        return { error: r.reason.message };
      } else {
        return { error: r.value.error };
      }
    });

  console.log(`\n✓ Succeeded: ${successful.length}/${sources.length}`);
  console.log(`✗ Failed: ${failed.length}/${sources.length}`);

  // Combine all data
  const allData = successful.flatMap(s => s.data);

  console.log(`\nTotal records fetched: ${allData.length}`);

  // Deduplicate by email (example deduplication strategy)
  console.log('Deduplicating records...');
  const uniqueData = Array.from(
    new Map(allData.map(item => [item.email, item])).values()
  );

  console.log(`Unique records: ${uniqueData.length}`);

  // Calculate statistics
  const sourceDistribution = successful.reduce((acc, s) => {
    acc[s.sourceName] = s.recordCount;
    return acc;
  }, {} as Record<string, number>);

  const stats = {
    totalFetched: allData.length,
    uniqueRecords: uniqueData.length,
    duplicatesRemoved: allData.length - uniqueData.length,
    bySource: sourceDistribution,
    oldestRecord: uniqueData.reduce((oldest, item) =>
      item.joined < oldest.joined ? item : oldest
    , uniqueData[0]),
    newestRecord: uniqueData.reduce((newest, item) =>
      item.joined > newest.joined ? item : newest
    , uniqueData[0])
  };

  const duration = Date.now() - startTime;

  console.log('\n=== Aggregation Complete ===');
  console.log(`Duration: ${duration}ms`);
  console.log(`Records: ${uniqueData.length} unique from ${allData.length} total`);

  return {
    sources: successful.map(s => s.sourceName),
    recordCount: uniqueData.length,
    data: uniqueData,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      sourcesSucceeded: successful.length,
      sourcesFailed: failed.length
    }
  };
}

/**
 * Aggregate metrics from multiple analytics sources
 */
async function aggregateMetrics(): Promise<any> {
  console.log('\n\n=== Aggregating Metrics from Multiple Sources ===\n');

  const startTime = Date.now();

  // Fetch metrics from different sources in parallel
  const [webAnalytics, mobileAnalytics, serverMetrics] = await Promise.all([
    callMCPTool('mcp__analytics__getWebMetrics', {
      period: 'last_7_days',
      metrics: ['pageviews', 'sessions', 'bounceRate']
    }),
    callMCPTool('mcp__analytics__getMobileMetrics', {
      period: 'last_7_days',
      metrics: ['appOpens', 'activeUsers', 'crashRate']
    }),
    callMCPTool('mcp__monitoring__getServerMetrics', {
      period: 'last_7_days',
      metrics: ['cpu', 'memory', 'requests']
    })
  ]);

  console.log('✓ All metrics fetched');

  // Combine and calculate aggregate metrics
  const combined = {
    period: 'last_7_days',
    timestamp: new Date().toISOString(),
    web: {
      totalPageviews: webAnalytics.pageviews.reduce((a: number, b: number) => a + b, 0),
      avgSessions: webAnalytics.sessions.reduce((a: number, b: number) => a + b, 0) / 7,
      bounceRate: webAnalytics.bounceRate.reduce((a: number, b: number) => a + b, 0) / 7
    },
    mobile: {
      totalAppOpens: mobileAnalytics.appOpens.reduce((a: number, b: number) => a + b, 0),
      avgActiveUsers: mobileAnalytics.activeUsers.reduce((a: number, b: number) => a + b, 0) / 7,
      crashRate: mobileAnalytics.crashRate.reduce((a: number, b: number) => a + b, 0) / 7
    },
    server: {
      avgCpu: serverMetrics.cpu.reduce((a: number, b: number) => a + b, 0) / 7,
      avgMemory: serverMetrics.memory.reduce((a: number, b: number) => a + b, 0) / 7,
      totalRequests: serverMetrics.requests.reduce((a: number, b: number) => a + b, 0)
    },
    metadata: {
      duration: Date.now() - startTime,
      sources: ['web-analytics', 'mobile-analytics', 'server-monitoring']
    }
  };

  console.log('✓ Metrics aggregated and calculated');

  // Store aggregated metrics
  await callMCPTool('mcp__database__insert', {
    table: 'aggregated_metrics',
    record: combined
  });

  console.log('✓ Aggregated metrics stored');

  return combined;
}

/**
 * Join data from multiple sources based on common key
 */
async function joinDataSources(): Promise<any> {
  console.log('\n\n=== Joining Data from Multiple Sources ===\n');

  const startTime = Date.now();

  // Fetch related data in parallel
  const [users, orders, preferences] = await Promise.all([
    callMCPTool('mcp__database__query', {
      table: 'users',
      fields: ['id', 'name', 'email']
    }),
    callMCPTool('mcp__database__query', {
      table: 'orders',
      fields: ['id', 'user_id', 'total', 'created_at']
    }),
    callMCPTool('mcp__database__query', {
      table: 'user_preferences',
      fields: ['user_id', 'theme', 'notifications']
    })
  ]);

  console.log(`✓ Fetched: ${users.length} users, ${orders.length} orders, ${preferences.length} preferences`);

  // Create lookup maps for efficient joining
  const prefsMap = new Map(preferences.map((p: any) => [p.user_id, p]));
  const ordersMap = new Map<string, any[]>();

  // Group orders by user
  orders.forEach((order: any) => {
    if (!ordersMap.has(order.user_id)) {
      ordersMap.set(order.user_id, []);
    }
    ordersMap.get(order.user_id)!.push(order);
  });

  // Join data
  const enrichedUsers = users.map((user: any) => {
    const userOrders = ordersMap.get(user.id) || [];
    const userPrefs = prefsMap.get(user.id) || {};

    return {
      ...user,
      preferences: userPrefs,
      orders: {
        count: userOrders.length,
        total: userOrders.reduce((sum: number, o: any) => sum + o.total, 0),
        recent: userOrders.slice(0, 5)
      }
    };
  });

  console.log(`✓ Joined data for ${enrichedUsers.length} users`);
  console.log(`Duration: ${Date.now() - startTime}ms`);

  return enrichedUsers;
}

// Execute all aggregation examples
console.log('=== Running All Aggregation Examples ===\n');

// Example 1: Multi-source aggregation
const agg1 = await aggregateFromMultipleSources();
console.log(`\nExample 1 Complete: ${agg1.recordCount} records from ${agg1.sources.length} sources`);

// Example 2: Metrics aggregation
const agg2 = await aggregateMetrics();
console.log(`\nExample 2 Complete: Metrics from ${agg2.metadata.sources.length} sources`);

// Example 3: Data joining
const agg3 = await joinDataSources();
console.log(`\nExample 3 Complete: ${agg3.length} enriched records`);

console.log('\n=== All Aggregation Examples Complete ===');
