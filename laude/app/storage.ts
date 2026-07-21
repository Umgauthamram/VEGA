import Database from '@tauri-apps/plugin-sql';
import { Conversation, ChatMessage, ModelPreset } from './types';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database | null> {
  if (typeof window === 'undefined') return null;
  if (!dbInstance) {
    try {
      dbInstance = await Database.load('sqlite:laude.db');
      await initDbSchema(dbInstance);
    } catch (e) {
      console.warn('Tauri SQL plugin not available or failed to load, using in-memory fallback:', e);
      return null;
    }
  }
  return dbInstance;
}

async function initDbSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      model TEXT NOT NULL,
      preset_id TEXT,
      pinned INTEGER DEFAULT 0,
      system_prompt TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      model_used TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      temperature REAL NOT NULL,
      top_p REAL NOT NULL,
      top_k INTEGER NOT NULL,
      num_ctx INTEGER NOT NULL,
      repeat_penalty REAL NOT NULL,
      seed INTEGER,
      system_prompt TEXT NOT NULL
    );
  `);
}

// Memory fallback storage for browser-only dev testing
const memoryConversations: Map<string, Conversation> = new Map();
const memoryMessages: Map<string, ChatMessage[]> = new Map();
const memoryPresets: Map<string, ModelPreset> = new Map();

export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(
      `INSERT INTO conversations (id, title, created_at, updated_at, model, preset_id, pinned, system_prompt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         updated_at=excluded.updated_at,
         model=excluded.model,
         preset_id=excluded.preset_id,
         pinned=excluded.pinned,
         system_prompt=excluded.system_prompt`,
      [conv.id, conv.title, conv.created_at, conv.updated_at, conv.model, conv.preset_id || null, conv.pinned ? 1 : 0, conv.system_prompt || null]
    );
  } else {
    memoryConversations.set(conv.id, conv);
  }
}

export async function loadConversations(): Promise<Conversation[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select<any[]>(`SELECT * FROM conversations ORDER BY pinned DESC, updated_at DESC`);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      created_at: r.created_at,
      updated_at: r.updated_at,
      model: r.model,
      preset_id: r.preset_id,
      pinned: Boolean(r.pinned),
      system_prompt: r.system_prompt,
    }));
  } else {
    return Array.from(memoryConversations.values()).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated_at - a.updated_at);
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
    await db.execute(`DELETE FROM conversations WHERE id = $1`, [id]);
  } else {
    memoryConversations.delete(id);
    memoryMessages.delete(id);
  }
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(
      `INSERT INTO messages (id, conversation_id, role, content, timestamp, model_used)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET content=excluded.content`,
      [msg.id, msg.conversation_id, msg.role, msg.content, msg.timestamp, msg.model_used || null]
    );
  } else {
    const list = memoryMessages.get(msg.conversation_id) || [];
    const idx = list.findIndex((m) => m.id === msg.id);
    if (idx >= 0) list[idx] = msg;
    else list.push(msg);
    memoryMessages.set(msg.conversation_id, list);
  }
}

export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select<any[]>(`SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC`, [conversationId]);
    return rows.map((r) => ({
      id: r.id,
      conversation_id: r.conversation_id,
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
      model_used: r.model_used,
    }));
  } else {
    return memoryMessages.get(conversationId) || [];
  }
}

export async function savePreset(preset: ModelPreset): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(
      `INSERT INTO presets (id, name, temperature, top_p, top_k, num_ctx, repeat_penalty, seed, system_prompt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, temperature=excluded.temperature, top_p=excluded.top_p,
         top_k=excluded.top_k, num_ctx=excluded.num_ctx, repeat_penalty=excluded.repeat_penalty,
         seed=excluded.seed, system_prompt=excluded.system_prompt`,
      [preset.id, preset.name, preset.temperature, preset.top_p, preset.top_k, preset.num_ctx, preset.repeat_penalty, preset.seed || null, preset.system_prompt]
    );
  } else {
    memoryPresets.set(preset.id, preset);
  }
}

export async function loadPresets(): Promise<ModelPreset[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select<any[]>(`SELECT * FROM presets`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      temperature: r.temperature,
      top_p: r.top_p,
      top_k: r.top_k,
      num_ctx: r.num_ctx,
      repeat_penalty: r.repeat_penalty,
      seed: r.seed,
      system_prompt: r.system_prompt,
    }));
  } else {
    return Array.from(memoryPresets.values());
  }
}
