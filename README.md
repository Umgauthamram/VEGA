# Laude - Local-first AI Desktop Assistant

Laude is a privacy-first, fully offline, feature-rich AI Desktop Assistant built using Next.js, Tauri (v2), and SQLite. It interfaces directly with local models via Ollama or any OpenAI-compatible API (LM Studio, llama.cpp, vLLM).

---

## Features

- **Multi-provider Client:** Seamless switching between default local Ollama instances and external OpenAI-compatible endpoints.
- **Agent Mode:** Full ReAct loops running local tools (`read_file`, `write_file`, `list_dir`, `run_shell`) with explicit safety approval flows.
- **Model Context Protocol (MCP):** Connect external stdio servers dynamically.
- **RAG & Projects:** Chunk and query files locally using vector embeddings.
- **Automated Scheduler:** Run periodic background tasks with native desktop completion alerts.
- **Quick Spotlight Launcher:** Global system-wide shortcut helper.
- **Stats Dashboard & Context Token Meter:** Measure speed (tok/sec) and prompt constraints.
- **Backup & Restore:** Import and export settings, chats, memory, and database configurations.

---

## Setup & Prerequisites

### 1. Install Ollama
Ensure you have [Ollama](https://ollama.com) installed and running locally:
```bash
ollama serve
```

### 2. Download Recommended Local Models
- **General Tool-calling (Agent Mode):** `ollama pull qwen2.5:14b` or `ollama pull llama3.1`
- **Vision Attachments:** `ollama pull llama3.2-vision`
- **Local Embeddings (RAG/Projects):** `ollama pull nomic-embed-text`

---

## Development

Install frontend dependencies:
```bash
cd laude
npm install
```

Run the development server:
```bash
# Run Next.js app local server
npm run dev

# Run Tauri desktop shell window
npx tauri dev
```

---

## Production Build

To package and bundle Laude into standalone native installers:
```bash
npm run build
```
This generates installer bundles (.msi, .exe, .dmg, or .deb) under `src-tauri/target/release/bundle/`.

---

## Configuring MCP Servers
Expose external environments by adding MCP stdio configurations in the MCP tab:
- **Command:** e.g., `node`
- **Args:** e.g., `C:\path\to\mcp-server-filesystem\dist\index.js, C:\workspace`
