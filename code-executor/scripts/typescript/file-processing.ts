/**
 * Script: File Processing
 * Purpose: Process multiple files with filtering, transformation, and aggregation
 * Use Case: Batch file operations, data extraction from files, file system workflows
 * MCP Tools Used: mcp__filesystem__* (list, read, write, stat)
 *
 * How to Adapt:
 * 1. Change directory path to your target directory
 * 2. Modify file filtering logic (extensions, patterns, size)
 * 3. Customize file processing function for your data format
 * 4. Adjust aggregation logic for your metrics
 * 5. Update output format and destination
 *
 * Example Usage:
 * Process log files, analyze JSON data files, extract information from
 * multiple configuration files, generate reports from file contents
 *
 * Execution:
 * deno run --allow-read --allow-run --allow-env file-processing.ts
 */

import { callMCPTool, callMCPToolsParallel, callMCPToolsParallelSettled } from '../../lib/mcp-client.ts';

interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
}

interface ProcessingResult {
  file: string;
  success: boolean;
  recordCount?: number;
  data?: any;
  error?: string;
}

interface ProcessingSummary {
  totalFiles: number;
  processed: number;
  failed: number;
  totalRecords: number;
  results: ProcessingResult[];
  duration: number;
}

/**
 * Filter files based on criteria
 */
function filterFiles(files: FileInfo[], options: {
  extensions?: string[];
  maxSize?: number;
  minSize?: number;
  pattern?: RegExp;
}): FileInfo[] {
  return files.filter(file => {
    // Filter by extension
    if (options.extensions && options.extensions.length > 0) {
      if (!options.extensions.includes(file.extension)) {
        return false;
      }
    }

    // Filter by size
    if (options.maxSize && file.size > options.maxSize) {
      return false;
    }
    if (options.minSize && file.size < options.minSize) {
      return false;
    }

    // Filter by name pattern
    if (options.pattern && !options.pattern.test(file.name)) {
      return false;
    }

    return true;
  });
}

/**
 * Process a single file
 */
async function processFile(file: FileInfo): Promise<ProcessingResult> {
  try {
    console.log(`Processing: ${file.name} (${file.size} bytes)`);

    // Read file content
    const content = await callMCPTool('mcp__filesystem__readFile', {
      path: file.path
    });

    // Parse based on file type
    let parsed;
    let recordCount = 0;

    if (file.extension === '.json') {
      parsed = JSON.parse(content);
      recordCount = Array.isArray(parsed) ? parsed.length : 1;
    } else if (file.extension === '.csv') {
      // Simple CSV parsing (for demonstration)
      const lines = content.split('\n').filter((l: string) => l.trim());
      recordCount = lines.length - 1; // Subtract header
      parsed = { lineCount: lines.length };
    } else if (file.extension === '.txt' || file.extension === '.log') {
      const lines = content.split('\n');
      recordCount = lines.length;
      parsed = {
        lineCount: lines.length,
        charCount: content.length,
        wordCount: content.split(/\s+/).length
      };
    } else {
      // Unknown type, just count bytes
      parsed = { size: content.length };
      recordCount = 1;
    }

    console.log(`✓ ${file.name}: ${recordCount} records`);

    return {
      file: file.name,
      success: true,
      recordCount,
      data: parsed
    };

  } catch (error) {
    console.error(`✗ ${file.name}: ${error.message}`);

    return {
      file: file.name,
      success: false,
      error: error.message
    };
  }
}

/**
 * Main file processing workflow
 */
async function processFiles(
  directoryPath: string,
  options: {
    extensions?: string[];
    maxSize?: number;
    parallel?: boolean;
  } = {}
): Promise<ProcessingSummary> {
  const startTime = Date.now();

  console.log('=== File Processing Workflow ===');
  console.log(`Directory: ${directoryPath}`);

  // Step 1: List all files in directory
  console.log('\n[Step 1] Listing files...');
  const fileList = await callMCPTool('mcp__filesystem__listDirectory', {
    path: directoryPath,
    recursive: false
  });

  console.log(`Found ${fileList.length} items`);

  // Step 2: Get file metadata
  console.log('\n[Step 2] Getting file metadata...');
  const filesWithMetadata: FileInfo[] = await Promise.all(
    fileList
      .filter((item: any) => item.type === 'file')
      .map(async (item: any) => {
        const stat = await callMCPTool('mcp__filesystem__stat', {
          path: item.path
        });

        const extension = item.name.includes('.')
          ? '.' + item.name.split('.').pop()
          : '';

        return {
          path: item.path,
          name: item.name,
          size: stat.size,
          extension
        };
      })
  );

  console.log(`Found ${filesWithMetadata.length} files`);

  // Step 3: Filter files
  console.log('\n[Step 3] Filtering files...');
  const filtered = filterFiles(filesWithMetadata, {
    extensions: options.extensions || ['.json', '.csv', '.txt', '.log'],
    maxSize: options.maxSize || 10 * 1024 * 1024 // 10MB default
  });

  console.log(`${filtered.length} files match criteria`);

  if (filtered.length === 0) {
    console.log('No files to process');
    return {
      totalFiles: filesWithMetadata.length,
      processed: 0,
      failed: 0,
      totalRecords: 0,
      results: [],
      duration: Date.now() - startTime
    };
  }

  // Step 4: Process files
  console.log('\n[Step 4] Processing files...');

  let results: ProcessingResult[];

  if (options.parallel !== false) {
    // Process in parallel (default)
    console.log('Processing in parallel...');
    results = await Promise.all(
      filtered.map(file => processFile(file))
    );
  } else {
    // Process sequentially
    console.log('Processing sequentially...');
    results = [];
    for (const file of filtered) {
      const result = await processFile(file);
      results.push(result);
    }
  }

  // Step 5: Aggregate results
  console.log('\n[Step 5] Aggregating results...');
  const processed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalRecords = results.reduce((sum, r) => sum + (r.recordCount || 0), 0);

  // Step 6: Generate summary report
  console.log('\n[Step 6] Generating summary...');
  const summary: ProcessingSummary = {
    totalFiles: filesWithMetadata.length,
    processed,
    failed,
    totalRecords,
    results,
    duration: Date.now() - startTime
  };

  const report = {
    timestamp: new Date().toISOString(),
    directory: directoryPath,
    summary: {
      totalFilesInDirectory: summary.totalFiles,
      filesMatched: filtered.length,
      filesProcessed: summary.processed,
      filesFailed: summary.failed,
      totalRecordsProcessed: summary.totalRecords,
      processingTime: `${summary.duration}ms`
    },
    fileDetails: summary.results.map(r => ({
      file: r.file,
      status: r.success ? 'success' : 'failed',
      records: r.recordCount || 0,
      error: r.error
    })),
    filters: {
      extensions: options.extensions || ['.json', '.csv', '.txt', '.log'],
      maxSize: options.maxSize || 10 * 1024 * 1024
    }
  };

  // Save report
  await callMCPTool('mcp__filesystem__writeFile', {
    path: '/tmp/file-processing-report.json',
    content: JSON.stringify(report, null, 2)
  });

  console.log('\n=== Processing Complete ===');
  console.log(`Processed: ${processed}/${filtered.length} files`);
  console.log(`Total records: ${totalRecords}`);
  console.log(`Duration: ${summary.duration}ms`);
  console.log('Report saved to: /tmp/file-processing-report.json');

  return summary;
}

// Execute with example configuration
const result = await processFiles('/tmp/data', {
  extensions: ['.json', '.csv', '.txt'],
  maxSize: 5 * 1024 * 1024, // 5MB max
  parallel: true
});

console.log('\nFinal Summary:', {
  processed: result.processed,
  failed: result.failed,
  totalRecords: result.totalRecords,
  duration: `${result.duration}ms`
});
