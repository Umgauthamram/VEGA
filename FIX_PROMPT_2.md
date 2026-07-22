# Follow-up fixes for Laude (paste into your coding agent)

Work in `G:\projects\laude\laude`. Three remaining issues from the v2 review:

## 1. Embedding-model filter is a fragile name heuristic

In `app/ollama.ts` `listModels()`, models are excluded only if the name contains "embed". Models like `bge-m3` or `all-minilm` would still appear and 400 on chat. Fix properly:

- Ollama's `POST /api/show` (body `{"model": name}`, not `name:`) returns a top-level `capabilities` array, e.g. `["completion","tools"]`. Include a model in the chat dropdown ONLY if capabilities contains `"completion"`.
- The current loop calls `/api/show` sequentially per model — use `Promise.all` and cache results in a Map so the model list loads fast and isn't re-queried on every refresh.

## 2. Agent mode can still 400 on non-tool models

Before starting the agent loop in `app/page.tsx`, check the selected model's cached capabilities for `"tools"`. If absent, do NOT send the `tools` parameter (it 400s); show a warning in the agent log and fall back to a ReAct-style text scaffold (instruct the model to reply with a JSON action block, parse it, execute, loop).

## 3. Browser mode still fakes tool success

In `app/agent.ts`, when not running under Tauri, every tool returns "[Mock] ... successfully" — the model is told writes succeeded when nothing happened. Replace all mock returns with an explicit error string: `"Error: file/shell tools require the desktop app. Run 'npm run tauri dev'."` and show a one-time warning banner when Agent Mode is toggled on in a plain browser.

## Verify

- `npm run build` passes.
- With only `nomic-embed-text` + `bge-m3` installed: chat dropdown is empty, onboarding screen shows.
- Agent mode with a non-tools model (e.g. `gemma2`): no 400, ReAct fallback used.
- Agent mode in browser: tools return the desktop-app error, not fake success.
