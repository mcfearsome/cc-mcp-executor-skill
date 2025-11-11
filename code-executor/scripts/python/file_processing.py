"""
Script: File Processing
Purpose: Process multiple files with filtering, transformation, and aggregation
Use Case: Batch file operations, data extraction from files, file system workflows
MCP Tools Used: mcp__filesystem__* (list, read, write, stat)

How to Adapt:
1. Change directory path to your target directory
2. Modify file filtering logic (extensions, patterns, size)
3. Customize file processing function for your data format
4. Adjust aggregation logic for your metrics
5. Update output format and destination

Example Usage:
Process log files, analyze JSON data files, extract information from
multiple configuration files, generate reports from file contents
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from lib.mcp_client import (
    call_mcp_tool,
)

import asyncio
import json
from typing import List, Dict, Any
from datetime import datetime
import re


class FileInfo:
    """File metadata."""

    def __init__(self, path: str, name: str, size: int, extension: str):
        self.path = path
        self.name = name
        self.size = size
        self.extension = extension


def filter_files(
    files: List[FileInfo],
    extensions: List[str] = None,
    max_size: int = None,
    min_size: int = None,
    pattern: str = None,
) -> List[FileInfo]:
    """Filter files based on criteria."""
    filtered = files

    # Filter by extension
    if extensions:
        filtered = [f for f in filtered if f.extension in extensions]

    # Filter by size
    if max_size:
        filtered = [f for f in filtered if f.size <= max_size]
    if min_size:
        filtered = [f for f in filtered if f.size >= min_size]

    # Filter by name pattern
    if pattern:
        regex = re.compile(pattern)
        filtered = [f for f in filtered if regex.search(f.name)]

    return filtered


async def process_file(file: FileInfo) -> Dict[str, Any]:
    """Process a single file."""
    try:
        print(f"Processing: {file.name} ({file.size} bytes)")

        # Read file content
        content = await call_mcp_tool("mcp__filesystem__read_file", {"path": file.path})

        # Parse based on file type
        record_count = 0
        parsed = None

        if file.extension == ".json":
            parsed = json.loads(content)
            record_count = len(parsed) if isinstance(parsed, list) else 1
        elif file.extension == ".csv":
            # Simple CSV parsing (for demonstration)
            lines = [l.strip() for l in content.split("\n") if l.strip()]
            record_count = len(lines) - 1  # Subtract header
            parsed = {"line_count": len(lines)}
        elif file.extension in [".txt", ".log"]:
            lines = content.split("\n")
            record_count = len(lines)
            parsed = {
                "line_count": len(lines),
                "char_count": len(content),
                "word_count": len(content.split()),
            }
        else:
            # Unknown type, just count bytes
            parsed = {"size": len(content)}
            record_count = 1

        print(f"✓ {file.name}: {record_count} records")

        return {
            "file": file.name,
            "success": True,
            "record_count": record_count,
            "data": parsed,
        }

    except Exception as error:
        print(f"✗ {file.name}: {error}")

        return {"file": file.name, "success": False, "error": str(error)}


async def process_files(
    directory_path: str,
    extensions: List[str] = None,
    max_size: int = None,
    parallel: bool = True,
) -> Dict[str, Any]:
    """Main file processing workflow."""
    start_time = datetime.now()

    print("=== File Processing Workflow ===")
    print(f"Directory: {directory_path}")

    # Step 1: List all files in directory
    print("\n[Step 1] Listing files...")
    file_list = await call_mcp_tool(
        "mcp__filesystem__list_directory", {"path": directory_path, "recursive": False}
    )

    print(f"Found {len(file_list)} items")

    # Step 2: Get file metadata
    print("\n[Step 2] Getting file metadata...")

    async def get_file_info(item: Dict[str, Any]) -> FileInfo:
        stat = await call_mcp_tool("mcp__filesystem__stat", {"path": item["path"]})

        extension = "." + item["name"].split(".")[-1] if "." in item["name"] else ""

        return FileInfo(
            path=item["path"], name=item["name"], size=stat["size"], extension=extension
        )

    files_with_metadata = await asyncio.gather(
        *[get_file_info(item) for item in file_list if item.get("type") == "file"]
    )

    print(f"Found {len(files_with_metadata)} files")

    # Step 3: Filter files
    print("\n[Step 3] Filtering files...")
    filtered = filter_files(
        files_with_metadata,
        extensions=extensions or [".json", ".csv", ".txt", ".log"],
        max_size=max_size or 10 * 1024 * 1024,  # 10MB default
    )

    print(f"{len(filtered)} files match criteria")

    if not filtered:
        print("No files to process")
        return {
            "total_files": len(files_with_metadata),
            "processed": 0,
            "failed": 0,
            "total_records": 0,
            "results": [],
            "duration": (datetime.now() - start_time).total_seconds() * 1000,
        }

    # Step 4: Process files
    print("\n[Step 4] Processing files...")

    if parallel:
        # Process in parallel (default)
        print("Processing in parallel...")
        results = await asyncio.gather(*[process_file(file) for file in filtered])
    else:
        # Process sequentially
        print("Processing sequentially...")
        results = []
        for file in filtered:
            result = await process_file(file)
            results.append(result)

    # Step 5: Aggregate results
    print("\n[Step 5] Aggregating results...")
    processed = sum(1 for r in results if r["success"])
    failed = sum(1 for r in results if not r["success"])
    total_records = sum(r.get("record_count", 0) for r in results)

    # Step 6: Generate summary report
    print("\n[Step 6] Generating summary...")
    duration = (datetime.now() - start_time).total_seconds() * 1000

    summary = {
        "total_files": len(files_with_metadata),
        "processed": processed,
        "failed": failed,
        "total_records": total_records,
        "results": results,
        "duration": duration,
    }

    report = {
        "timestamp": datetime.now().isoformat(),
        "directory": directory_path,
        "summary": {
            "total_files_in_directory": summary["total_files"],
            "files_matched": len(filtered),
            "files_processed": summary["processed"],
            "files_failed": summary["failed"],
            "total_records_processed": summary["total_records"],
            "processing_time": f"{summary['duration']:.0f}ms",
        },
        "file_details": [
            {
                "file": r["file"],
                "status": "success" if r["success"] else "failed",
                "records": r.get("record_count", 0),
                "error": r.get("error"),
            }
            for r in summary["results"]
        ],
        "filters": {
            "extensions": extensions or [".json", ".csv", ".txt", ".log"],
            "max_size": max_size or 10 * 1024 * 1024,
        },
    }

    # Save report
    await call_mcp_tool(
        "mcp__filesystem__write_file",
        {
            "path": "/tmp/file-processing-report.json",
            "content": json.dumps(report, indent=2),
        },
    )

    print("\n=== Processing Complete ===")
    print(f"Processed: {processed}/{len(filtered)} files")
    print(f"Total records: {total_records}")
    print(f"Duration: {duration:.0f}ms")
    print("Report saved to: /tmp/file-processing-report.json")

    return summary


# Execute with example configuration
result = await process_files(
    "/tmp/data",
    extensions=[".json", ".csv", ".txt"],
    max_size=5 * 1024 * 1024,  # 5MB max
    parallel=True,
)

summary = {
    "processed": result["processed"],
    "failed": result["failed"],
    "total_records": result["total_records"],
    "duration": f'{result["duration"]:.0f}ms',
}
print(f"\nFinal Summary: {json.dumps(summary, indent=2)}")
