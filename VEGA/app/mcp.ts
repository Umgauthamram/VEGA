import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  type?: 'stdio' | 'http';
  url?: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

// In-memory registry of MCP Servers, loaded tools, and active connections
let registeredServers: McpServerConfig[] = [];
let loadedMcpTools: McpTool[] = [];
const activeConnections: Map<string, {
  config: McpServerConfig;
  status: 'connected' | 'connecting' | 'error' | 'disabled';
  toolsCount: number;
  pendingRequests: Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>;
  nextId: number;
  stdoutUnlisten?: () => void;
  stderrUnlisten?: () => void;
  sseSource?: EventSource;
}> = new Map();

// Raw communication logs mapping server_name -> log lines
export const mcpLogsRegistry: Map<string, string[]> = new Map();

export function getMcpServers(): McpServerConfig[] {
  return registeredServers;
}

export function saveMcpServer(server: McpServerConfig) {
  const index = registeredServers.findIndex((s) => s.name === server.name);
  if (index >= 0) {
    registeredServers[index] = server;
  } else {
    registeredServers.push(server);
  }
  // Sync to config storage
  persistMcpConfigs();
}

export function deleteMcpServer(name: string) {
  disconnectMcpServer(name);
  registeredServers = registeredServers.filter((s) => s.name !== name);
  loadedMcpTools = loadedMcpTools.filter((t) => t.serverName !== name);
  mcpLogsRegistry.delete(name);
  persistMcpConfigs();
}

export function getLoadedMcpTools(): McpTool[] {
  return loadedMcpTools.filter((t) => {
    const s = registeredServers.find((srv) => srv.name === t.serverName);
    return s ? s.enabled : false;
  });
}

function persistMcpConfigs() {
  if (typeof window !== 'undefined') {
    const data = { mcpServers: {} as Record<string, any> };
    registeredServers.forEach(s => {
      if (s.type === 'http') {
        data.mcpServers[s.name] = { type: 'http', url: s.url, enabled: s.enabled };
      } else {
        data.mcpServers[s.name] = { command: s.command, args: s.args, env: s.env, enabled: s.enabled };
      }
    });
    localStorage.setItem('vega_mcp_config', JSON.stringify(data));
  }
}

export function loadMcpConfigs() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vega_mcp_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const configs: McpServerConfig[] = [];
        if (parsed.mcpServers) {
          Object.entries(parsed.mcpServers).forEach(([name, val]: [string, any]) => {
            configs.push({
              name,
              command: val.command || '',
              args: val.args || [],
              env: val.env || {},
              enabled: val.enabled !== false,
              type: val.type || 'stdio',
              url: val.url || ''
            });
          });
        }
        registeredServers = configs;
      } catch (e) {
        console.error('Failed to parse MCP configs:', e);
      }
    }
  }
}

// Initialise storage configs loading
loadMcpConfigs();

function logMcp(serverName: string, direction: 'IN' | 'OUT', msg: string) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] [${direction}] ${msg}`;
  const list = mcpLogsRegistry.get(serverName) || [];
  list.push(line);
  if (list.length > 500) list.shift();
  mcpLogsRegistry.set(serverName, list);
}

export function getMcpLogs(serverName: string): string[] {
  return mcpLogsRegistry.get(serverName) || [];
}

export function getMcpStatus(name: string): 'connected' | 'connecting' | 'error' | 'disabled' {
  const conn = activeConnections.get(name);
  if (!conn) {
    const config = registeredServers.find(s => s.name === name);
    if (config && !config.enabled) return 'disabled';
    return 'disabled';
  }
  return conn.status;
}

export function getMcpToolsCount(name: string): number {
  return activeConnections.get(name)?.toolsCount || 0;
}

export function disconnectMcpServer(name: string) {
  const conn = activeConnections.get(name);
  if (conn) {
    logMcp(name, 'OUT', 'Disconnecting server connection...');
    if (conn.config.type !== 'http') {
      invoke('mcp_kill', { name }).catch(() => {});
    }
    if (conn.stdoutUnlisten) conn.stdoutUnlisten();
    if (conn.stderrUnlisten) conn.stderrUnlisten();
    if (conn.sseSource) {
      conn.sseSource.close();
    }
    // Cancel pending timers
    conn.pendingRequests.forEach(req => {
      clearTimeout(req.timer);
      req.reject(new Error('Connection terminated'));
    });
    activeConnections.delete(name);
  }
}

export async function connectMcpServer(server: McpServerConfig): Promise<McpTool[]> {
  disconnectMcpServer(server.name);

  if (!server.enabled) {
    return [];
  }

  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
  
  if (server.type !== 'http' && !isTauri) {
    logMcp(server.name, 'IN', 'Desktop environment required for stdio transport.');
    return [];
  }

  const connState: {
    config: McpServerConfig;
    status: 'connected' | 'connecting' | 'error' | 'disabled';
    toolsCount: number;
    pendingRequests: Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>;
    nextId: number;
    stdoutUnlisten?: () => void;
    stderrUnlisten?: () => void;
    sseSource?: EventSource;
  } = {
    config: server,
    status: 'connecting' as const,
    toolsCount: 0,
    pendingRequests: new Map(),
    nextId: 1
  };
  activeConnections.set(server.name, connState);

  try {
    if (server.type === 'http') {
      // HTTP/SSE Connection Setup
      const sseUrl = new URL('/sse', server.url || '').toString();
      logMcp(server.name, 'OUT', `Connecting HTTP SSE to URL: ${sseUrl}`);
      
      const sse = new EventSource(sseUrl);
      connState.sseSource = sse;

      sse.onmessage = (event) => {
        logMcp(server.name, 'IN', `SSE Message received: ${event.data}`);
        try {
          const res = JSON.parse(event.data);
          handleIncomingRpc(server.name, res);
        } catch (e) {
          logMcp(server.name, 'IN', `Failed to parse RPC: ${e}`);
        }
      };

      sse.onerror = (e) => {
        logMcp(server.name, 'IN', 'SSE connection error occurred.');
        connState.status = 'error';
      };

      // Wait briefly for handshake
      await new Promise(r => setTimeout(r, 1000));
    } else {
      // Stdio Connection Setup (Desktop Tauri processes)
      logMcp(server.name, 'OUT', `Spawning process: ${server.command} with args: ${server.args.join(' ')}`);
      
      await invoke('mcp_spawn', {
        name: server.name,
        cmd: server.command,
        args: server.args,
        env: server.env || {}
      });

      let buffer = '';
      const stdoutUnlisten = await listen<string>(`mcp-stdout-${server.name}`, (event) => {
        buffer += event.payload;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            logMcp(server.name, 'IN', trimmed);
            try {
              const parsed = JSON.parse(trimmed);
              handleIncomingRpc(server.name, parsed);
            } catch (err) {
              logMcp(server.name, 'IN', `Stdout line parse error: ${err}`);
            }
          }
        }
      });

      const stderrUnlisten = await listen<string>(`mcp-stderr-${server.name}`, (event) => {
        logMcp(server.name, 'IN', `[STDERR] ${event.payload}`);
      });

      connState.stdoutUnlisten = stdoutUnlisten;
      connState.stderrUnlisten = stderrUnlisten;
    }

    // Initialize request
    const initResult = await sendRpcRequest(server.name, 'initialize', {
      protocolVersion: '2025-03-26',
      clientInfo: { name: 'vega', version: '0.1' },
      capabilities: {}
    });

    logMcp(server.name, 'IN', `Initialized response: ${JSON.stringify(initResult)}`);
    sendRpcNotification(server.name, 'notifications/initialized', {});

    // List tools
    const toolsResult = await sendRpcRequest(server.name, 'tools/list', {});
    const toolsList = (toolsResult.tools || []) as any[];
    logMcp(server.name, 'IN', `Discovered ${toolsList.length} tools.`);

    const formattedTools: McpTool[] = toolsList.map((t: any) => ({
      name: `${server.name}__${t.name}`,
      description: t.description || '',
      inputSchema: t.inputSchema || { type: 'object', properties: {} },
      serverName: server.name
    }));

    loadedMcpTools = loadedMcpTools.filter((t) => t.serverName !== server.name);
    loadedMcpTools.push(...formattedTools);

    connState.status = 'connected';
    connState.toolsCount = formattedTools.length;

    return formattedTools;
  } catch (err: any) {
    logMcp(server.name, 'IN', `Handshake failed: ${err.message || err}`);
    connState.status = 'error';
    return [];
  }
}

function handleIncomingRpc(serverName: string, data: any) {
  const conn = activeConnections.get(serverName);
  if (!conn) return;

  if (data.id !== undefined && (data.result !== undefined || data.error !== undefined)) {
    // Response handler
    const req = conn.pendingRequests.get(data.id);
    if (req) {
      clearTimeout(req.timer);
      conn.pendingRequests.delete(data.id);
      if (data.error) {
        req.reject(new Error(data.error.message || 'RPC Error'));
      } else {
        req.resolve(data.result);
      }
    }
  } else if (data.method === 'notifications/tools/list_changed') {
    // Trigger dynamic reload
    logMcp(serverName, 'IN', 'Received tools list changed notification, re-querying...');
    connectMcpServer(conn.config).catch(() => {});
  }
}

async function sendRpcRequest(serverName: string, method: string, params: any): Promise<any> {
  const conn = activeConnections.get(serverName);
  if (!conn) throw new Error(`Server ${serverName} is not connected`);

  const id = conn.nextId++;
  const payload: JsonRpcRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id
  };

  const msg = JSON.stringify(payload);
  logMcp(serverName, 'OUT', msg);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      conn.pendingRequests.delete(id);
      reject(new Error(`MCP RPC Request Timeout (30s) for method ${method}`));
    }, 30000);

    conn.pendingRequests.set(id, { resolve, reject, timer });

    if (conn.config.type === 'http') {
      const postUrl = new URL('/message', conn.config.url || '').toString();
      fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: msg
      }).catch(err => {
        logMcp(serverName, 'IN', `POST failed: ${err}`);
      });
    } else {
      invoke('mcp_send', { name: serverName, message: msg }).catch(err => {
        logMcp(serverName, 'IN', `Stdin send failed: ${err}`);
      });
    }
  });
}

function sendRpcNotification(serverName: string, method: string, params: any) {
  const conn = activeConnections.get(serverName);
  if (!conn) return;

  const payload = {
    jsonrpc: '2.0',
    method,
    params
  };

  const msg = JSON.stringify(payload);
  logMcp(serverName, 'OUT', msg);

  if (conn.config.type === 'http') {
    const postUrl = new URL('/message', conn.config.url || '').toString();
    fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: msg
    }).catch(() => {});
  } else {
    invoke('mcp_send', { name: serverName, message: msg }).catch(() => {});
  }
}

export async function executeMcpTool(toolName: string, args: any): Promise<string> {
  const idx = toolName.indexOf('__');
  if (idx === -1) {
    return `Error: invalid tool name format ${toolName}`;
  }
  const serverName = toolName.substring(0, idx);
  const realToolName = toolName.substring(idx + 2);

  try {
    const result = await sendRpcRequest(serverName, 'tools/call', {
      name: realToolName,
      arguments: args
    });

    if (result && result.content) {
      return (result.content as any[])
        .map(c => {
          if (c.type === 'text') return c.text;
          return `[Non-text content: ${c.type}]`;
        })
        .join('\n');
    }
    return JSON.stringify(result);
  } catch (err: any) {
    return `Error executing tool ${realToolName} on server ${serverName}: ${err.message || err}`;
  }
}
