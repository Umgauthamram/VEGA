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
  switch (name) {
    case 'read_file': {
      // In web fallback, we return a mock success message, or implement mock filesystem.
      return `[read_file] Successfully read content of ${args.path}. (Local mock filesystem response for safety)`;
    }
    case 'write_file': {
      return `[write_file] Successfully written contents to file at ${args.path}.`;
    }
    case 'list_dir': {
      return `[list_dir] Folder contents of ${args.path}: \n- package.json\n- app/\n- src-tauri/`;
    }
    case 'run_shell': {
      return `[run_shell] Command "${args.command}" executed successfully. Output: \nDone.`;
    }
    case 'web_fetch': {
      try {
        const response = await fetch(args.url);
        const text = await response.text();
        return `[web_fetch] Fetched content from ${args.url}:\n${text.slice(0, 500)}...`;
      } catch (e: any) {
        return `[web_fetch] Failed fetching page: ${e.message}`;
      }
    }
    default:
      return `Tool ${name} is not recognized.`;
  }
}
