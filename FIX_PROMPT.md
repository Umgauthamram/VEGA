# Fix Prompt for Laude (paste this into your coding agent)

Work in `G:\projects\laude\laude` (Next.js 16 + React 19 + Tailwind 4 app, main logic in `app/page.tsx`, `app/ollama.ts`, `app/agent.ts`). Read the existing code before changing anything. Fix the following issues, verify each with `npm run dev` against a live Ollama server, and do not break existing features (projects/RAG, MCP, scheduler, presets).

## 1. Chat is broken: embedding models are selectable and errors are hidden

- Root cause of "Ollama error 400": the model picker lists ALL models from `GET /api/tags`, including embedding-only models like `nomic-embed-text`, which cannot be used with `POST /api/chat`.
- Fix: after fetching `/api/tags`, call `POST /api/show` (body `{"model": name}`) for each model and read the `capabilities` array. Only models whose capabilities include `"completion"` may appear in the chat model dropdown. Models with `"embedding"` capability go only in the Embedding Model selector in Settings. Cache the capability results.
- If no chat-capable model is installed, replace the empty chat area with a friendly onboarding state: "No chat model installed — pull one to start" with one-click pull buttons for `llama3.2:3b`, `qwen2.5:7b`, `mistral:7b` using the existing `pullModel` progress UI.
- Error surfacing bug in `app/page.tsx` `handleSendMessage` (chat-mode catch block, ~line 549): it builds `errorMsg` and calls `saveMessage(errorMsg)` but never calls `setMessages`, so the UI shows an empty assistant bubble forever. Fix: update the message in state too, and render errors in a red-tinted bubble.
- Improve error detail in `app/ollama.ts` `streamChat`: on `!res.ok`, read the response body (Ollama returns `{"error":"..."}` JSON) and throw that message, e.g. `does not support chat`, instead of the generic `Ollama error 400`. Apply the same in agent mode.
- While waiting for the first token, show a typing/thinking indicator in the assistant bubble; never render a permanently empty bubble.

## 2. Add provider + API key settings (currently unreachable)

`app/ollama.ts` `LLMClient` already supports `type: 'openai-compatible'` with `apiKey`, but the Settings modal has no UI for it. Add a "Providers" section in Settings:

- List of providers with add/edit/delete. Fields: name, type (`ollama` | `openai-compatible`), base URL, API key (password input with show/hide toggle, only for openai-compatible).
- Ship defaults: "Ollama (Local)" at `http://localhost:11434`, plus easy presets for OpenRouter (`https://openrouter.ai/api`), Groq (`https://api.groq.com/openai`), LM Studio (`http://localhost:1234`).
- Active provider selector; the model dropdown must refetch models when the provider changes. Persist providers in the existing storage layer (`app/storage.ts`) — store API keys locally only.
- Show a small provider badge next to the model name in the chat header.

## 3. Make the UI actually look like Claude.ai

Current UI is a generic zinc-950/amber dark dashboard. Restyle to match Claude.ai:

- Color system (CSS variables, light + dark): light bg `#F5F4EE` (warm ivory), sidebar `#EEEDE4`, accent/primary `#D97757` (Claude terracotta), text `#3D3929`. Dark theme: bg `#262624`, sidebar `#1F1E1B`, same terracotta accent. Replace all amber-500/zinc classes with these tokens.
- Typography: a serif-styled wordmark/greeting (e.g. Tiempos-like via Georgia/`font-serif`), UI text in the existing sans.
- Layout: chat content in a centered column max-w-[48rem]. User messages: right-aligned soft rounded bubble with subtle bg. Assistant messages: NO bubble — plain text on the page background with the model name as a tiny label, like Claude.
- Composer: floating rounded-2xl input card with border, attach button, model picker moved INTO the composer bottom-left (like Claude), send button terracotta.
- New-chat empty state: centered serif greeting ("Good evening" by time of day) above the composer, like Claude's home screen.
- Keep the agent trace log panel, but restyle it to match.

## 4. Agent mode tools are fake

`app/agent.ts` `executeToolLocally` returns hardcoded mock strings for `read_file`, `write_file`, `list_dir`, `run_shell`. Fix:

- When running inside Tauri (`window.__TAURI_INTERNALS__` exists), implement them for real: `@tauri-apps/plugin-fs` for read/write/list (add the plugin + capabilities in `src-tauri`), `Command.create` from `@tauri-apps/plugin-shell` for `run_shell` with stdout/stderr capture. Respect the existing workspace-dir sandbox and approval-level settings.
- When running in a plain browser (`next dev` in Chrome), do NOT return fake success. Return a clear error: "File/shell tools require the desktop app. Run `npm run tauri dev`." and show a warning banner when Agent Mode is toggled on in browser context.
- In agent mode, before starting the loop, verify the selected model supports tools (`/api/show` capabilities contains `"tools"`); if not, warn and fall back to the ReAct text scaffold instead of sending the `tools` parameter (which 400s on non-tool models).

## 5. Verification checklist (do all)

1. `ollama serve` running, only `nomic-embed-text` installed → app shows the "pull a chat model" onboarding, dropdown empty, no 400s.
2. Pull `llama3.2:3b` from within the app → appears in dropdown → send "hi" → streamed reply renders.
3. Kill Ollama mid-stream → error appears inside the assistant bubble (not an empty bubble).
4. Add an OpenAI-compatible provider with a fake key → graceful auth error shown.
5. Agent mode with a tools-capable model → real file listing of the workspace dir; in browser mode → clear "desktop app required" error.
6. `npm run build` passes with no TypeScript errors.
