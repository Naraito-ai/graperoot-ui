@echo off
echo [GrapeRoot UI] Starting MCP server...
start "GrapeRoot MCP" cmd /c "graperoot . --antigravity --dangerously-skip-permissions"
ping 127.0.0.1 -n 5 >nul
echo [GrapeRoot UI] Starting web UI...
start "GrapeRoot UI" cmd /c "node server.js"
ping 127.0.0.1 -n 3 >nul
start http://localhost:3000
