require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn, execSync } = require("child_process");

const app = express();

// Guard PORT against collision with GrapeRoot MCP on 8080
let rawPort = parseInt(process.env.CHAT_PORT || process.env.PORT || "3000", 10);
if (isNaN(rawPort) || rawPort === 8080) {
  console.warn("[GrapeRoot] Port 8080 is reserved for GrapeRoot MCP. Using 3000.");
  rawPort = 3000;
}
const PORT = rawPort;
const HOST = process.env.HOST || "0.0.0.0";
const SESSIONS_FILE = path.join(__dirname, "sessions.json");

// Cross-platform helper to resolve .dual-graph directory
function getDualGraphDir() {
  const localDir = path.join(process.cwd(), ".dual-graph");
  if (fs.existsSync(localDir)) return localDir;
  const userDir = path.join(os.homedir(), ".dual-graph");
  if (fs.existsSync(userDir)) return userDir;
  return localDir;
}

// Read dynamic MCP port
function getMcpPort() {
  const dgDir = getDualGraphDir();
  const portFile = path.join(dgDir, "mcp_port");
  if (fs.existsSync(portFile)) {
    try {
      const p = parseInt(fs.readFileSync(portFile, "utf8").trim(), 10);
      if (p && !isNaN(p)) return p;
    } catch (e) {}
  }
  return 8080;
}

// Cross-platform detection of installed AI CLI tools
function detectInstalledTools() {
  const candidateTools = ["claude", "agy", "gemini", "codex", "opencode", "cursor"];
  const detected = [];

  for (const t of candidateTools) {
    try {
      const checkCmd = process.platform === "win32" ? `where ${t}` : `which ${t}`;
      execSync(checkCmd, { stdio: "ignore" });
      detected.push(t);
      continue;
    } catch (e) {}

    // Fallback checks for common non-PATH locations
    if (process.platform === "win32") {
      const winPaths = [
        path.join(process.env.USERPROFILE || os.homedir(), "AppData", "Local", t, "bin", `${t}.exe`),
        path.join(process.env.LOCALAPPDATA || "", t, "bin", `${t}.exe`),
        path.join(process.env.APPDATA || "", "npm", `${t}.cmd`)
      ];
      if (winPaths.some(p => fs.existsSync(p))) {
        detected.push(t);
        continue;
      }
    } else {
      const unixPaths = [
        path.join(os.homedir(), ".local", "bin", t),
        `/usr/local/bin/${t}`,
        `/usr/bin/${t}`,
        `/opt/homebrew/bin/${t}`
      ];
      if (unixPaths.some(p => fs.existsSync(p))) {
        detected.push(t);
        continue;
      }
    }
  }

  return detected.length > 0 ? detected : ["claude", "agy"];
}

// Resolve binary path for a tool
function resolveToolBinary(toolName) {
  const isWin = process.platform === "win32";
  if (isWin) {
    const specificPaths = [
      path.join(process.env.USERPROFILE || os.homedir(), "AppData", "Local", toolName, "bin", `${toolName}.exe`),
      path.join(process.env.LOCALAPPDATA || "", toolName, "bin", `${toolName}.exe`),
      path.join(process.env.APPDATA || "", "npm", `${toolName}.cmd`)
    ];
    for (const p of specificPaths) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    const unixPaths = [
      path.join(os.homedir(), ".local", "bin", toolName),
      `/usr/local/bin/${toolName}`,
      `/usr/bin/${toolName}`,
      `/opt/homebrew/bin/${toolName}`
    ];
    for (const p of unixPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return toolName;
}

// Find Local Network IP (LAN)
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}
const LAN_IP = getLanIp();

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(__dirname));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/**
 * Universal MCP helper using axios
 */
async function callMCP(tool, args = {}, timeoutMs = 8000) {
  const mcpPort = getMcpPort();
  const url = `http://127.0.0.1:${mcpPort}/mcp`;

  try {
    const res = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: tool, arguments: args },
        id: Date.now()
      },
      {
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream"
        }
      }
    );

    const data = res.data;
    if (data && data.result) {
      if (data.result.structuredContent) return data.result.structuredContent;
      if (data.result.content && Array.isArray(data.result.content) && data.result.content[0]?.text) {
        try {
          return JSON.parse(data.result.content[0].text);
        } catch (e) {
          return data.result.content[0].text;
        }
      }
      return data.result;
    }
  } catch (e) {
    console.debug(`[MCP Error: ${tool}]`, e.message);
  }
  return null;
}

/**
 * Log tool calls to mcp_tool_calls.jsonl
 */
function logToolCall(toolName, payload) {
  try {
    const dgDir = getDualGraphDir();
    const logFile = path.join(dgDir, "mcp_tool_calls.jsonl");
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      tool: toolName,
      payload: payload
    }) + "\n";
    fs.appendFileSync(logFile, entry, "utf8");
  } catch (e) {}
}

/**
 * Safe sessions.json reader with auto-repair
 */
function readSessionsSafe() {
  if (!fs.existsSync(SESSIONS_FILE)) {
    try { fs.writeFileSync(SESSIONS_FILE, "[]", "utf8"); } catch (e) {}
    return [];
  }
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[Sessions] Corrupted sessions.json detected. Backing up and resetting.", err.message);
    try {
      fs.copyFileSync(SESSIONS_FILE, SESSIONS_FILE + ".bak");
      fs.writeFileSync(SESSIONS_FILE, "[]", "utf8");
    } catch (e) {}
    return [];
  }
}

/**
 * GET /api/status
 */
app.get("/api/status", async (req, res) => {
  const mcpPort = getMcpPort();
  const dgDir = getDualGraphDir();
  let mcpConnected = false;

  try {
    const r = await axios.post(
      `http://127.0.0.1:${mcpPort}/mcp`,
      {
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1
      },
      {
        timeout: 1500,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream"
        }
      }
    );
    mcpConnected = (r.status >= 200 && r.status < 300);
  } catch (e) {
    mcpConnected = false;
  }

  let graph = {
    nodes: 0,
    edges: 0,
    files: 0,
    symbols: 0,
    root: process.cwd()
  };

  const graphJsonFile = path.join(dgDir, "info_graph.json");
  if (fs.existsSync(graphJsonFile)) {
    try {
      const g = JSON.parse(fs.readFileSync(graphJsonFile, "utf8"));
      graph.nodes = g.node_count || (g.nodes ? g.nodes.length : 0);
      graph.edges = g.edge_count || (g.edges ? g.edges.length : 0);
      graph.files = g.file_count || 0;
      graph.symbols = g.symbol_count || 0;
      graph.root = g.root || process.cwd();
    } catch (e) {}
  }

  const detectedTools = detectInstalledTools();

  res.json({
    mcp: mcpConnected,
    graph: graph,
    mcpPort: mcpPort,
    lanIp: LAN_IP,
    port: PORT,
    detectedTools: detectedTools,
    activeRoot: process.cwd()
  });
});

/**
 * POST /api/graph/search
 */
app.post("/api/graph/search", async (req, res) => {
  const { query, top_files = 10, top_edges = 20 } = req.body;
  if (!query) return res.status(400).json({ error: "Query required" });

  const result = await callMCP("graph_retrieve", { query, top_files, top_edges });
  logToolCall("graph_retrieve", { query, result });
  res.json({ ok: true, query, result });
});

/**
 * POST /api/graph/read
 */
app.post("/api/graph/read", async (req, res) => {
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: "File required" });

  const result = await callMCP("graph_read", { file });
  logToolCall("graph_read", { file, result: typeof result === "string" ? result.slice(0, 200) : result });
  res.json({ ok: true, file, result });
});

/**
 * GET /api/memory
 */
app.get("/api/memory", (req, res) => {
  const dgDir = getDualGraphDir();
  const memFile = path.join(dgDir, "context-store.json");
  if (fs.existsSync(memFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(memFile, "utf8"));
      return res.json(Array.isArray(data) ? data : []);
    } catch (e) {}
  }
  res.json([]);
});

/**
 * POST /api/memory
 */
app.post("/api/memory", async (req, res) => {
  const { type = "fact", content, tags = [], files = [] } = req.body;
  if (!content) return res.status(400).json({ error: "Content required" });

  const result = await callMCP("graph_add_memory", { type, content, tags, files });
  logToolCall("graph_add_memory", { type, content, tags, files, result });

  const dgDir = getDualGraphDir();
  const memFile = path.join(dgDir, "context-store.json");
  let list = [];
  if (fs.existsSync(memFile)) {
    try { list = JSON.parse(fs.readFileSync(memFile, "utf8")); } catch (e) {}
  }
  res.json({ ok: true, result, memory: list });
});

/**
 * GET /api/tool-calls
 */
app.get("/api/tool-calls", (req, res) => {
  const dgDir = getDualGraphDir();
  const logFile = path.join(dgDir, "mcp_tool_calls.jsonl");
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, "utf8");
      const lines = content.split("\n").filter(l => l.trim());
      const calls = lines.slice(-50).map(l => {
        try { return JSON.parse(l); } catch (e) { return null; }
      }).filter(Boolean).reverse();
      return res.json(calls);
    } catch (e) {}
  }
  res.json([]);
});

/**
 * POST /mcp-tool
 */
app.post("/mcp-tool", async (req, res) => {
  const { tool, args = {} } = req.body;
  if (!tool) return res.status(400).json({ error: "Tool name required" });

  const result = await callMCP(tool, args);
  logToolCall(tool, { args, result });
  res.json({ ok: true, tool, result });
});

/**
 * POST /bash
 * Cross-platform SSE streaming shell execution
 */
app.post("/bash", (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== "string") {
    return res.status(400).json({ error: "Command required" });
  }
  if (command.length > 2000) {
    return res.status(400).json({ error: "Command exceeds max length of 2000 characters" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const isWin = process.platform === "win32";
  const shell = isWin ? "powershell.exe" : "/bin/bash";
  const shellArgs = isWin ? ["-NoProfile", "-Command", command] : ["-c", command];

  const child = spawn(shell, shellArgs, { cwd: process.cwd() });
  logToolCall("bash_exec", { command });

  child.stdout.on("data", (data) => {
    res.write(`data: ${JSON.stringify({ type: "stdout", text: data.toString("utf8") })}\n\n`);
  });

  child.stderr.on("data", (data) => {
    res.write(`data: ${JSON.stringify({ type: "stderr", text: data.toString("utf8") })}\n\n`);
  });

  child.on("close", (code) => {
    res.write(`data: ${JSON.stringify({ type: "done", exitCode: code })}\n\n`);
    res.end();
  });

  child.on("error", (err) => {
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
  });
});

/**
 * GET /api/sessions
 */
app.get("/api/sessions", (req, res) => {
  const sessions = readSessionsSafe();
  res.json(sessions);
});

/**
 * POST /api/sessions
 */
app.post("/api/sessions", (req, res) => {
  const session = req.body;
  if (!session || !session.id) return res.status(400).json({ error: "Invalid session object" });

  try {
    let sessions = readSessionsSafe();
    const truncatedTitle = String(session.title || "Session").slice(0, 60);

    const idx = sessions.findIndex(s => s.id === session.id);
    const sessionObj = {
      ...session,
      title: truncatedTitle,
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      sessions[idx] = { ...sessions[idx], ...sessionObj };
    } else {
      sessions.unshift({ ...sessionObj, createdAt: new Date().toISOString() });
    }

    if (sessions.length > 50) sessions = sessions.slice(0, 50);

    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
    res.json({ ok: true, sessions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /chat
 * Universal SSE streaming endpoint supporting Claude, Antigravity, Gemini, Codex, OpenCode
 */
app.post("/chat", async (req, res) => {
  const { message, tool = "claude", history = [], sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (sessionId && (typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId))) {
    return res.status(400).json({ error: "Invalid sessionId" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const startTime = Date.now();

  try {
    // 1. Mandatory GrapeRoot Protocol: Query graph_continue first
    res.write(`data: ${JSON.stringify({
      type: "tool_start",
      data: { name: "graph_continue", args: { query: message }, timestamp: new Date().toISOString() }
    })}\n\n`);

    let cont = await callMCP("graph_continue", { query: message });
    logToolCall("graph_continue", { query: message, result: cont });

    if (cont && cont.needs_project) {
      res.write(`data: ${JSON.stringify({
        type: "tool_start",
        data: { name: "graph_scan", args: { project_root: process.cwd() }, timestamp: new Date().toISOString() }
      })}\n\n`);
      await callMCP("graph_scan", { project_root: process.cwd() });
      cont = await callMCP("graph_continue", { query: message });
    }

    const confidence = cont?.confidence || "high";
    const mode = cont?.mode || "retrieve_then_read";
    const recFiles = Array.isArray(cont?.recommended_files) ? cont.recommended_files : [];

    res.write(`data: ${JSON.stringify({
      type: "tool_end",
      data: { name: "graph_continue", result: { confidence, mode, recommended_files: recFiles } }
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: "graph_context",
      data: { files: recFiles, confidence, mode }
    })}\n\n`);

    // 2. Read recommended files/symbols via graph_read
    let codeSnippets = [];
    if (!cont?.skip && recFiles.length > 0) {
      for (const item of recFiles.slice(0, 3)) {
        const filePath = typeof item === "string" ? item : (item.file || "");
        if (filePath) {
          res.write(`data: ${JSON.stringify({
            type: "tool_start",
            data: { name: "graph_read", args: { file: filePath }, timestamp: new Date().toISOString() }
          })}\n\n`);

          const readData = await callMCP("graph_read", { file: filePath });
          logToolCall("graph_read", { file: filePath, result: readData });

          const content = typeof readData === "string" ? readData : (readData?.content || "");
          if (content) {
            codeSnippets.push(`--- File: ${filePath} ---\n${content.slice(0, 3500)}`);
          }

          res.write(`data: ${JSON.stringify({
            type: "tool_end",
            data: { name: "graph_read", result: { file: filePath, length: content.length } }
          })}\n\n`);
        }
      }
    }

    // 3. Build Prompt with GrapeRoot Context prepended
    let contextHeader = `[GrapeRoot Dual-Graph Context | Confidence: ${confidence}]\n`;
    if (codeSnippets.length > 0) {
      contextHeader += codeSnippets.join("\n\n") + "\n\n";
    }
    const fullPrompt = `${contextHeader}\n\nUser: ${message}`;

    // 4. Determine AI CLI arguments according to tool selected
    const binPath = resolveToolBinary(tool);
    let cliArgs = [];

    switch (tool.toLowerCase()) {
      case "claude":
        cliArgs = ["-p", fullPrompt, "--output-format", "stream-json", "--dangerously-skip-permissions"];
        break;
      case "agy":
      case "antigravity":
        cliArgs = ["-p", fullPrompt, "--output-format", "stream-json", "--dangerously-skip-permissions"];
        break;
      case "gemini":
        cliArgs = ["-p", fullPrompt, "--output-format", "stream-json"];
        break;
      case "codex":
        cliArgs = ["chat", fullPrompt];
        break;
      case "opencode":
        cliArgs = ["run", fullPrompt];
        break;
      default:
        cliArgs = ["-p", fullPrompt, "--output-format", "stream-json", "--dangerously-skip-permissions"];
        break;
    }

    const child = spawn(binPath, cliArgs, {
      cwd: process.cwd(),
      shell: false,
      env: process.env
    });

    let buffer = "";

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Attempt stream-json event parsing
        try {
          const data = JSON.parse(trimmed);

          if (data.event === "step_update" && data.step_update) {
            const su = data.step_update;

            if (su.step_type === "tool_call") {
              res.write(`data: ${JSON.stringify({
                type: "tool_start",
                data: {
                  name: su.tool_name || "Tool",
                  args: su.tool_args || {},
                  timestamp: new Date().toISOString()
                }
              })}\n\n`);
            } else if (su.step_type === "agent_response" && su.text_delta) {
              res.write(`data: ${JSON.stringify({
                type: "token",
                data: { text: su.text_delta }
              })}\n\n`);
            }

            if (su.duration_seconds || su.usage) {
              const seconds = Math.round(su.duration_seconds || ((Date.now() - startTime) / 1000));
              const tokens = su.usage?.total_tokens ? `${(su.usage.total_tokens / 1000).toFixed(1)}k tokens` : "";
              res.write(`data: ${JSON.stringify({
                type: "thought",
                data: {
                  text: `Thought for ${seconds}s${tokens ? ` · ${tokens}` : ""}`,
                  seconds: seconds,
                  tokens: su.usage?.total_tokens || 0
                }
              })}\n\n`);
            }
          } else if (data.event === "result" && data.result) {
            const r = data.result;
            const seconds = Math.round(r.duration_seconds || ((Date.now() - startTime) / 1000));
            const tokens = r.usage?.total_tokens ? `${(r.usage.total_tokens / 1000).toFixed(1)}k tokens` : "";
            res.write(`data: ${JSON.stringify({
              type: "thought",
              data: {
                text: `Thought for ${seconds}s${tokens ? ` · ${tokens}` : ""}`,
                seconds: seconds,
                tokens: r.usage?.total_tokens || 0
              }
            })}\n\n`);
          } else if (data.text || data.content) {
            res.write(`data: ${JSON.stringify({
              type: "token",
              data: { text: data.text || data.content }
            })}\n\n`);
          }
        } catch (e) {
          // If output is raw text stream rather than JSON
          res.write(`data: ${JSON.stringify({
            type: "token",
            data: { text: trimmed + "\n" }
          })}\n\n`);
        }
      }
    });

    child.stderr.on("data", (errData) => {
      console.error(`[${tool} stderr]:`, errData.toString("utf8"));
    });

    child.on("close", (code) => {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    });

    child.on("error", (err) => {
      res.write(`data: ${JSON.stringify({ type: "error", data: { message: `${tool} error: ${err.message}` } })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    });

  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: "error", data: { message: `Server error: ${error.message}` } })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Graceful Process Termination Handlers
process.on("SIGINT", () => {
  console.log("\n[GrapeRoot] Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[GrapeRoot] Terminating server...");
  process.exit(0);
});

// Start Express Server
app.listen(PORT, HOST, () => {
  const mcpPort = getMcpPort();
  const tools = detectInstalledTools();
  console.log(`=======================================================`);
  console.log(` 🍇 GrapeRoot Universal AI UI Server Ready`);
  console.log(` 💻 Local:   http://localhost:${PORT}`);
  console.log(` 📱 Mobile:  http://${LAN_IP}:${PORT}`);
  console.log(` 🔌 GrapeRoot MCP Target: http://127.0.0.1:${mcpPort}/mcp`);
  console.log(` ⚡ Detected AI Tools: [ ${tools.join(", ")} ]`);
  console.log(`=======================================================`);
});
