export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface RunningModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  expires_at: string;
  size_vram: number;
}

export interface ModelPreset {
  id: string;
  name: string;
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  repeat_penalty: number;
  seed?: number;
  system_prompt: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  model_used?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  model: string;
  preset_id?: string;
  pinned: boolean;
  system_prompt?: string;
}

export interface OllamaSettings {
  baseUrl: string;
  keepAlive: string; // e.g., '5m', '1h', '-1'
  defaultModel: string;
}
