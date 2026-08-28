# 🍇 GrapeRoot UI — Antigravity CLI Browser Interface

> A full-featured browser-based Terminal + Chat interface that replicates the **GrapeRoot Dual-Graph + Google Antigravity CLI** experience locally on your desktop and across your local network (mobile/tablet).

[![GrapeRoot](https://img.shields.io/badge/GrapeRoot-Dual--Graph-10b981?style=for-the-badge)](https://github.com/kunal12203/GrapeRoot)
[![Antigravity](https://img.shields.io/badge/Google-Antigravity-8b5cf6?style=for-the-badge)](https://antigravity.google)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🚀 Key Features

- **💻 Two-Panel Experience (Desktop)**:
  - **Panel 1 (Left — Terminal Emulator)**: Exact GrapeRoot terminal with ASCII art logo, ANSI color rendering, live token & thought timers, collapsible tool call blocks (`(ctrl+o to expand)`), and full command history.
  - **Panel 2 (Right — Chat Transcript)**: Clean conversational thread view with syntax-highlighted code blocks, copy buttons, and inline Dual-Graph retrieval badges.
- **📱 Responsive Mobile Experience**:
  - Touch-friendly layout with bottom tab switcher (`[ 💻 Terminal ]` and `[ 💬 Chat ]`).
  - Seamless keyboard inset handling (`visualViewport`).
- **🌐 Local Area Network (LAN) Access**:
  - Express server binds to `0.0.0.0:3000` so any phone, tablet, or laptop on your Wi-Fi can connect directly via `http://<LAN-IP>:3000`.
- **⚡ Zero API Keys Required**:
  - Routes prompts directly through your active **Google Antigravity session (`agy`)** and Google activation token.
- **🍇 GrapeRoot MCP FastMCP Integration**:
  - Connected locally to `http://127.0.0.1:8080/mcp` for real-time `graph_continue`, `graph_read`, and `graph_scan` context retrieval across **48,000+ graph nodes**.
- **💾 Session Persistence**:
  - Automatic session history stored in `sessions.json` and `localStorage` with export capabilities.

---

## 🛠️ Supported Slash Commands

| Command | Action |
|---|---|
| `/help` | Show reference guide of all available commands |
| `/scan` or `graph_scan` | Run GrapeRoot `graph_scan` to re-index the project |
| `/read <filepath>` | Read code symbol or file via GrapeRoot MCP |
| `/bash <command>` | Execute local shell commands with live streaming output |
| `/compact` | Compact conversation context and record working state |
| `/status` | View Dual-Graph connection, graph metrics, and network IPs |
| `/model <name>` | Switch active model (`flash`, `pro`, `claude`, `codex`) |
| `/history` | Show session command history |
| `/export` | Export current session to JSON or plain text |
| `/clear` | Clear terminal output |
| `/new` | Start a fresh session |

---

## 📦 Prerequisites

1. **Node.js** (v18 or higher)
2. **GrapeRoot MCP Server** (running on port `8080`)
3. **Google Antigravity CLI (`agy`)** (signed in)

---

## 🚀 How to Run

### Windows (One-Click)
Double-click **`start.bat`** or run:
```bat
start.bat
```

### macOS / Linux
Run:
```bash
chmod +x start.sh
./start.sh
```

### Manual
```bash
npm install
node server.js
```

---

## 📱 Mobile Network Access

1. Ensure your phone/tablet is connected to the same Wi-Fi network.
2. Find your machine's LAN IP (displayed in the app header and startup terminal).
3. Open your mobile browser and navigate to:
   ```
   http://<YOUR-LAN-IP>:3000
   ```
   *(e.g., `http://10.114.175.98:3000`)*

---

## 🎨 Design Tokens

- **Background**: `#0d1117`
- **Surface**: `#161b22`
- **Border**: `#30363d`
- **GrapeRoot Emerald**: `#10b981`
- **Dual-Graph Violet**: `#8b5cf6`
- **Terminal Green**: `#39d353`
- **Terminal Yellow**: `#e3b341`
- **Terminal Cyan**: `#58a6ff`
- **Terminal Font**: `'Cascadia Code', 'Fira Code', monospace`

---

## 📄 License
MIT License. Built for the GrapeRoot & Antigravity community.
