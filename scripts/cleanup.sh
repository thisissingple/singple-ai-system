#!/bin/bash

echo "🧹 Cleaning up existing Node.js processes..."

# Kill any existing tsx processes
pkill -f "tsx server/index.ts" 2>/dev/null || true

# Remove PID file if exists
rm -f /tmp/server.pid 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

echo "✅ Cleanup completed"

# Check if any processes are still running
REMAINING=$(ps aux | grep "tsx server/index.ts" | grep -v grep | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo "⚠️ Warning: $REMAINING processes still running"
    ps aux | grep "tsx server/index.ts" | grep -v grep
else
    echo "✅ No remaining processes found"
fi