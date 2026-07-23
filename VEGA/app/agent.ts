import { Command } from '@tauri-apps/plugin-shell';
// Note: We will implement full mock tools for browser environments, and execute Tauri commands if running in native environment.

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export const BUILTIN_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from local workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative path to the file.' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file with specific contents.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Target path where file is saved.' },
        content: { type: 'string', description: 'Content to write to the file.' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_dir',
    description: 'List files and directories inside a specific folder path.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Target folder path.' }
      },
      required: ['path']
    }
  },
  {
    name: 'run_shell',
    description: 'Run a terminal shell command locally and capture output.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The exact command line string to run.' }
      },
      required: ['command']
    }
  },
  {
    name: 'web_fetch',
    description: 'Fetch the HTML content of a URL and convert it to markdown.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The absolute URL target.' }
      },
      required: ['url']
    }
  }
];

// Local execution helper functions
export async function executeToolLocally(
  name: string,
  args: Record<string, any>,
  workspacePath: string,
  safetyLevel: 'yolo' | 'ask_dangerous' | 'ask_always'
): Promise<string> {
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

  switch (name) {
    case 'read_file': {
      const targetPath = args.path.startsWith('/') || args.path.includes(':') 
        ? args.path 
        : `${workspacePath}/${args.path}`;
      if (isTauri) {
        try {
          const { readTextFile } = await import('@tauri-apps/plugin-fs');
          const data = await readTextFile(targetPath);
          return data;
        } catch (e: any) {
          return `Error reading file at ${targetPath}: ${e.message || e}`;
        }
      }
      return `Error: file/shell tools require the desktop app. Run 'npm run tauri dev'.`;
    }
    case 'write_file': {
      const targetPath = args.path.startsWith('/') || args.path.includes(':') 
        ? args.path 
        : `${workspacePath}/${args.path}`;
      if (isTauri) {
        try {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(targetPath, args.content);
          return `File written successfully to ${targetPath}`;
        } catch (e: any) {
          return `Error writing file at ${targetPath}: ${e.message || e}`;
        }
      }
      return `Error: file/shell tools require the desktop app. Run 'npm run tauri dev'.`;
    }
    case 'list_dir': {
      const targetPath = args.path.startsWith('/') || args.path.includes(':') 
        ? args.path 
        : `${workspacePath}/${args.path}`;
      if (isTauri) {
        try {
          const { readDir } = await import('@tauri-apps/plugin-fs');
          const entries = await readDir(targetPath);
          const formatted = entries.map(entry => {
            const typeStr = entry.isDirectory ? '[DIR]' : '[FILE]';
            return `${typeStr} ${entry.name}`;
          }).join('\n');
          return formatted || '(directory is empty)';
        } catch (e: any) {
          return `Error listing directory at ${targetPath}: ${e.message || e}`;
        }
      }
      return `Error: file/shell tools require the desktop app. Run 'npm run tauri dev'.`;
    }
    case 'run_shell': {
      if (isTauri) {
        try {
          // Standardise executing shell parameters via CMD in Windows
          const cmdInstance = Command.create('cmd', ['/c', args.command]);
          const output = await cmdInstance.execute();
          if (output.code === 0) {
            return output.stdout;
          } else {
            return `Shell execution failed with exit code ${output.code}.\nStderr: ${output.stderr}\nStdout: ${output.stdout}`;
          }
        } catch (e: any) {
          return `Shell execution error: ${e.message || e}`;
        }
      }
      return `Error: file/shell tools require the desktop app. Run 'npm run tauri dev'.`;
    }
    case 'web_fetch': {
      try {
        const response = await fetch(args.url);
        const text = await response.text();
        return `[web_fetch] Fetched content from ${args.url}:\n${text.slice(0, 1000)}...`;
      } catch (e: any) {
        return `[web_fetch] Failed fetching page: ${e.message}`;
      }
    }
    default:
      return `Tool ${name} is not recognized.`;
  }
}
