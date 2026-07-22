# UI Overhaul Prompt for Laude — Claude Desktop Look (paste into your coding agent)

Work in `G:\projects\laude\laude`. Restructure the UI to match the Claude Desktop app layout described below. Keep ALL existing functionality (chat, agent mode, providers, MCP, projects/RAG, memory, schedules, presets, model pull/delete) — only reorganize where features live and how they look. Break `app/page.tsx` (79KB) into components: `components/Sidebar.tsx`, `components/ChatView.tsx`, `components/Composer.tsx`, `components/SettingsModal.tsx`, `components/RightPanel.tsx`, `components/ThemeProvider.tsx`.

## 1. Theme system — Light / Dark / System (required)

- Add a `ThemeProvider` using React context. Three modes: `light`, `dark`, `system` (follows `prefers-color-scheme`). Persist choice in storage. Apply via a `dark` class on `<html>` and CSS variables — remove the current `@media (prefers-color-scheme)` only approach since the user must be able to override it.
- Tokens (light → dark):
  - `--bg`: `#F5F4EE` → `#262624`
  - `--bg-secondary` (sidebar/panels): `#EEEDE4` → `#1F1E1B`
  - `--bg-input` (composer card): `#FFFFFF` → `#30302E`
  - `--text`: `#3D3929` → `#E5E2D9`
  - `--text-muted`: `#8A8778` → `#9C9A90`
  - `--border`: `#E2E0D4` → `#3A3935`
  - `--accent`: `#D97757` (both), hover `#C25F3E` / `#E28C70`
- Theme switcher = 3 icon buttons in a pill group (monitor / sun / moon), shown in Settings → Preferences → "Appearance", exactly like Claude's.

## 2. Left sidebar (240–260px, `--bg-secondary`)

Top to bottom:

1. Two pill tabs at top: **Home** (house icon) and **Code** (`</>` icon). Home = normal chat. Code = same chat but agent-mode default ON with the trace log open. Active tab has a subtle filled background.
2. Nav list (icon + label, 13px, muted; hover = subtle bg):
   - **+ New** (new chat, Ctrl+K)
   - **Projects** (opens projects view — move the current Projects modal content here as a full main-pane view)
   - **Artifacts** (gallery of previously rendered artifacts)
   - **Scheduled** (move Schedules modal content here)
   - **Customize** (opens Settings)
3. **Pinned** section header (11px uppercase muted) — pinned conversations.
4. **Recents** section header with a sort/filter icon on the right — recent conversations, each row: chat icon + single-line truncated title; hover reveals pin/rename/delete via a "…" menu. Active row = subtle filled bg.
5. Bottom, pinned to the sidebar footer: an update banner slot (hidden by default) and an **account/workspace row**: small logo square + workspace name ("Laude") + status dot showing Ollama connection (green connected / red offline), with a chevron. Clicking opens a popover menu: connection status + provider name, Settings, Get help, View changelog, Log-style items — mirror Claude's account popover structure.

Remove the current row of 6 tiny icon buttons crammed next to the logo — everything moves into this nav or Settings.

## 3. Main pane

- Chat header: conversation title as a dropdown (rename/delete/export from it), right side: panel-toggle icon for the right panel. No model picker here — it moves to the composer.
- Empty state: centered serif greeting by time of day ("Good morning" etc.) with a decorative accent star, composer centered below it.
- Messages: centered column `max-w-[46rem]`. User = right-aligned soft bubble (`--bg-input`, rounded-2xl). Assistant = NO bubble, plain text on `--bg`, small action row under it on hover (copy, regenerate, edit, thumbs). Streaming shows a small pulsing dot.
- Errors render in a red-tinted rounded card inside the message column.

## 4. Composer (the most Claude-defining element)

Floating rounded-2xl card (`--bg-input`, 1px `--border`, soft shadow), centered, same width as message column:

- Row 1: the text input (auto-growing textarea, placeholder "How can I help you today?").
- Row 2 (toolbar inside the card):
  - Left: **+** button (attachments menu: file upload, screenshot), **folder** button (project/workspace picker), **mode chip** — a small labeled dropdown showing current mode: "Chat" / "Agent" (replaces the agent toggle in the header; keep the hand icon style chip like Claude's "Manual" chip).
  - Right: **model chip** — dropdown showing current model name (e.g. "qwen2.5:7b") with the provider as a sublabel; next to it a small **params** chevron opening temperature/preset quick-menu; mic icon (disabled placeholder is fine); terracotta circular **send** button with arrow-up icon.
- Under the composer, centered muted 11px caption: "Local model — responses may be inaccurate. Context: {tokens}/{num_ctx}".

## 5. Right panel (collapsible, 300px)

Two stacked cards like Claude's Progress/Context panel:

- **Progress**: the agent trace log (moved from the current overlay) — collapsible rows per tool call: icon, tool name, one-line summary; expand for args/output. Show "Ran N commands" summary line when the loop ends.
- **Context**: list of files attached / project files / MCP servers active in this conversation, each row: file icon + name. Empty state: small illustration placeholder + "Track tools and referenced files used in this task."

Panel is hidden by default in chat mode, auto-opens in agent mode.

## 6. Settings — full modal like Claude's (replaces the current single-page settings)

Centered modal ~900×640, rounded-xl, with a **left nav column** (`--bg-secondary`) and scrollable right content. Left nav with a search box on top, then sections:

- **Settings**: General, Account, Usage, Capabilities, Providers, Cowork-style "Agent" page
- **Customize**: Skills (presets), Connectors (MCP servers), Plugins (placeholder)

Map existing features to pages:

- **General**: Profile block (full name, "What should Laude call you", "Instructions for Laude" textarea = the existing user memory / system prompt). Then **Preferences**: Appearance (the 3-way theme pill), Chat font (Default / Serif dropdown — apply `font-serif` to assistant text when Serif).
- **Providers**: the existing provider list + API key management, plus Ollama base URL, keep-alive, default model, embedding model.
- **Capabilities / Models**: model list with size/quant, pull with progress, delete, running models + VRAM.
- **Agent**: workspace directory, safety level (Ask always / dangerous only / YOLO), max iterations.
- **Connectors**: MCP server add/edit (stdio + SSE), enable toggles, status dots, import from `claude_desktop_config.json`.
- Every page: 15px section titles, 13px labels left / controls right, rows separated by 1px `--border` dividers — match the screenshot's density.

## 7. Polish rules

- One icon set (lucide), 16px in nav, 14px in chips. No emoji in UI chrome.
- All interactive elements: rounded-lg, focus-visible ring in accent color.
- Scrollbars: 6px, thumb uses `--border`, brighter on hover — respect theme.
- Transitions 150ms on hover/bg only. No layout shift when panels toggle.
- Verify BOTH themes on every screen: sidebar, chat, composer, settings modal, right panel. No hardcoded zinc-* or amber-* classes may remain — grep for them and replace all with token classes.
- `npm run build` must pass with zero TS errors.

## Verification checklist

1. Toggle light/dark/system in Settings → General → whole app switches instantly, persists after reload.
2. Sidebar: Home/Code tabs, New, Projects, Artifacts, Scheduled, Customize, Pinned + Recents, account row with Ollama status dot.
3. Composer contains attach +, mode chip, model chip, send — no model picker left in the header.
4. Agent run shows Progress panel on the right with collapsible tool rows.
5. Settings modal shows left-nav layout and every old feature is reachable somewhere.
6. Grep confirms zero `zinc-` / `amber-` classes remain.
