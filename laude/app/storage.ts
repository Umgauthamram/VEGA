import Database from '@tauri-apps/plugin-sql';
import { Conversation, ChatMessage, ModelPreset, Project, ProjectFile, DocumentChunk } from './types';

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
  // Core Tables
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

  // Projects Tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      size INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL, -- JSON stringified array
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES project_files (id) ON DELETE CASCADE
    );
  `);

  // User Memory Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS memory (
      key TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

// Memory fallbacks
const memoryConversations: Map<string, Conversation> = new Map();
const memoryMessages: Map<string, ChatMessage[]> = new Map();
const memoryPresets: Map<string, ModelPreset> = new Map();
const memoryProjects: Map<string, Project> = new Map();
const memoryProjectFiles: Map<string, ProjectFile[]> = new Map();
const memoryChunks: Map<string, DocumentChunk[]> = new Map();
let memoryUserMemory: string = '';

// Conversations
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

// Messages
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

// Presets
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

// Projects & RAG Storage
export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(
      `INSERT INTO projects (id, name, system_prompt, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, system_prompt=excluded.system_prompt`,
      [project.id, project.name, project.system_prompt, project.created_at]
    );
  } else {
    memoryProjects.set(project.id, project);
  }
}

export async function loadProjects(): Promise<Project[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select<any[]>(`SELECT * FROM projects ORDER BY created_at DESC`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      system_prompt: r.system_prompt,
      created_at: r.created_at,
    }));
  } else {
    return Array.from(memoryProjects.values()).sort((a, b) => b.created_at - a.created_at);
  }
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(`DELETE FROM document_chunks WHERE project_id = $1`, [id]);
    await db.execute(`DELETE FROM project_files WHERE project_id = $1`, [id]);
    await db.execute(`DELETE FROM projects WHERE id = $1`, [id]);
  } else {
    memoryProjects.delete(id);
    memoryProjectFiles.delete(id);
    memoryChunks.delete(id);
  }
}

export async function saveProjectFile(file: ProjectFile): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(
      `INSERT INTO project_files (id, project_id, name, content, size)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET content=excluded.content, size=excluded.size`,
      [file.id, file.project_id, file.name, file.content, file.size]
    );
  } else {
    const list = memoryProjectFiles.get(file.project_id) || [];
    const idx = list.findIndex((f) => f.id === file.id);
    if (idx >= 0) list[idx] = file;
    else list.push(file);
    memoryProjectFiles.set(file.project_id, list);
  }
}

export async function loadProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select<any[]>(`SELECT * FROM project_files WHERE project_id = $1`, [projectId]);
    return rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      name: r.name,
      content: r.content,
      size: r.size,
    }));
  } else {
    return memoryProjectFiles.get(projectId) || [];
  }
}

export async function saveDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
  const db = await getDb();
  if (db) {
    for (const chunk of chunks) {
      await db.execute(
        `INSERT INTO document_chunks (id, project_id, file_id, content, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [chunk.id, chunk.project_id, chunk.file_id, chunk.content, JSON.stringify(chunk.embedding)]
      );
    }
  } else {
    if (chunks.length > 0) {
      const pId = chunks[0].project_id;
      const list = memoryChunks.get(pId) || [];
      list.push(...chunks);
      memoryChunks.set(pId, list);
    }
  }
}

export async function loadDocumentChunks(projectId: string): Promise<DocumentChunk[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select<any[]>(`SELECT * FROM document_chunks WHERE project_id = $1`, [projectId]);
    return rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      file_id: r.file_id,
      content: r.content,
      embedding: JSON.parse(r.embedding),
    }));
  } else {
    return memoryChunks.get(projectId) || [];
  }
}

// Memory
export async function saveUserMemory(content: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(
      `INSERT INTO memory (key, content, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT(key) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at`,
      ['user_memory', content, Date.now()]
    );
  } else {
    memoryUserMemory = content;
  }
}

export async function loadUserMemory(): Promise<string> {
  const db = await getDb();
  if (db) {
    const rows = await db.select<any[]>(`SELECT content FROM memory WHERE key = $1`, ['user_memory']);
    return rows.length > 0 ? rows[0].content : '';
  } else {
    return memoryUserMemory;
  }
}
