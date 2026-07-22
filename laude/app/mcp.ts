import { executeToolLocally } from './agent';

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

// In-memory registry of MCP Servers and loaded tools
let registeredServers: McpServerConfig[] = [];
let loadedMcpTools: McpTool[] = [];

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
}

export function deleteMcpServer(name: string) {
  registeredServers = registeredServers.filter((s) => s.name !== name);
  loadedMcpTools = loadedMcpTools.filter((t) => t.serverName !== name);
}

export function getLoadedMcpTools(): McpTool[] {
  return loadedMcpTools.filter((t) => {
    const s = registeredServers.find((srv) => srv.name === t.serverName);
    return s ? s.enabled : false;
  });
}

// Mock MCP client handshake and stdio protocol connection simulator
export async function connectMcpServer(server: McpServerConfig): Promise<McpTool[]> {
  if (!server.enabled) return [];
  
  // Simulated stdio handshake response for tools registry
  const mockTools: McpTool[] = [
    {
      name: `${server.name}__search_repositories`,
      description: 'Search public or private repositories on Github.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      },
      serverName: server.name
    },
    {
      name: `${server.name}__create_issue`,
      description: 'Create a new issue inside a repository.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' }
        },
        required: ['title']
      },
      serverName: server.name
    }
  ];

  // Add to active registry
  loadedMcpTools = loadedMcpTools.filter((t) => t.serverName !== server.name);
  loadedMcpTools.push(...mockTools);
  return mockTools;
}

export async function executeMcpTool(toolName: string, args: any): Promise<string> {
  return `[MCP Execute] Mock response from MCP tool "${toolName}" with arguments: ${JSON.stringify(args)}. Done.`;
}
