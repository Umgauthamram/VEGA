import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Cron } from 'croner';
import { saveScheduleDb, loadSchedulesDb, deleteScheduleDb, saveConversation, saveMessage } from './storage';
import { ollamaClient } from './ollama';
import { Conversation, ChatMessage } from './types';

export interface SavedSchedule {
  id: string;
  name: string;
  cronExpression: string; // e.g. "0 9 * * *"
  prompt: string;
  model: string;
  mode: 'chat' | 'agent';
  enabled: boolean;
  lastRunStatus?: 'success' | 'failed';
  lastRunTime?: number;
  lastConversationId?: string;
}

// In-memory schedules list cache
let schedulesRegistry: SavedSchedule[] = [];
let schedulerTimer: NodeJS.Timeout | null = null;
let activeCronJobs: Map<string, Cron> = new Map();

export async function initScheduler(
  onNewConversationCreated?: (conv: Conversation, msgs: ChatMessage[]) => void
) {
  // Load schedules from database
  schedulesRegistry = await loadSchedulesDb();

  // Initialize cron schedules
  syncCronJobs(onNewConversationCreated);
}

export function getSchedules(): SavedSchedule[] {
  return schedulesRegistry;
}

export async function saveSchedule(sched: SavedSchedule, onNewConversationCreated?: (conv: Conversation, msgs: ChatMessage[]) => void) {
  const index = schedulesRegistry.findIndex((s) => s.id === sched.id);
  if (index >= 0) {
    schedulesRegistry[index] = sched;
  } else {
    schedulesRegistry.push(sched);
  }
  await saveScheduleDb(sched);
  syncCronJobs(onNewConversationCreated);
}

export async function deleteSchedule(id: string, onNewConversationCreated?: (conv: Conversation, msgs: ChatMessage[]) => void) {
  schedulesRegistry = schedulesRegistry.filter((s) => s.id !== id);
  await deleteScheduleDb(id);
  syncCronJobs(onNewConversationCreated);
}

function syncCronJobs(onNewConversationCreated?: (conv: Conversation, msgs: ChatMessage[]) => void) {
  // Clear old cron jobs
  activeCronJobs.forEach(job => job.stop());
  activeCronJobs.clear();

  schedulesRegistry.forEach(sched => {
    if (!sched.enabled) return;

    try {
      const job = new Cron(sched.cronExpression, async () => {
        await executeScheduleTask(sched, onNewConversationCreated);
      });
      activeCronJobs.set(sched.id, job);
    } catch (e) {
      console.error(`Invalid cron pattern for schedule ${sched.name}:`, e);
    }
  });
}

export async function executeScheduleTask(
  sched: SavedSchedule,
  onNewConversationCreated?: (conv: Conversation, msgs: ChatMessage[]) => void
) {
  const timestamp = Date.now();
  const dateStr = new Date(timestamp).toLocaleDateString();
  const convId = 'conv_' + timestamp;

  const newConv: Conversation = {
    id: convId,
    title: `[Scheduled] ${sched.name} — ${dateStr}`,
    created_at: timestamp,
    updated_at: timestamp,
    model: sched.model,
    pinned: false,
  };

  const userMsg: ChatMessage = {
    id: 'msg_' + timestamp,
    conversation_id: convId,
    role: 'user',
    content: sched.prompt,
    timestamp: timestamp,
  };

  try {
    // Save scheduled conversation headers
    await saveConversation(newConv);
    await saveMessage(userMsg);

    let assistantReply = '';
    const assistantMsgId = 'msg_' + (timestamp + 1);

    if (sched.mode === 'chat') {
      // Standard chat execution
      assistantReply = await ollamaClient.chat(sched.model, [
        { role: 'system', content: 'You are running as an automated scheduled task assistant.' },
        { role: 'user', content: sched.prompt }
      ]);
    } else {
      // Agent execution fallback - run standard chat but log agent context message
      assistantReply = `[Agent Scheduled Execution]\nRunning prompt: "${sched.prompt}"\n\n*(Note: automated runs skip destructive tool execution approvals)*\n\n`;
      const reply = await ollamaClient.chat(sched.model, [
        { role: 'system', content: 'You are running in scheduled agent automated mode.' },
        { role: 'user', content: sched.prompt }
      ]);
      assistantReply += reply;
    }

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      conversation_id: convId,
      role: 'assistant',
      content: assistantReply,
      timestamp: Date.now(),
      model_used: sched.model,
    };
    await saveMessage(assistantMsg);

    sched.lastRunStatus = 'success';
    sched.lastRunTime = Date.now();
    sched.lastConversationId = convId;
    await saveScheduleDb(sched);

    if (onNewConversationCreated) {
      onNewConversationCreated(newConv, [userMsg, assistantMsg]);
    }

    await triggerNotification(
      `Laude: ${sched.name} Completed`,
      `Scheduled run executed successfully using ${sched.model}.`
    );
  } catch (err: any) {
    sched.lastRunStatus = 'failed';
    sched.lastRunTime = Date.now();
    await saveScheduleDb(sched);

    await triggerNotification(
      `Laude: ${sched.name} Failed`,
      `Error: ${err.message || err}`
    );
  }
}

// Trigger OS level system alert
export async function triggerNotification(title: string, body: string) {
  try {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      sendNotification({ title, body });
    }
  } catch (e) {
    console.warn('System notifications plugin not available:', e);
  }
}
