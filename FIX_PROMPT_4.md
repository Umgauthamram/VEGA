# Laude v3 — Final Feature & UI Spec (paste into your coding agent)

Work in `G:\projects\laude\laude`. This prompt has four parts: REMOVE fake chrome, FIX dead controls, IMPLEMENT MCP for real, IMPLEMENT scheduling for real, plus a unified permission-popup system. Follow it exactly. Rule of thumb: **every visible control must do something real, and anything that lies about state gets deleted.** `npm run build` must pass at the end.

---

## PART A — REMOVE (copied from Claude Desktop but meaningless in a local app)

Delete these entirely:

1. `Composer.tsx`: "⚡ 2x usage allowance active" badge — there are no usage limits in a local app.
2. `Composer.tsx`: "🖐️ Manual ▾" chip — no function. Remove.
3. `Composer.tsx`: "Cowork" mode label — rename the segmented toggle to **Chat | Agent** (it already toggles agent mode; just label it truthfully).
4. `Composer.tsx`: microphone placeholder button — remove until speech input actually exists.
5. `Sidebar.tsx`: "Relaunch to update v1.24012.1" banner — fake version, fake update. Remove.
6. `Sidebar.tsx`: "Design | Labs" footer links — dead. Remove.
7. `SettingsModal.tsx`: "Role Designation" dropdown (Product Designer etc.) — pointless. Remove. Keep Full Name / Call Name only, and actually inject them into the system prompt ("The user's name is X, call them Y").
8. `SettingsModal.tsx`: "Claude Code" nav item — this app is not Claude Code. Remove. Rename "Cowork Agent" page to **Agent**.
9. `SettingsModal.tsx`: "Usage Analytics" page — replace with a single simple **Stats** section under General (total chats, total tokens generated, models installed). No fake graphs.
10. `SubViews.tsx`: hardcoded fake artifact cards ("System design plan diagram..."). Artifacts view must list REAL artifacts extracted from conversation history (code blocks / html / svg / mermaid the models actually produced), each opening the artifact panel. Empty state if none.
11. `ChatView.tsx`: macOS traffic-light dots and any decorative header icons with no function (ghost icon, search icon if it doesn't search, back/forward arrows if they don't navigate). Remove every one of them.
12. Emoji used as icons (📁, 🖐️, ⚡) — replace all with lucide icons.

## PART B — FIX dead or misplaced controls

1. **Composer model chip**: currently shows "NO LOCAL MODELS FOUND" as a dropdown even when disconnected. Behavior: if Ollama offline → chip shows "Ollama offline" in red and opens a mini-popover with `ollama serve` instructions + Retry. If online but no chat models → chip opens the pull-model dialog. If models exist → dropdown grouped by provider, current model checked.
2. **Params icon** (sliders) next to model chip: must open a popover with temperature, top_p, num_ctx, system prompt, and preset save/load. If it currently does nothing, wire it.
3. **"Link Workspace" chip** → rename to **Workspace**: opens a popover to pick the agent workspace directory (native folder picker via `@tauri-apps/plugin-dialog` — add the plugin; fallback: text input in browser). Show the selected folder name in the chip.
4. **Sidebar Recents**: the sort icon must work (toggle: recent / alphabetical). Each row needs a "…" hover menu: Pin, Rename (inline), Delete (with confirm dialog). Pinned section only renders when at least one pinned chat exists.
5. **Sidebar account row**: clicking opens a popover: Ollama status + version, active provider, theme quick-toggle, "Open Settings", "Export/Import database". Status dot: green = connected, red = offline, amber = connecting.
6. **Home | Code tabs**: Home = chat mode default; Code = agent mode default + right panel open. If a tab currently does nothing, wire it; the mode chip in the composer must stay in sync.
7. **Search**: add one real search input at the top of the Recents list (filters conversations by title/content). This replaces any decorative search icons.
8. Every remaining button in the app: click through them; any handler that is a no-op either gets implemented or the button gets deleted. List what you removed in the final summary.

## PART C — Implement MCP for real (currently 100% mock)

`app/mcp.ts` currently fakes the handshake and returns hardcoded GitHub tools. Replace with a real MCP client:

### C1. Transports
- **stdio** (desktop only): spawn the server via `Command.create(cmd, args, { env })` from `@tauri-apps/plugin-shell` with piped stdin/stdout. Speak JSON-RPC 2.0 over newline-delimited stdout. If sidecar stdin writing is limited, implement a small Rust command in `src-tauri` (`mcp_spawn`, `mcp_send`, `mcp_kill`) using `std::process` with stdin kept open, emitting stdout lines to the frontend via Tauri events. This is the correct approach — do it in Rust.
- **HTTP/SSE**: `fetch` POST for requests; SSE via `EventSource` for server messages. Config: url + optional headers (for auth tokens).

### C2. Protocol (JSON-RPC 2.0)
1. `initialize` request (protocolVersion `2025-03-26`, clientInfo `{name:"laude", version:"0.1"}`, capabilities `{}`) → wait for result → send `notifications/initialized`.
2. `tools/list` → store tools with name, description, inputSchema, namespaced as `servername__toolname`.
3. `tools/call` with `{name, arguments}` → return `result.content` (concatenate text parts; describe non-text parts).
4. Handle request timeouts (30s), server crash (mark disconnected, offer reconnect), and `notifications/tools/list_changed` (re-list).

### C3. Persistence & UI (Settings → Connectors)
- Persist server configs in storage (same shape as `claude_desktop_config.json`: `{mcpServers: {name: {command, args, env}}}`), plus `{type:"http", url}` entries.
- **Import button**: read `%APPDATA%\Claude\claude_desktop_config.json` via Tauri fs if present, show a picker of found servers to import.
- Per-server card: name, transport, status dot (connected/connecting/error/disabled), tool count, enable toggle, Connect/Disconnect, Delete (confirm), expandable tool list showing each tool name + description.
- Agent mode: enabled + connected servers' tools merge into the tool list (already wired via `getLoadedMcpTools`) — keep the `server__tool` namespacing.
- Add an **MCP log** tab in the right panel's Progress card: raw request/response lines per server, collapsible.
- Browser (non-Tauri) context: stdio servers show "desktop app required"; HTTP servers still work.

## PART D — Implement Scheduling for real (currently no engine)

`app/scheduler.ts` stores schedules in memory and never runs anything. Implement:

1. **Persistence**: save schedules via the storage layer (survive restart).
2. **Engine**: install `croner` (npm). On app load, start one interval tick (every 30s) that checks each enabled schedule's next-run time (`Cron(expr).nextRun()`); if due, execute.
3. **Execution**: run the schedule's prompt against its model in a NEW conversation titled `[Scheduled] {name} — {date}`, chat or agent mode per config. Agent-mode scheduled runs use safety level "ask_dangerous"-equivalent but since no user is present, tools requiring approval are SKIPPED with a note in the trace — never auto-approve destructive actions unattended.
4. **After run**: store lastRunTime + status + link to the created conversation; fire OS notification ("Laude: Daily Brief completed") via the existing notification helper; failed runs show the error.
5. **Scheduled view UI** (already exists as a page): each schedule card shows name, human-readable cadence ("Daily at 09:00" — parse from cron), next run countdown, last run status chip linking to the result conversation, enable/disable toggle, Run Now button, Edit, Delete (confirm).
6. **New task dialog**: name, prompt (textarea), model dropdown (chat-capable only), mode (Chat/Agent), schedule builder — simple presets (Every day at HH:MM, Every week on DAY at HH:MM, Every hour, Custom cron input with live "next 3 runs" preview via croner). Validate cron before save.
7. The "Scheduled tasks only run while the computer is awake" banner stays (it's true). "Keep awake" checkbox: if checked, use Tauri to prevent display sleep only while a run is executing; if that's complex, remove the checkbox rather than faking it.

## PART E — Unified permission popups

Create `components/ConfirmDialog.tsx` — ONE modal component used everywhere. Centered card, icon, title, description, optional monospace detail block (scrollable, max-h-48), checkbox slot, Cancel (neutral) + Confirm (accent, or red for destructive). Promise-based API: `const ok = await confirm({...})`.

Use it for ALL of these (replace every `window.confirm`/`alert` — grep and remove them):

| Action | Detail shown | Extra |
|---|---|---|
| Agent shell command | the exact command | checkbox "Allow shell for this conversation" |
| Agent file write/edit/delete | path + content diff/preview | checkbox "Allow file writes for this conversation" |
| File access outside workspace dir | resolved path vs workspace | — |
| MCP tool call (agent mode) | server, tool, JSON args | checkbox "Always allow this tool this conversation" |
| Delete conversation / project / schedule / provider / MCP server | name of the thing | red confirm |
| Delete local model | model name + size | red confirm |
| Import database / claude_desktop_config | file path + what will be overwritten | — |
| Memory update proposed by model | old → new memory text | — |

Per-conversation allowances stored in state (reset on new conversation). Safety levels still apply: "Ask always" = every tool call pops; "Ask for dangerous" = shell/write/MCP-write pop; "YOLO" = no popups but every action still logged in the trace. Notification permission uses the existing OS prompt.

## Verification checklist

1. No string "usage allowance", "Relaunch", "Manual", "Cowork", "Role Designation" remains — grep proves it. No emoji icons remain.
2. Every visible button/icon performs an action (report any you deleted).
3. MCP: add a real server (e.g. `npx -y @modelcontextprotocol/server-filesystem G:\projects` stdio) → status green, real tools listed, agent can call one with an approval popup, result returns in the trace.
4. Schedule "every 2 minutes" test task → runs on time, new conversation appears, notification fires, next-run updates. Survives app restart.
5. All destructive actions across the app go through ConfirmDialog — zero `window.confirm`/`alert` left (grep proves it).
6. Both themes still clean; `npm run build` zero errors.
