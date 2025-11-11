// @ts-nocheck - Demo script with intentionally relaxed type checking
/**
 * Script: Conditional Logic
 * Purpose: Demonstrate dynamic tool selection based on conditions and data
 * Use Case: Routing to different services, handling multiple scenarios, adaptive workflows
 * MCP Tools Used: Various tools selected conditionally based on runtime data
 *
 * How to Adapt:
 * 1. Define your decision criteria and conditions
 * 2. Map conditions to appropriate tool calls
 * 3. Add your specific business logic
 * 4. Customize error handling for each path
 * 5. Update result formatting based on different outcomes
 *
 * Example Usage:
 * Route requests to different APIs based on data type, select processing
 * method based on file size, choose storage backend based on content
 *
 * Execution:
 * deno run --allow-read --allow-run --allow-env conditional-logic.ts
 */

import { callMCPTool } from "../../lib/mcp-client.ts";

interface ProcessingOptions {
  dataType: "json" | "xml" | "csv" | "binary";
  priority: "high" | "medium" | "low";
  size: number;
  requiresValidation: boolean;
}

interface ConditionalResult {
  success: boolean;
  path: string;
  tool: string;
  reason: string;
  data?: unknown;
  duration: number;
}

/**
 * Example 1: Route based on data type
 */
async function routeByDataType(
  data: string,
  type: string,
): Promise<ConditionalResult> {
  const startTime = Date.now();
  let tool: string;
  let params: Record<string, unknown>;
  let reason: string;

  console.log(`\n=== Routing by Data Type: ${type} ===`);

  // Decision logic based on data type
  if (type === "json") {
    tool = "mcp__json__parse";
    params = { content: data, validate: true };
    reason = "JSON data detected, using JSON parser with validation";
  } else if (type === "xml") {
    tool = "mcp__xml__parse";
    params = { content: data, schema: "auto" };
    reason = "XML data detected, using XML parser with schema detection";
  } else if (type === "csv") {
    tool = "mcp__csv__parse";
    params = { content: data, hasHeaders: true };
    reason = "CSV data detected, using CSV parser assuming headers";
  } else if (type === "binary") {
    tool = "mcp__binary__decode";
    params = { content: data, encoding: "base64" };
    reason = "Binary data detected, using binary decoder";
  } else {
    tool = "mcp__text__process";
    params = { content: data };
    reason = "Unknown type, defaulting to text processor";
  }

  console.log(`Decision: ${reason}`);
  console.log(`Tool: ${tool}`);

  try {
    const result = await callMCPTool(tool, params);

    return {
      success: true,
      path: "type-based-routing",
      tool,
      reason,
      data: result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);

    return {
      success: false,
      path: "type-based-routing",
      tool,
      reason: `Failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Example 2: Select processing strategy based on size and priority
 */
async function selectProcessingStrategy(
  options: ProcessingOptions,
): Promise<ConditionalResult> {
  const startTime = Date.now();

  console.log(`\n=== Selecting Processing Strategy ===`);
  console.log(`Size: ${options.size} bytes, Priority: ${options.priority}`);

  let tool: string;
  let params: Record<string, unknown>;
  let reason: string;

  // Complex decision tree
  if (options.size > 10 * 1024 * 1024) {
    // Large files (>10MB)
    if (options.priority === "high") {
      tool = "mcp__processor__parallelBatch";
      params = { chunkSize: 1024 * 1024, workers: 4 };
      reason = "Large file + high priority = parallel batch processing";
    } else {
      tool = "mcp__processor__backgroundQueue";
      params = { queueName: "large-files" };
      reason = "Large file + normal priority = background queue";
    }
  } else if (options.size > 1024 * 1024) {
    // Medium files (1-10MB)
    tool = "mcp__processor__standard";
    params = { optimize: true };
    reason = "Medium file = standard optimized processing";
  } else {
    // Small files (<1MB)
    if (options.requiresValidation) {
      tool = "mcp__processor__validateAndProcess";
      params = { strictMode: true };
      reason = "Small file + validation required = validate and process";
    } else {
      tool = "mcp__processor__fast";
      params = { skipValidation: true };
      reason = "Small file + no validation = fast processing";
    }
  }

  console.log(`Decision: ${reason}`);
  console.log(`Tool: ${tool}`);

  try {
    const result = await callMCPTool(tool, params);

    return {
      success: true,
      path: "strategy-selection",
      tool,
      reason,
      data: result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);

    return {
      success: false,
      path: "strategy-selection",
      tool,
      reason: `Failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Example 3: Cascading fallback with multiple conditions
 */
async function cascadingFallback(itemId: string): Promise<ConditionalResult> {
  const startTime = Date.now();

  console.log(`\n=== Cascading Fallback for: ${itemId} ===`);

  // Try to get item metadata to determine best source
  let metadata;
  try {
    metadata = await callMCPTool("mcp__metadata__get", {
      id: itemId,
    });
    console.log("✓ Metadata retrieved");
  } catch (_error) {
    console.warn("⚠ Could not retrieve metadata, using defaults");
    metadata = { source: "unknown", cached: false };
  }

  // Decision based on metadata
  const sources = [];

  if (metadata.cached) {
    sources.push({
      name: "cache",
      tool: "mcp__cache__get",
      params: { key: itemId },
      reason: "Item is marked as cached",
    });
  }

  if (metadata.source === "database") {
    sources.push({
      name: "database",
      tool: "mcp__database__get",
      params: { table: "items", id: itemId },
      reason: "Item source is database",
    });
  }

  if (metadata.source === "api" || metadata.source === "unknown") {
    sources.push({
      name: "api",
      tool: "mcp__api__fetch",
      params: { endpoint: `/items/${itemId}` },
      reason: "Item source is API or unknown",
    });
  }

  // Always add storage as final fallback
  sources.push({
    name: "storage",
    tool: "mcp__storage__retrieve",
    params: { key: itemId },
    reason: "Fallback to cold storage",
  });

  console.log(`Attempting ${sources.length} sources in order...`);

  // Try each source in order
  for (const source of sources) {
    console.log(`\nTrying ${source.name}: ${source.reason}`);

    try {
      const result = await callMCPTool(source.tool, source.params);

      if (result && result.data) {
        console.log(`✓ Success from ${source.name}`);

        return {
          success: true,
          path: "cascading-fallback",
          tool: source.tool,
          reason: `Retrieved from ${source.name}: ${source.reason}`,
          data: result.data,
          duration: Date.now() - startTime,
        };
      } else {
        console.log(`✗ ${source.name} returned empty result`);
      }
    } catch (error) {
      console.log(`✗ ${source.name} failed: ${(error as Error).message}`);
    }
  }

  // All sources failed
  return {
    success: false,
    path: "cascading-fallback",
    tool: "none",
    reason: "All sources exhausted",
    duration: Date.now() - startTime,
  };
}

/**
 * Example 4: Switch based on user role/permissions
 */
async function handleByPermissions(
  userId: string,
  action: string,
): Promise<ConditionalResult> {
  const startTime = Date.now();

  console.log(`\n=== Permission-Based Handling ===`);
  console.log(`User: ${userId}, Action: ${action}`);

  // Get user permissions
  const permissions = await callMCPTool("mcp__auth__getPermissions", {
    userId,
  });

  console.log(`Permissions: ${permissions.role} (${permissions.level})`);

  let tool: string;
  let params: Record<string, unknown>;
  let reason: string;

  // Route based on permissions
  if (permissions.role === "admin") {
    tool = "mcp__admin__executeAction";
    params = { action, userId, skipApproval: true };
    reason = "Admin user - direct execution without approval";
  } else if (permissions.role === "power-user" && permissions.level >= 5) {
    tool = "mcp__poweruser__executeAction";
    params = { action, userId, withAudit: true };
    reason = "Power user with sufficient level - execute with audit";
  } else if (permissions.role === "user") {
    if (action === "read" || action === "list") {
      tool = "mcp__user__readAction";
      params = { action, userId };
      reason = "Regular user - read-only action allowed";
    } else {
      tool = "mcp__workflow__createApprovalRequest";
      params = { action, userId, requiresApproval: true };
      reason = "Regular user - write action requires approval";
    }
  } else {
    tool = "mcp__auth__deny";
    params = { userId, action, reason: "Insufficient permissions" };
    reason = "Insufficient permissions - action denied";
  }

  console.log(`Decision: ${reason}`);
  console.log(`Tool: ${tool}`);

  try {
    const result = await callMCPTool(tool, params);

    return {
      success: true,
      path: "permission-based",
      tool,
      reason,
      data: result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      path: "permission-based",
      tool,
      reason: `Failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

// Execute examples
console.log("=== Conditional Logic Examples ===\n");

// Example 1: Data type routing
const ex1 = await routeByDataType('{"key": "value"}', "json");
console.log(`\nResult 1: ${ex1.success ? "✓" : "✗"} - ${ex1.reason}`);

// Example 2: Processing strategy
const ex2 = await selectProcessingStrategy({
  dataType: "json",
  priority: "high",
  size: 15 * 1024 * 1024,
  requiresValidation: true,
});
console.log(`\nResult 2: ${ex2.success ? "✓" : "✗"} - ${ex2.reason}`);

// Example 3: Cascading fallback
const ex3 = await cascadingFallback("item-12345");
console.log(`\nResult 3: ${ex3.success ? "✓" : "✗"} - ${ex3.reason}`);

// Example 4: Permission-based routing
const ex4 = await handleByPermissions("user-789", "delete");
console.log(`\nResult 4: ${ex4.success ? "✓" : "✗"} - ${ex4.reason}`);

console.log("\n=== All Examples Complete ===");
