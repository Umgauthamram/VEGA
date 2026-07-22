import { OllamaModel, RunningModel, ModelPreset } from './types';

export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  type: 'ollama' | 'openai-compatible';
}

export class LLMClient {
  private activeProvider: LLMProvider;

  constructor(provider?: LLMProvider) {
    this.activeProvider = provider || {
      name: 'Ollama (Default)',
      baseUrl: 'http://localhost:11434',
      type: 'ollama'
    };
  }

  setProvider(provider: LLMProvider) {
    this.activeProvider = provider;
  }

  setBaseUrl(url: string) {
    this.activeProvider.baseUrl = url;
  }

  getProvider() {
    return this.activeProvider;
  }

  async checkHealth(): Promise<{ running: boolean; version?: string }> {
    try {
      if (this.activeProvider.type === 'ollama') {
        const res = await fetch(`${this.activeProvider.baseUrl}/api/version`);
        if (res.ok) {
          const data = await res.json();
          return { running: true, version: data.version };
        }
      } else {
        // OpenAI models compatibility endpoint health check
        const res = await fetch(`${this.activeProvider.baseUrl}/v1/models`, {
          headers: this.activeProvider.apiKey ? { 'Authorization': `Bearer ${this.activeProvider.apiKey}` } : {}
        });
        if (res.ok) return { running: true, version: 'OpenAI-Compatible' };
      }
      return { running: false };
    } catch {
      return { running: false };
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      if (this.activeProvider.type === 'ollama') {
        const res = await fetch(`${this.activeProvider.baseUrl}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          return data.models || [];
        }
      } else {
        const res = await fetch(`${this.activeProvider.baseUrl}/v1/models`, {
          headers: this.activeProvider.apiKey ? { 'Authorization': `Bearer ${this.activeProvider.apiKey}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          return (data.data || []).map((m: any) => ({
            name: m.id,
            size: 0,
            details: { parameter_size: 'unknown', family: 'OpenAI' }
          }));
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  async pullModel(modelName: string, onProgress?: (status: string, completed?: number, total?: number) => void): Promise<void> {
    if (this.activeProvider.type !== 'ollama') return;
    const res = await fetch(`${this.activeProvider.baseUrl}/api/pull`, {
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
    if (this.activeProvider.type !== 'ollama') return true;
    try {
      const res = await fetch(`${this.activeProvider.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listRunningModels(): Promise<RunningModel[]> {
    if (this.activeProvider.type !== 'ollama') return [];
    try {
      const res = await fetch(`${this.activeProvider.baseUrl}/api/ps`);
      if (res.ok) {
        const data = await res.json();
        return data.models || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  async streamChat(
    model: string,
    messages: { role: string; content: string; tool_calls?: any[] }[],
    options?: Partial<ModelPreset>,
    keepAlive?: string,
    onChunk?: (text: string) => void,
    signal?: AbortSignal,
    tools?: any[]
  ): Promise<{ content: string; tool_calls?: any[] }> {
    if (this.activeProvider.type === 'ollama') {
      const body: any = {
        model,
        messages,
        stream: !(tools && tools.length > 0)
      };
      if (tools && tools.length > 0) body.tools = tools;
      if (keepAlive) body.keep_alive = keepAlive;
      if (options) {
        body.options = {
          temperature: options.temperature,
          top_p: options.top_p,
          top_k: options.top_k,
          num_ctx: options.num_ctx,
          repeat_penalty: options.repeat_penalty
        };
      }
      const res = await fetch(`${this.activeProvider.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal
      });

      if (!res.ok) throw new Error(`Ollama error ${res.status}`);
      if (!body.stream) {
        const data = await res.json();
        return {
          content: data.message?.content || '',
          tool_calls: data.message?.tool_calls || undefined
        };
      }

      if (!res.body) throw new Error('Response body is null');
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
          } catch {}
        }
      }
      return { content: fullText };
    } else {
      // OpenAI stream endpoint
      const body: any = {
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.num_ctx ?? 2048
      };
      const headers: any = { 'Content-Type': 'application/json' };
      if (this.activeProvider.apiKey) {
        headers['Authorization'] = `Bearer ${this.activeProvider.apiKey}`;
      }
      const res = await fetch(`${this.activeProvider.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });

      if (!res.ok) throw new Error(`OpenAI-compatible error ${res.status}`);
      if (!res.body) throw new Error('Response body is null');

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
          const cleaned = line.trim().replace(/^data: /, '');
          if (!cleaned || cleaned === '[DONE]') continue;
          try {
            const json = JSON.parse(cleaned);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              if (onChunk) onChunk(delta);
            }
          } catch {}
        }
      }
      return { content: fullText };
    }
  }

  async generateEmbedding(model: string, prompt: string): Promise<number[]> {
    try {
      if (this.activeProvider.type === 'ollama') {
        const res = await fetch(`${this.activeProvider.baseUrl}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, input: prompt })
        });
        if (res.ok) {
          const data = await res.json();
          return data.embeddings?.[0] || data.embedding || [];
        }
      } else {
        const headers: any = { 'Content-Type': 'application/json' };
        if (this.activeProvider.apiKey) headers['Authorization'] = `Bearer ${this.activeProvider.apiKey}`;
        const res = await fetch(`${this.activeProvider.baseUrl}/v1/embeddings`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model, input: prompt })
        });
        if (res.ok) {
          const data = await res.json();
          return data.data?.[0]?.embedding || [];
        }
      }
      return new Array(768).fill(0);
    } catch {
      return new Array(768).fill(0);
    }
  }
}

export const ollamaClient = new LLMClient();
