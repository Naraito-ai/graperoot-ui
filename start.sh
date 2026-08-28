#!/usr/bin/env bash
# GrapeRoot UI Launcher for macOS / Linux

if ! command -v graperoot &> /dev/null; then
  echo "[GrapeRoot UI] WARNING: 'graperoot' not found in PATH. MCP features will be disabled."
fi

if ! command -v node &> /dev/null; then
  echo "[GrapeRoot UI] ERROR: Node.js is not installed." && exit 1
fi

echo "[GrapeRoot UI] Starting MCP server..."
if command -v graperoot &> /dev/null; then
  graperoot . --antigravity --dangerously-skip-permissions > /dev/null 2>&1 &
  sleep 4
fi

echo "[GrapeRoot UI] Starting web UI..."
node server.js &
sleep 2

if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" &
elif command -v open &> /dev/null; then
    open "http://localhost:3000" &
fi
