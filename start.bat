@echo off
setlocal enabledelayedexpansion

title GrapeRoot UI

echo ========================================================
echo   GrapeRoot UI - Dual-Graph AI Interface
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

where graperoot >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [GrapeRoot] Starting MCP server...
    start /min "GrapeRoot MCP" cmd /c "graperoot . --antigravity --dangerously-skip-permissions"
    ping 127.0.0.1 -n 4 >nul
) else (
    echo [GrapeRoot] Notice: 'graperoot' CLI not found on PATH. Run 'pip install graperoot' to enable MCP context.
)

echo [GrapeRoot] Starting web UI...
start /min "GrapeRoot UI Server" cmd /c "node server.js"
ping 127.0.0.1 -n 3 >nul

echo [GrapeRoot] Opening browser at http://localhost:3000 ...
start http://localhost:3000
