#!/usr/bin/env bash
echo "[GrapeRoot UI] Starting MCP server..."
graperoot . --antigravity --dangerously-skip-permissions > /dev/null 2>&1 &
sleep 4
echo "[GrapeRoot UI] Starting web UI..."
node server.js &
sleep 2

if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" &
elif command -v open &> /dev/null; then
    open "http://localhost:3000" &
fi
