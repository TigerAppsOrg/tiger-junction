#!/bin/bash
# test_api/run_tests.sh
# Script to start server and run API tests

echo "Starting API server..."
bun ./src/main.ts &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "Error: Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "Server started successfully (PID: $SERVER_PID)"
echo "Running tests..."

# Run tests
bun test test_api/

# Capture test exit code
TEST_EXIT_CODE=$?

# Cleanup: Stop the server
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "Tests completed with exit code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE
