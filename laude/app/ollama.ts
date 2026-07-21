import { OllamaModel, RunningModel, ModelPreset, ChatMessage } from './types';

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async checkHealth(): Promise<{ running: boolean; version?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, { method: 'GET' });
      if (!res.ok) return { running: false };
      const data = await res.json();
      return { running: true, version: data.version };
    } catch {
      return { running: false };
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return data.models || [];
    } catch (e) {
      console.error('Failed to list models:', e);
      return [];
    }
  }

  async listRunningModels(): Promise<RunningModel[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ps`, { method: 'GET' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    } catch {
      return [];
    }
  }

  async pullModel(modelName: string, onProgress?: (status: string, completed?: number, total?: number) => void): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!res.ok || !res.body) throw new Error(`Failed to pull model: ${res.statusText}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (onProgress) {
            onProgress(json.status, json.completed, json.total);
          }
        } catch {
          // parse line chunk
        }
      }
    }
  }

  async deleteModel(modelName: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async streamChat(
    model: string,
    messages: { role: string; content: string }[],
    options?: Partial<ModelPreset>,
    keepAlive?: string,
    onChunk?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const body: any = {
      model,
      messages,
      stream: true,
    };

    if (keepAlive) {
      body.keep_alive = keepAlive;
    }

    if (options) {
      body.options = {
        temperature: options.temperature,
        top_p: options.top_p,
        top_k: options.top_k,
        num_ctx: options.num_ctx,
        repeat_penalty: options.repeat_penalty,
        seed: options.seed,
      };
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`Ollama Chat Error ${res.status}: ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            fullText += json.message.content;
            if (onChunk) onChunk(json.message.content);
          }
        } catch {
          // JSON fragment
        }
      }
    }

    return fullText;
  }
}

export const ollamaClient = new OllamaClient();
