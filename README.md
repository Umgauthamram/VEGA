# VEGA — Virtual Engine for Generative Assistance

**VEGA is a privacy-first, fully local AI desktop assistant.** It runs entirely on your own machine, powered by [Ollama](https://ollama.com) (or any OpenAI-compatible endpoint you point it at). Your chats, files, and API keys never leave your computer — and because inference is local, **there are no token limits.**

Think of it as a Claude/ChatGPT-style desktop app — chat, agent mode, tools, projects, scheduling — but the model is yours and the data stays home.

> ⚠️ VEGA is an independent project. It is **not affiliated with or endorsed by Anthropic, OpenAI, or Ollama.**

---

## ✨ Features

- **Local-first chat** — Streamed, clean chat UI with Markdown, syntax highlighting, and math/diagram rendering.
- **Multi-provider** — Auto-connects to a running Ollama server. You can also add OpenAI-compatible endpoints (LM Studio, llama.cpp, vLLM, OpenRouter, Groq) with your own API key.
- **Model management** — Discover installed models, pull new ones with a progress bar, delete models, and see what's loaded in VRAM — all in-app.
- **Agent mode** — An autonomous tool-use loop (`read_file`, `write_file`, `list_dir`, `run_shell`, `web_fetch`) with a live activity log and **approval popups** before anything touches your disk or shell.
- **MCP support** — Connect Model Context Protocol servers (stdio + HTTP/SSE) to give the agent extra tools. Import your existing `claude_desktop_config.json`.
- **Projects & local RAG** — Group chats under a project, drop in knowledge files; VEGA chunks + embeds them locally (via `nomic-embed-text`) and retrieves relevant context per message.
- **Scheduler** — Run prompts automatically on a schedule (daily brief, weekly review, custom cron) with desktop notifications.
- **Attachments** — Drag in text, code, PDFs (extracted locally), and images for vision-capable models.
- **Light / Dark / System themes**, global shortcut launcher, and chat export.
- **Backup & restore** — Export/import your whole local database as JSON.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | Next.js 16 · React 19 · TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Local storage | SQLite (`tauri-plugin-sql`) |
| Scheduling | croner |
| AI backend | Ollama / any OpenAI-compatible API |

---

## ✅ Requirements

### Development Dependencies
Install these software environments before starting development:

| Tool | Minimum version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | **20 LTS or newer** | Ships with npm |
| [Rust](https://www.rust-lang.org/tools/install) | **1.77.2 or newer** | Required by Tauri 2 |
| [Ollama](https://ollama.com) | Latest | The local model runtime |

**Platform build tools (needed for packaging desktop apps):**
- **Windows** — [Microsoft WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (pre-installed on Windows 11) + [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
- **macOS** — Xcode Command Line Tools: `xcode-select --install`.
- **Linux** — `webkit2gtk`, `libappindicator`, `librsvg` (see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)).

### 💻 Hardware Requirements (Ollama)
Running large language models locally on your computer requires sufficient system resources:

* **System RAM:** 
  - **8 GB** minimum (can run small 3B models like `llama3.2:3b` comfortably).
  - **16 GB** recommended (for running 7B/8B models like `qwen2.5:7b` or `llama3.1`).
  - **32 GB+** for larger models like `qwen2.5:14b` or `llama3.1:70b`.
* **Processor (CPU):** Core i5 / Apple Silicon M1 (or equivalent) or newer.
* **Graphics (GPU/VRAM):** Dedicated NVIDIA (RTX/GTX) or AMD GPU with **6 GB+ VRAM** (8 GB+ recommended) for fast GPU-accelerated inference.
* **Storage:** **10 GB to 20 GB** of free space on a Solid State Drive (SSD) is recommended (individual models range from 2 GB to 9 GB).

### 📥 What to Download & Keep
To run VEGA fully offline, you should download and keep the following local dependencies:

1. **Ollama Desktop Client:** Download and run the launcher from [ollama.com](https://ollama.com). Keep the Ollama application serving in your system tray.
2. **Local AI Models:** Pull the following recommended models from your terminal:
   * **General Chat & Coding:** `ollama pull qwen2.5:7b` (recommended general assistant model with built-in tool-calling support).
   * **Local Embeddings (RAG):** `ollama pull nomic-embed-text` (required for indexing and querying Project folders).
   * **Multimodal/Vision:** `ollama pull llama3.2-vision` (optional model for processing images/attachments).

---

## 🚀 Getting Started

### 1. Install and start Ollama, then pull a model

```bash
# after installing Ollama from https://ollama.com
ollama serve

# pull at least one chat model (pick one)
ollama pull llama3.2:3b        # small & fast
ollama pull qwen2.5:7b         # good all-rounder / supports tools
ollama pull qwen2.5:14b        # stronger, needs more RAM/VRAM

# optional extras
ollama pull nomic-embed-text   # required for Projects / RAG
ollama pull llama3.2-vision    # for image inputs
```

> An embedding-only model like `nomic-embed-text` **cannot** be used for chat — pull a chat model too.

### 2. Clone the repository

```bash
git clone https://github.com/<your-username>/vega.git
cd vega/VEGA        # the app lives in the VEGA/ subfolder
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run it

**Desktop app (recommended — enables file, shell, and MCP tools):**
```bash
npx tauri dev
```

**Web-only preview (chat works; agent file/shell tools are disabled):**
```bash
npm run dev
# open http://localhost:3000
```

### 5. Build a distributable desktop app

```bash
npx tauri build
```
The installer/binary is written to `src-tauri/target/release/bundle/` (.msi/.exe on Windows, .dmg on macOS, .deb/.AppImage on Linux).

---

## 🕹️ Usage Notes

- On launch VEGA pings `http://localhost:11434`. If Ollama isn't running you'll see a banner with the `ollama serve` command and a Retry button. Change the host/port in **Settings → Providers**.
- Pick a chat model from the model chip in the composer. Embedding-only models are filtered out automatically.
- **Agent mode** and its file/shell tools only work in the desktop build (`npx tauri dev` / `tauri build`), not the browser preview.
- Add API-based providers under **Settings → Providers** — keys are stored locally on your machine only.

---

## 🩺 Troubleshooting

| Problem | Fix |
|---|---|
| "Ollama server offline" | Run `ollama serve` in a terminal; click Retry. |
| Model dropdown is empty | You only have an embedding model — `ollama pull llama3.2:3b`. |
| Chat returns error 400 | You selected an embedding model for chat; pick a chat model. |
| Agent tools do nothing | You're in the browser preview — use `npx tauri dev`. |
| `tauri` command not found | Run via `npx tauri dev`, or install the Tauri CLI globally. |

---

## 📁 Project Structure

```
vega/                 # repo root
└── VEGA/             # the Tauri + Next.js application
    ├── app/          # chat orchestration, Ollama client, agent, RAG, MCP, storage
    ├── components/   # Sidebar, ChatView, Composer, Settings, RightPanel, dialogs
    └── src-tauri/    # Rust desktop shell, plugins, capabilities
```

---

## 📄 License

Released under the **MIT License** — free to use, modify, and distribute.

---

*VEGA — run your own AI, keep your own data.*