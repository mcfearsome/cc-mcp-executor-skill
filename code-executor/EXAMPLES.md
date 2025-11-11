# Real-World Examples

This document provides complete, copy-paste examples for common use cases. Each example demonstrates a practical scenario you might encounter when working with MCP tools.

## Table of Contents

1. [File Processing Workflow](#1-file-processing-workflow)
2. [Multi-API Composition](#2-multi-api-composition)
3. [Data Analysis Pipeline](#3-data-analysis-pipeline)
4. [Conditional Tool Selection](#4-conditional-tool-selection)
5. [Error Recovery Pattern](#5-error-recovery-pattern)
6. [Parallel Execution](#6-parallel-execution)

---

## 1. File Processing Workflow

**Scenario**: Process multiple JSON files in a directory, transform their data, and generate a summary report.

### TypeScript Version

```typescript
/**
 * Process all JSON files in a directory and generate summary
 */

interface FileData {
  filename: string;
  records: number;
  avgValue: number;
}

async function processJsonFiles(): Promise<{
  filesProcessed: number;
  totalRecords: number;
  summary: FileData[];
}> {
  console.log('Starting file processing...');

  // Step 1: List all files in directory
  const files = await callMCPTool('mcp__filesystem__listDirectory', {
    path: '/tmp/data'
  });

  console.log(`Found ${files.length} files`);

  // Step 2: Filter for JSON files only
  const jsonFiles = files.filter((f: any) => f.name.endsWith('.json'));
  console.log(`${jsonFiles.length} JSON files to process`);

  // Step 3: Read and process each file in parallel
  const processedData: FileData[] = await Promise.all(
    jsonFiles.map(async (file: any) => {
      try {
        // Read file
        const content = await callMCPTool('mcp__filesystem__readFile', {
          path: file.path
        });

        // Parse and analyze
        const data = JSON.parse(content);
        const records = Array.isArray(data) ? data : [data];

        // Calculate metrics
        const values = records.map((r: any) => r.value || 0);
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

        console.log(`✓ Processed ${file.name}: ${records.length} records`);

        return {
          filename: file.name,
          records: records.length,
          avgValue: Math.round(avgValue * 100) / 100
        };
      } catch (error) {
        console.error(`✗ Failed to process ${file.name}:`, error.message);
        return {
          filename: file.name,
          records: 0,
          avgValue: 0
        };
      }
    })
  );

  // Step 4: Generate summary
  const totalRecords = processedData.reduce((sum, d) => sum + d.records, 0);

  // Step 5: Write summary report
  const report = {
    timestamp: new Date().toISOString(),
    filesProcessed: jsonFiles.length,
    totalRecords,
    files: processedData
  };

  await callMCPTool('mcp__filesystem__writeFile', {
    path: '/tmp/summary-report.json',
    content: JSON.stringify(report, null, 2)
  });

  console.log('Summary report written to /tmp/summary-report.json');

  return {
    filesProcessed: jsonFiles.length,
    totalRecords,
    summary: processedData
  };
}

// Execute
const result = await processJsonFiles();
console.log('Processing complete:', JSON.stringify(result, null, 2));
```

### Python Version

```python
"""
Process all JSON files in a directory and generate summary
"""
import asyncio
import json
from typing import List, Dict, Any

async def process_json_files() -> Dict[str, Any]:
    """Process all JSON files and generate summary."""
    print('Starting file processing...')

    # Step 1: List all files in directory
    files = await call_mcp_tool('mcp__filesystem__list_directory', {
        'path': '/tmp/data'
    })

    print(f'Found {len(files)} files')

    # Step 2: Filter for JSON files only
    json_files = [f for f in files if f['name'].endswith('.json')]
    print(f'{len(json_files)} JSON files to process')

    # Step 3: Read and process each file in parallel
    async def process_file(file: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Read file
            content = await call_mcp_tool('mcp__filesystem__read_file', {
                'path': file['path']
            })

            # Parse and analyze
            data = json.loads(content)
            records = data if isinstance(data, list) else [data]

            # Calculate metrics
            values = [r.get('value', 0) for r in records]
            avg_value = sum(values) / len(values) if values else 0

            print(f"✓ Processed {file['name']}: {len(records)} records")

            return {
                'filename': file['name'],
                'records': len(records),
                'avg_value': round(avg_value, 2)
            }
        except Exception as error:
            print(f"✗ Failed to process {file['name']}: {error}")
            return {
                'filename': file['name'],
                'records': 0,
                'avg_value': 0
            }

    processed_data = await asyncio.gather(*[
        process_file(file) for file in json_files
    ])

    # Step 4: Generate summary
    total_records = sum(d['records'] for d in processed_data)

    # Step 5: Write summary report
    from datetime import datetime
    report = {
        'timestamp': datetime.now().isoformat(),
        'files_processed': len(json_files),
        'total_records': total_records,
        'files': processed_data
    }

    await call_mcp_tool('mcp__filesystem__write_file', {
        'path': '/tmp/summary-report.json',
        'content': json.dumps(report, indent=2)
    })

    print('Summary report written to /tmp/summary-report.json')

    return {
        'files_processed': len(json_files),
        'total_records': total_records,
        'summary': processed_data
    }

# Execute
result = await process_json_files()
print(f'Processing complete: {json.dumps(result, indent=2)}')
```

---

## 2. Multi-API Composition

**Scenario**: Fetch user data from one API, enrich it with data from another API, and store results in a database.

### TypeScript Version

```typescript
/**
 * Fetch, enrich, and store user data from multiple APIs
 */

interface User {
  id: string;
  username: string;
  email: string;
}

interface UserProfile {
  userId: string;
  bio: string;
  avatar: string;
  joinDate: string;
}

interface EnrichedUser extends User {
  profile: UserProfile;
  enriched: boolean;
}

async function enrichAndStoreUsers(): Promise<{
  usersProcessed: number;
  enriched: number;
  stored: number;
}> {
  console.log('=== Starting user enrichment ===');

  // Step 1: Fetch basic user data
  console.log('Fetching users from API...');
  const users: User[] = await callMCPTool('mcp__api__getUsers', {
    endpoint: '/api/v1/users',
    limit: 100
  });

  console.log(`Fetched ${users.length} users`);

  // Step 2: Enrich with profile data (parallel)
  console.log('Enriching user profiles...');
  const enriched: EnrichedUser[] = await Promise.all(
    users.map(async (user) => {
      try {
        const profile: UserProfile = await callMCPTool(
          'mcp__api__getUserProfile',
          {
            endpoint: `/api/v1/profiles/${user.id}`
          }
        );

        return {
          ...user,
          profile,
          enriched: true
        };
      } catch (error) {
        console.warn(`Could not enrich user ${user.id}:`, error.message);
        return {
          ...user,
          profile: null,
          enriched: false
        };
      }
    })
  );

  const enrichedCount = enriched.filter(u => u.enriched).length;
  console.log(`Enriched ${enrichedCount}/${users.length} users`);

  // Step 3: Store in database
  console.log('Storing enriched data...');
  const storeResult = await callMCPTool('mcp__database__bulkInsert', {
    table: 'enriched_users',
    records: enriched.map(u => ({
      user_id: u.id,
      username: u.username,
      email: u.email,
      bio: u.profile?.bio || null,
      avatar: u.profile?.avatar || null,
      join_date: u.profile?.joinDate || null,
      enriched_at: new Date().toISOString()
    }))
  });

  console.log(`Stored ${storeResult.inserted} records`);

  // Step 4: Log metrics
  await callMCPTool('mcp__metrics__send', {
    metric: 'user_enrichment',
    value: enrichedCount,
    tags: {
      success_rate: (enrichedCount / users.length) * 100
    }
  });

  console.log('=== Enrichment complete ===');

  return {
    usersProcessed: users.length,
    enriched: enrichedCount,
    stored: storeResult.inserted
  };
}

// Execute
const result = await enrichAndStoreUsers();
```

### Python Version

```python
"""
Fetch, enrich, and store user data from multiple APIs
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

async def enrich_and_store_users() -> Dict[str, int]:
    """Fetch users, enrich with profiles, and store in database."""
    print('=== Starting user enrichment ===')

    # Step 1: Fetch basic user data
    print('Fetching users from API...')
    users: List[Dict[str, Any]] = await call_mcp_tool('mcp__api__get_users', {
        'endpoint': '/api/v1/users',
        'limit': 100
    })

    print(f'Fetched {len(users)} users')

    # Step 2: Enrich with profile data (parallel)
    print('Enriching user profiles...')

    async def enrich_user(user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            profile = await call_mcp_tool('mcp__api__get_user_profile', {
                'endpoint': f"/api/v1/profiles/{user['id']}"
            })

            return {
                **user,
                'profile': profile,
                'enriched': True
            }
        except Exception as error:
            print(f"Could not enrich user {user['id']}: {error}")
            return {
                **user,
                'profile': None,
                'enriched': False
            }

    enriched = await asyncio.gather(*[enrich_user(u) for u in users])

    enriched_count = sum(1 for u in enriched if u['enriched'])
    print(f'Enriched {enriched_count}/{len(users)} users')

    # Step 3: Store in database
    print('Storing enriched data...')
    records = [{
        'user_id': u['id'],
        'username': u['username'],
        'email': u['email'],
        'bio': u['profile']['bio'] if u['profile'] else None,
        'avatar': u['profile']['avatar'] if u['profile'] else None,
        'join_date': u['profile']['joinDate'] if u['profile'] else None,
        'enriched_at': datetime.now().isoformat()
    } for u in enriched]

    store_result = await call_mcp_tool('mcp__database__bulk_insert', {
        'table': 'enriched_users',
        'records': records
    })

    print(f"Stored {store_result['inserted']} records")

    # Step 4: Log metrics
    await call_mcp_tool('mcp__metrics__send', {
        'metric': 'user_enrichment',
        'value': enriched_count,
        'tags': {
            'success_rate': (enriched_count / len(users)) * 100
        }
    })

    print('=== Enrichment complete ===')

    return {
        'users_processed': len(users),
        'enriched': enriched_count,
        'stored': store_result['inserted']
    }

# Execute
result = await enrich_and_store_users()
print(f'Result: {json.dumps(result, indent=2)}')
```

---

## 3. Data Analysis Pipeline

**Scenario**: Load data from database, perform analysis, generate visualizations, and create a report.

### TypeScript Version

```typescript
/**
 * Analyze sales data and generate report with visualizations
 */

interface SalesRecord {
  date: string;
  product: string;
  amount: number;
  region: string;
}

interface AnalysisResult {
  totalSales: number;
  avgSaleValue: number;
  topProducts: Array<{ product: string; sales: number }>;
  salesByRegion: Record<string, number>;
  trend: string;
}

async function analyzeSalesData(): Promise<AnalysisResult> {
  console.log('=== Sales Analysis Pipeline ===');

  // Step 1: Load data from database
  console.log('Loading sales data...');
  const sales: SalesRecord[] = await callMCPTool('mcp__database__query', {
    query: `
      SELECT date, product, amount, region
      FROM sales
      WHERE date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `
  });

  console.log(`Loaded ${sales.length} sales records`);

  // Step 2: Perform analysis
  console.log('Analyzing data...');

  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
  const avgSaleValue = totalSales / sales.length;

  // Top products
  const productSales = sales.reduce((acc, s) => {
    acc[s.product] = (acc[s.product] || 0) + s.amount;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([product, sales]) => ({ product, sales }));

  // Sales by region
  const salesByRegion = sales.reduce((acc, s) => {
    acc[s.region] = (acc[s.region] || 0) + s.amount;
    return acc;
  }, {} as Record<string, number>);

  // Trend analysis (simple moving average)
  const recentSales = sales.slice(-7).reduce((sum, s) => sum + s.amount, 0) / 7;
  const olderSales = sales.slice(-14, -7).reduce((sum, s) => sum + s.amount, 0) / 7;
  const trend = recentSales > olderSales ? 'increasing' : 'decreasing';

  console.log(`Total sales: $${totalSales}, Trend: ${trend}`);

  // Step 3: Generate visualizations
  console.log('Generating charts...');

  const [chartUrl1, chartUrl2] = await Promise.all([
    callMCPTool('mcp__charts__generate', {
      type: 'bar',
      data: topProducts,
      title: 'Top 5 Products by Sales',
      xAxis: 'product',
      yAxis: 'sales'
    }),
    callMCPTool('mcp__charts__generate', {
      type: 'pie',
      data: Object.entries(salesByRegion).map(([region, sales]) => ({
        label: region,
        value: sales
      })),
      title: 'Sales by Region'
    })
  ]);

  console.log('Charts generated');

  // Step 4: Create report document
  console.log('Creating report...');

  const report = {
    title: 'Sales Analysis Report',
    period: 'Last 30 Days',
    generatedAt: new Date().toISOString(),
    summary: {
      totalSales: `$${totalSales.toFixed(2)}`,
      avgSaleValue: `$${avgSaleValue.toFixed(2)}`,
      totalOrders: sales.length,
      trend
    },
    topProducts,
    salesByRegion,
    charts: [chartUrl1.url, chartUrl2.url]
  };

  await callMCPTool('mcp__reports__create', {
    template: 'sales-analysis',
    data: report,
    outputPath: '/tmp/sales-report.pdf'
  });

  console.log('Report saved to /tmp/sales-report.pdf');
  console.log('=== Analysis Complete ===');

  return {
    totalSales,
    avgSaleValue,
    topProducts,
    salesByRegion,
    trend
  };
}

// Execute
const analysis = await analyzeSalesData();
```

---

## 4. Conditional Tool Selection

**Scenario**: Process different file types using appropriate tools based on file metadata.

### TypeScript Version

```typescript
/**
 * Process files using appropriate tools based on file type
 */

async function processFileByType(filePath: string): Promise<any> {
  console.log(`Processing file: ${filePath}`);

  // Step 1: Get file metadata
  const metadata = await callMCPTool('mcp__filesystem__stat', {
    path: filePath
  });

  console.log(`File type: ${metadata.mimeType}, Size: ${metadata.size} bytes`);

  // Step 2: Select appropriate processing tool based on file type
  let result;

  if (metadata.mimeType === 'application/json') {
    console.log('Processing as JSON...');
    const content = await callMCPTool('mcp__filesystem__readFile', {
      path: filePath
    });
    result = {
      type: 'json',
      data: JSON.parse(content),
      recordCount: JSON.parse(content).length || 1
    };
  } else if (metadata.mimeType === 'text/csv') {
    console.log('Processing as CSV...');
    result = await callMCPTool('mcp__csv__parse', {
      path: filePath,
      hasHeaders: true
    });
    result.type = 'csv';
  } else if (metadata.mimeType === 'application/xml') {
    console.log('Processing as XML...');
    result = await callMCPTool('mcp__xml__parse', {
      path: filePath
    });
    result.type = 'xml';
  } else if (metadata.mimeType.startsWith('image/')) {
    console.log('Processing as image...');
    result = await callMCPTool('mcp__image__analyze', {
      path: filePath,
      operations: ['resize', 'compress']
    });
    result.type = 'image';
  } else {
    console.log('Unknown type, treating as plain text');
    result = {
      type: 'text',
      content: await callMCPTool('mcp__filesystem__readFile', {
        path: filePath
      })
    };
  }

  // Step 3: Store processing result
  await callMCPTool('mcp__database__insert', {
    table: 'processed_files',
    record: {
      path: filePath,
      type: result.type,
      processedAt: new Date().toISOString(),
      size: metadata.size
    }
  });

  console.log(`✓ Processed ${filePath} as ${result.type}`);

  return result;
}

// Execute with multiple files
const files = [
  '/tmp/data.json',
  '/tmp/report.csv',
  '/tmp/config.xml',
  '/tmp/photo.jpg'
];

const results = await Promise.all(
  files.map(f => processFileByType(f).catch(err => ({
    error: err.message,
    file: f
  })))
);

console.log('Processing complete:', results.length, 'files');
```

---

## 5. Error Recovery Pattern

**Scenario**: Try primary service, fall back to secondary service if it fails, with retry logic.

### TypeScript Version

```typescript
/**
 * Fetch data with fallback and retry logic
 */

async function fetchDataWithFallback(
  dataId: string
): Promise<{ data: any; source: string; attempts: number }> {
  let attempts = 0;
  const maxRetries = 3;

  // Try primary service with retries
  console.log('Attempting primary service...');
  for (let i = 0; i < maxRetries; i++) {
    attempts++;
    try {
      const data = await callMCPTool('mcp__primary__getData', {
        id: dataId,
        timeout: 5000
      });

      console.log(`✓ Primary service succeeded on attempt ${attempts}`);
      return { data, source: 'primary', attempts };
    } catch (error) {
      console.log(`✗ Primary service attempt ${attempts} failed: ${error.message}`);

      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Try secondary service
  console.log('Primary service exhausted, trying secondary...');
  try {
    attempts++;
    const data = await callMCPTool('mcp__secondary__getData', {
      id: dataId
    });

    console.log('✓ Secondary service succeeded');
    return { data, source: 'secondary', attempts };
  } catch (error) {
    console.log(`✗ Secondary service failed: ${error.message}`);
  }

  // Try cache as last resort
  console.log('Trying cached data...');
  try {
    attempts++;
    const data = await callMCPTool('mcp__cache__get', {
      key: `data:${dataId}`
    });

    if (data) {
      console.log('✓ Found cached data');
      return { data, source: 'cache', attempts };
    }
  } catch (error) {
    console.log(`✗ Cache lookup failed: ${error.message}`);
  }

  // All options exhausted
  throw new Error(
    `Failed to fetch data ${dataId} after ${attempts} attempts across all services`
  );
}

// Execute
try {
  const result = await fetchDataWithFallback('user-123');
  console.log(`Data retrieved from ${result.source} after ${result.attempts} attempts`);
} catch (error) {
  console.error('Complete failure:', error.message);
}
```

---

## 6. Parallel Execution

**Scenario**: Perform multiple independent operations simultaneously to save time.

### TypeScript Version

```typescript
/**
 * Execute multiple independent operations in parallel
 */

async function performParallelOperations(): Promise<{
  duration: number;
  results: Record<string, any>;
}> {
  const startTime = Date.now();

  console.log('Starting parallel operations...');

  // Execute all operations simultaneously
  const [
    userData,
    analyticsData,
    configData,
    cacheWarm,
    logEntry
  ] = await Promise.all([
    // Fetch user data
    callMCPTool('mcp__database__query', {
      table: 'users',
      limit: 1000
    }).then(data => {
      console.log('✓ User data loaded');
      return data;
    }),

    // Fetch analytics
    callMCPTool('mcp__analytics__getMetrics', {
      period: 'last_7_days'
    }).then(data => {
      console.log('✓ Analytics loaded');
      return data;
    }),

    // Load config
    callMCPTool('mcp__config__get', {
      key: 'app_settings'
    }).then(data => {
      console.log('✓ Config loaded');
      return data;
    }),

    // Warm cache (fire and forget style)
    callMCPTool('mcp__cache__warm', {
      keys: ['popular_items', 'trending']
    }).then(() => {
      console.log('✓ Cache warmed');
      return true;
    }).catch(err => {
      console.warn('Cache warm failed:', err.message);
      return false;
    }),

    // Log operation start
    callMCPTool('mcp__logging__write', {
      level: 'info',
      message: 'Parallel operations started',
      context: { timestamp: new Date().toISOString() }
    }).then(() => {
      console.log('✓ Log entry written');
      return true;
    }).catch(err => {
      console.warn('Logging failed:', err.message);
      return false;
    })
  ]);

  const duration = Date.now() - startTime;

  console.log(`All operations complete in ${duration}ms`);

  return {
    duration,
    results: {
      users: userData.length,
      analytics: analyticsData,
      config: configData,
      cacheWarmed: cacheWarm,
      logged: logEntry
    }
  };
}

// Execute
const result = await performParallelOperations();
console.log(JSON.stringify(result, null, 2));
```

---

## Tips for Adapting Examples

1. **Replace Tool Names**: Update `mcp__server__tool` with your actual MCP server and tool names
2. **Adjust Parameters**: Modify parameters to match your tool schemas
3. **Add Error Handling**: Enhance error handling for your specific needs
4. **Customize Logic**: Adapt the business logic to your use case
5. **Add Logging**: Include appropriate logging for debugging
6. **Test Incrementally**: Test each step before combining into complete workflow

## See Also

- `TYPESCRIPT_GUIDE.md` - Deep dive on TypeScript patterns
- `PYTHON_GUIDE.md` - Deep dive on Python patterns
- `REFERENCE.md` - Complete API reference
- `scripts/` - Cached script files you can copy and adapt
