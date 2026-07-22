import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export interface SavedSchedule {
  id: string;
  name: string;
  cronExpression: string; // e.g. "0 9 * * *"
  prompt: string;
  model: string;
  mode: 'chat' | 'agent';
  lastRunStatus?: 'success' | 'failed';
  lastRunTime?: number;
}

// In-memory schedules list
let schedulesRegistry: SavedSchedule[] = [];

export function getSchedules(): SavedSchedule[] {
  return schedulesRegistry;
}

export function saveSchedule(sched: SavedSchedule) {
  const index = schedulesRegistry.findIndex((s) => s.id === sched.id);
  if (index >= 0) {
    schedulesRegistry[index] = sched;
  } else {
    schedulesRegistry.push(sched);
  }
}

export function deleteSchedule(id: string) {
  schedulesRegistry = schedulesRegistry.filter((s) => s.id !== id);
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
