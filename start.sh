#!/usr/bin/env bash
# GrapeRoot UI Launcher for macOS / Linux

echo "========================================================"
echo "  GrapeRoot UI - Dual-Graph AI Interface"
echo "========================================================"
echo ""

if ! command -v node &> /dev/null; then
  echo "[GrapeRoot UI] ERROR: Node.js is not installed. Please install from https://nodejs.org/"
  exit 1
fi

if ! command -v graperoot &> /dev/null; then
  echo "[GrapeRoot UI] WARNING: 'graperoot' not found in PATH. Run 'pip install graperoot' to enable full MCP context."
else
  echo "[GrapeRoot UI] Starting MCP server..."
  graperoot . --antigravity --dangerously-skip-permissions > /dev/null 2>&1 &
  sleep 3
fi

echo "[GrapeRoot UI] Starting web UI..."
node server.js &
sleep 2

if command -v xdg-open &> /dev/null; then
  xdg-open "http://localhost:3000" &
elif command -v open &> /dev/null; then
  open "http://localhost:3000" &
fi
