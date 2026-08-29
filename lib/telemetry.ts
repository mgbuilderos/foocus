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

// ────────────────────────────────────────────────────────────────────────────
// Shape validation
//
// `localStorage` is user- (and extension-) writable. `JSON.parse` succeeding says
// nothing about the value being the array of records this module expects: setting
// `foocus-telemetry` to `"123"` used to make `getSessions()` return the number 123,
// so `getStats()`'s `.filter` threw and /admin white-screened (there is no
// app/error.tsx). Everything read back is validated; junk is discarded, not thrown.
// ────────────────────────────────────────────────────────────────────────────

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

function sanitizeTask(raw: unknown): TelemetryTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const task = raw as Record<string, unknown>;
  return {
    title: typeof task.title === 'string' ? task.title : '',
    durationSec: isFiniteNumber(task.durationSec) ? Math.max(0, task.durationSec) : 0,
    completed: task.completed === true,
  };
}

function sanitizeSession(raw: unknown): SprintSession | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const session = raw as Record<string, unknown>;

  // A record without a usable identity, timestamp, duration or status cannot be
  // rendered or aggregated — drop it rather than let it poison every metric.
  if (!isNonEmptyString(session.id)) return null;
  if (!isIsoTimestamp(session.completedAt)) return null;
  if (!isFiniteNumber(session.totalDurationSec)) return null;
  if (session.status !== 'completed' && session.status !== 'abandoned') return null;

  const tasks = Array.isArray(session.tasks)
    ? session.tasks
        .map(sanitizeTask)
        .filter((task): task is TelemetryTask => task !== null)
    : [];

  return {
    id: session.id,
    startedAt: isIsoTimestamp(session.startedAt) ? session.startedAt : session.completedAt,
    completedAt: session.completedAt,
    totalDurationSec: Math.max(0, session.totalDurationSec),
    tasks,
    status: session.status,
  };
}

function getSessions(): SprintSession[] {
  if (typeof window === 'undefined') return [];

  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  // `JSON.parse` happily returns numbers, strings, objects and null.
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map(sanitizeSession)
    .filter((session): session is SprintSession => session !== null);
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
  const candidate = {
    ...session,
    id: Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8),
  };
  // Never write a record that our own reader would have to discard.
  const newSession = sanitizeSession(candidate);
  if (!newSession) return;
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
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Safari private mode / disabled site data — must not throw out of the
    // "Yes, Delete" click handler into an app with no error boundary.
  }
}
