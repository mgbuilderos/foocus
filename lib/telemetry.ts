// Telemetry Service — persists sprint data to localStorage

export interface TelemetryTask {
  title: string;
  durationSec: number;
  completed: boolean;
}

export interface SprintSession {
  id: string;
  startedAt: string;       // ISO timestamp
  completedAt: string;      // ISO timestamp
  totalDurationSec: number;
  tasks: TelemetryTask[];
  status: 'completed' | 'abandoned';
}

export interface TelemetryStats {
  totalSprints: number;
  completedSprints: number;
  abandonedSprints: number;
  totalFocusSeconds: number;
  totalTasksCompleted: number;
  totalTasksCreated: number;
  averageSprintLengthSec: number;
  completionRate: number;    // 0-100
}

const STORAGE_KEY = 'foocus-telemetry';

function getSessions(): SprintSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSessions(sessions: SprintSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function saveSession(session: Omit<SprintSession, 'id'>): void {
  const sessions = getSessions();
  const newSession: SprintSession = {
    ...session,
    id: Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8),
  };
  sessions.push(newSession);
  setSessions(sessions);
}

export function getAllSessions(): SprintSession[] {
  return getSessions().sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}

export function getStats(): TelemetryStats {
  const sessions = getSessions();
  const completed = sessions.filter(s => s.status === 'completed');
  const abandoned = sessions.filter(s => s.status === 'abandoned');
  const totalFocusSeconds = sessions.reduce((sum, s) => sum + s.totalDurationSec, 0);
  const totalTasksCreated = sessions.reduce((sum, s) => sum + s.tasks.length, 0);
  const totalTasksCompleted = sessions.reduce(
    (sum, s) => sum + s.tasks.filter(t => t.completed).length,
    0
  );

  return {
    totalSprints: sessions.length,
    completedSprints: completed.length,
    abandonedSprints: abandoned.length,
    totalFocusSeconds,
    totalTasksCompleted,
    totalTasksCreated,
    averageSprintLengthSec: sessions.length > 0 ? Math.round(totalFocusSeconds / sessions.length) : 0,
    completionRate: sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0,
  };
}

export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
