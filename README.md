# 🍇 GrapeRoot UI — Claude.ai-Quality Dual-Graph Interface

> A local, browser-based AI workspace that combines **Claude.ai's clean, minimalist UI** with **GrapeRoot Dual-Graph Context Injection**, compatible with **Claude Code**, **Google Antigravity**, **Gemini CLI**, **OpenAI Codex**, and **OpenCode**.

[![GrapeRoot](https://img.shields.io/badge/GrapeRoot-Dual--Graph-10b981?style=for-the-badge)](https://github.com/kunal12203/GrapeRoot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## ⚡ What is GrapeRoot?

GrapeRoot is a local context engine that indexes your codebase into a semantic graph (files + symbols + edges) and exposes it via FastMCP. Every time you send a message, GrapeRoot automatically pre-loads the exact relevant files and symbol definitions into your prompt **before** the AI answers, saving 43%–81% tokens and eliminating blind exploration turns.

---

## 🚀 Key Capabilities

- **✨ Claude.ai-Inspired Design**: Clean 3-column layout (Sidebar, Center Chat, Collapsible Explorer) in dark theme.
- **🔌 Universal AI Tool Compatibility**:
  - Automatically detects which AI CLIs are installed on your system:
    - `claude` (Claude Code)
    - `agy` (Google Antigravity)
    - `gemini` (Gemini CLI)
    - `codex` (OpenAI Codex)
    - `opencode` (OpenCode)
    - `cursor` (Cursor CLI)
  - Select your active AI tool from a dynamic dropdown directly inside the chat bar.
- **🍇 GrapeRoot MCP Integration**:
  - Automatically connects to `.dual-graph/mcp_port` (or port 8080).
  - Pre-loads context via `graph_continue` and `graph_read`.
  - Displays interactive confidence badges (`HIGH`, `MEDIUM`, `LOW`) on every response.
- **🔍 Graph Explorer Panel**:
  - Search codebase symbols, functions, and files (`graph_retrieve`).
  - View full code snippets with syntax highlighting and line numbers (`graph_read`).
- **🧠 Persistent Working Memory**:
  - View and record architectural decisions, tasks, blockers, and facts in `context-store.json`.
- **💻 Integrated Terminal & Shell Execution**:
  - Built-in terminal emulator with full ANSI support, tool call collapsible cards, and slash commands (`/help`, `/scan`, `/read`, `/search`, `/bash`, `/memory`, `/remember`, `/model`, `/history`, `/export`, `/new`, `/compact`, `/status`, `/clear`).
- **📱 Responsive & LAN Mobile Access**:
  - Accessible on any mobile phone, tablet, or secondary laptop on your local Wi-Fi at `http://<LAN-IP>:3000`.

---

## 📦 Prerequisites

1. **Node.js** (v18 or higher) — [https://nodejs.org/](https://nodejs.org/)
2. **GrapeRoot Context Engine** (optional, recommended):
   ```bash
   pip install graperoot
   ```
3. Any supported AI CLI installed and authenticated (e.g. `claude`, `agy`, `gemini`, `codex`).

---

## 🏁 Quick Start

### Windows
Double-click `start.bat` or run:
```bat
start.bat
```

### macOS / Linux
Run:
```bash
chmod +x start.sh
./start.sh
```

### Manual Start
```bash
npm install
node server.js
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Slash Commands (Terminal Tab)

| Command | Action |
|---|---|
| `/help` | Show reference guide of all available commands |
| `/scan` | Index workspace into Dual-Graph (`graph_scan`) |
| `/read <file>` | Read file or symbol (`graph_read`) |
| `/search <query>` | Semantic search across codebase (`graph_retrieve`) |
| `/memory` | List context store memories |
| `/remember <text>` | Save a fact or note to memory (`graph_add_memory`) |
| `/bash <cmd>` | Execute shell command with live streaming output |
| `/model <name>` | Switch active model |
| `/compact` | Compact conversation context |
| `/export` | Export session to JSON |
| `/status` | View Dual-Graph connection, graph metrics, and network IPs |
| `/clear` | Clear terminal logs |
| `/new` | Start a fresh session |

---

## 📄 License
MIT License. Built for the GrapeRoot & developer community.
