# Build Prompt: "LocalClaude" — Claude-Style Desktop App Powered by Ollama

Copy everything below this line into Claude Code (or any coding agent) as your build prompt.

---

## PROJECT BRIEF

Build me a **production-quality, fully local desktop application** called **LocalClaude** — a Claude.ai-style AI assistant desktop app that runs 100% on my machine, powered by **Ollama** as the inference backend. There are **no rate limits** anywhere in the app because all inference is local.

I will run models myself via CLI (e.g. `ollama run qwen2.5:14b`), and the app must auto-detect and connect to the running Ollama server.

---

## 1. TECH STACK

- **Shell:** Tauri 2.x (preferred, lightweight) — fall back to Electron only if Tauri blocks a feature I need.
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS.
- **Backend logic:** Rust (Tauri commands) for file system, shell execution, scheduling, and process management; TypeScript for chat orchestration.
- **Local storage:** SQLite (via `tauri-plugin-sql` or better) for conversations, settings, memories, schedules. No cloud, no telemetry.
- **Markdown rendering:** react-markdown + rehype-highlight (syntax highlighting), KaTeX for math, Mermaid for diagrams.

---

## 2. OLLAMA INTEGRATION (CORE)

Connect to the local Ollama server at `http://localhost:11434` (make host/port configurable in Settings).

- **Health check on launch:** ping `GET /api/version`. If Ollama isn't running, show a friendly banner with the exact command to start it (`ollama serve`) and a "Retry" button. Poll every 5s until connected.
- **Model discovery:** `GET /api/tags` to list all locally installed models. Show model name, parameter size, quantization, and disk size.
- **Chat endpoint:** use `POST /api/chat` with `stream: true`. Stream tokens into the UI in real time (typewriter effect like Claude).
- **Model management inside the app:**
  - Pull new models (`POST /api/pull`) with a progress bar.
  - Delete models (`DELETE /api/delete`).
  - Show currently loaded models (`GET /api/ps`) and VRAM usage.
- **Per-conversation model selection:** a model switcher dropdown in the chat header (like Claude's model picker). Switching mid-conversation is allowed — the full message history is sent to the new model.
- **Per-model parameters:** temperature, top_p, top_k, num_ctx (context window), repeat_penalty, seed, system prompt — editable per conversation and savable as named presets ("Profiles").
- **Keep-alive control:** setting for `keep_alive` so I can control how long the model stays in memory.

---

## 3. CHAT EXPERIENCE (CLAUDE-STYLE UI)

Replicate the Claude.ai layout and polish:

- Left sidebar: conversation list with search, pin, rename, delete, and folders/projects.
- Main pane: clean chat with user/assistant bubbles, streaming markdown, copy buttons on code blocks, "Regenerate", "Edit & resend", and branch/fork a conversation from any message.
- **Artifacts panel:** when the model outputs code, HTML, SVG, or Mermaid, render it in a right-side artifact panel with a live preview tab and a code tab (HTML/SVG previews sandboxed in an iframe/webview).
- Attachments: drag-and-drop text files, code files, PDFs (extract text locally), and images (pass to vision-capable models like `llama3.2-vision` via Ollama's `images` field; detect model capability and disable image upload gracefully if unsupported).
- **Projects:** group chats under a project with a shared project system prompt and a folder of project knowledge files that get injected as context (with simple local RAG — chunk + embed via Ollama's `/api/embed` using an embedding model like `nomic-embed-text`, store vectors in SQLite, retrieve top-k relevant chunks per message).
- **Memory:** a persistent user memory file the model can read/update (with my confirmation), injected into the system prompt.
- Dark/light theme, keyboard shortcuts (Cmd/Ctrl+K new chat, etc.), export chat as Markdown/JSON.

---

## 4. AGENTIC MODE

A toggle in the chat header: **Chat mode** vs **Agent mode**.

In Agent mode the app runs a **tool-use loop**:

1. Send the conversation + tool schemas to Ollama using the native `tools` parameter (`/api/chat` supports function calling for models like qwen2.5, llama3.1, mistral-nemo).
2. If the model returns `tool_calls`, execute the tool(s) locally, append the results as `role: "tool"` messages, and loop until the model produces a final text answer or hits a configurable max-iterations limit (default 25).
3. **Fallback for non-tool-calling models:** implement a ReAct-style prompt scaffold (structured JSON action blocks parsed from output) so agent mode still works, with a warning that native tool-calling models are more reliable.

**Built-in tools (implement all):**

- `read_file(path)`, `write_file(path, content)`, `edit_file(path, old, new)`, `list_dir(path)`, `glob_search(pattern)`
- `run_shell(command)` — execute shell commands with streamed output
- `web_fetch(url)` — fetch and convert a page to markdown
- `web_search(query)` — pluggable provider (SearXNG local instance, Brave API key, or DuckDuckGo HTML scrape)
- `task_complete(summary)` — ends the loop

**Safety layer (important):**
- A per-conversation **workspace directory** the agent is sandboxed to by default; going outside it requires my approval.
- **Approval prompts** for: shell commands, file writes/deletes outside workspace, and anything destructive. Three permission levels in settings: *Ask always* / *Ask for dangerous only* / *YOLO (auto-approve everything)*.
- Live **agent activity log** panel showing each tool call, its input, and its output, collapsible per step (like Claude Code's tool trace).
- Stop button that cancels the loop immediately.

---

## 5. MCP (MODEL CONTEXT PROTOCOL) SUPPORT

Make the app a full **MCP client**:

- Settings page to add MCP servers via **stdio** (command + args + env) and **SSE/HTTP** transports — same config shape as Claude Desktop's `claude_desktop_config.json`, and offer to import that file directly if it exists.
- On connect: perform the MCP handshake, list the server's **tools, resources, and prompts**.
- Expose all MCP tools to the model in Agent mode alongside built-in tools (namespace them like `github__create_issue`).
- Tool call results flow back into the agent loop. Approval rules from section 4 apply to MCP tools too.
- Per-server enable/disable toggle per conversation, connection status indicators, and auto-reconnect.
- Log all MCP traffic in a debug view.

---

## 6. SCHEDULING / AUTOMATIONS

A **Schedules** section in the sidebar:

- Create a scheduled task: name, cron expression (with a friendly builder: daily/weekly/hourly presets), the prompt to run, which model, chat vs agent mode, which tools/MCP servers are allowed.
- Scheduler runs in the Rust backend (works while app is open; add a setting to launch the app minimized to tray on OS startup so schedules keep running).
- Each run creates a new conversation tagged with the schedule name, and fires a **desktop notification** with a summary when done.
- Run history per schedule with success/failure status and logs. Manual "Run now" button.
- Example use cases to seed as templates: "Every morning summarize my notes folder", "Hourly: check a URL and alert me if it changed."

---

## 7. EXTRA FEATURES

- **Quick launcher:** global hotkey (like Cmd/Ctrl+Shift+Space) opens a Spotlight-style floating prompt window for one-off questions.
- **System tray** icon with quick actions.
- **Multi-provider ready:** architect the LLM client behind a provider interface so I can later add OpenAI-compatible endpoints (LM Studio, llama.cpp server, vLLM) just by adding a base URL + optional key in settings. Ollama is the default provider.
- **Token/context meter:** show estimated context usage per conversation vs the model's `num_ctx`, and auto-summarize/truncate old messages when nearing the limit (configurable strategy).
- **Stats page:** tokens/sec, total messages, per-model usage — all local.
- **Import/export:** full backup and restore of the SQLite DB and settings as a single file.

---

## 8. NON-FUNCTIONAL REQUIREMENTS

- Everything works fully offline (except web tools and model pulls).
- No account, no login, no telemetry, no rate limiting logic anywhere.
- Cross-platform: Windows, macOS, Linux builds via Tauri bundler.
- Clean, typed codebase with clear module boundaries: `providers/`, `agent/`, `mcp/`, `scheduler/`, `storage/`, `ui/`.
- Include a README with setup steps, Ollama prerequisites, recommended models (tool-calling capable: qwen2.5, llama3.1, mistral-nemo; vision: llama3.2-vision; embeddings: nomic-embed-text), and how to add MCP servers.
- Provide `npm run dev` for development and `npm run build` for production installers.

## 9. BUILD ORDER

Work in this sequence, showing me the app running after each phase:
1. Tauri + React shell, Ollama connection, streaming chat, model switcher, SQLite persistence.
2. Claude-style UI polish: sidebar, markdown/code rendering, artifacts panel, attachments.
3. Agent mode with built-in tools + safety/approval layer.
4. MCP client support.
5. Scheduling + tray + notifications.
6. Projects/RAG, memory, quick launcher, stats, import/export, packaging.

Start with Phase 1 now. Ask me questions only if something genuinely blocks you; otherwise make sensible defaults and note them.