import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { playTransitionChime, playCompletionPulse, setMuted } from '@/lib/sound';
import { saveSession } from '@/lib/telemetry';

export type SubTask = {
  id: string;
  title: string;
  durationSec: number;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  durationSec: number; // Planned duration in seconds
  completed: boolean;
  subtasks?: SubTask[];
};

export type TimerMode = 'SOLO' | 'TEAM';
export type TimerState = 'IDLE' | 'BREATHING' | 'RUNNING' | 'PAUSED' | 'FINISHED';

/**
 * Visualizer modes. These MUST stay in sync with `ProgressVisualizer`'s own
 * `VisualizerMode` union and with the cycle order rendered in `TimerStage`.
 */
export type VisualizerMode = 'WATCH' | 'SPACE' | 'MOUNTAIN' | 'RACE';
export const VISUALIZER_MODES: VisualizerMode[] = ['WATCH', 'SPACE', 'MOUNTAIN', 'RACE'];

/** Legacy enum values that used to live in this store, mapped onto the real ones. */
const LEGACY_VISUALIZER_MODES: Record<string, VisualizerMode> = {
  CLOCK: 'WATCH',
};

export const PERSIST_NAME = 'plan-and-do-storage';
export const PERSIST_VERSION = 1;

interface TimerStore {
  mode: TimerMode;
  state: TimerState;
  tasks: Task[];
  currentTaskIndex: number;
  currentSubtaskIndex: number;
  endTime: number | null; // The absolute Unix timestamp when the current task should end
  pausedRemainingSec: number | null; // Keeps track of time when paused
  isMuted: boolean;
  isCompactMode: boolean;
  visualizerMode: VisualizerMode;

  /** Wall-clock ms at which the current sprint actually started. Never back-computed. */
  sprintStartedAt: number | null;
  /** True once this sprint has been written to telemetry. Guarantees exactly one row. */
  sessionLogged: boolean;

  // Actions
  toggleMute: () => void;
  toggleCompactMode: () => void;
  cycleVisualizerMode: () => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setMode: (mode: TimerMode) => void;
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  addSubtask: (taskId: string, subtask: Omit<SubTask, 'id'|'completed'>) => void;
  updateTaskDuration: (id: string, durationSec: number) => void;
  reorderTasks: (startIndex: number, endIndex: number) => void;
  removeTask: (id: string) => void;

  startSprint: () => void;
  pauseSprint: () => void;
  resumeSprint: () => void;

  tick: () => void; // Called by worker/component to check if time is up
  finishTaskEarly: (elapsedSec: number) => void; // Triggers time redistribution
  addTimeToCurrentTask: (extraSec: number) => void; // Need more time
  completeCurrentTask: () => void;
  setTasks: (tasks: Task[]) => void;
  resetSprint: () => void;

  // Wizard state
  wizardStep: 'GOAL' | 'SUBTASKS' | 'READY';
  mainGoalTitle: string;
  setWizardStep: (step: 'GOAL' | 'SUBTASKS' | 'READY') => void;
  setMainGoalTitle: (title: string) => void;
  finalizeWizard: (subtasks: Omit<SubTask, 'id' | 'completed'>[]) => void;
}

let breathingTimeout: ReturnType<typeof setTimeout> | null = null;

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ────────────────────────────────────────────────────────────────────────────

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const newId = () => Math.random().toString(36).substring(2, 9);

/** Clamp `i` into [0, len-1]; returns 0 when there is nothing to index. */
const clampIndex = (i: unknown, len: number): number => {
  if (len <= 0) return 0;
  const n = isFiniteNumber(i) ? Math.floor(i) : 0;
  return Math.min(Math.max(0, n), len - 1);
};

type SegmentCursor = {
  tasks: Task[];
  currentTaskIndex: number;
  currentSubtaskIndex: number;
};

/**
 * A "segment" is one countdown: a subtask if the current task has any,
 * otherwise the task itself. Used to bound the wall-clock catch-up loop.
 */
const totalSegmentCount = (tasks: Task[]): number =>
  tasks.reduce((n, t) => n + (t.subtasks && t.subtasks.length > 0 ? t.subtasks.length : 1), 0);

const currentSegmentDurationSec = (s: SegmentCursor): number => {
  const task = s.tasks[s.currentTaskIndex];
  if (!task) return 0;
  if (task.subtasks && task.subtasks.length > 0) {
    const sub = task.subtasks[clampIndex(s.currentSubtaskIndex, task.subtasks.length)];
    return sub ? sub.durationSec : 0;
  }
  return task.durationSec;
};

// ────────────────────────────────────────────────────────────────────────────
// Persisted-state validation
//
// `localStorage` is attacker-writable and survives across schema changes, so
// nothing that comes out of it is trusted. Every field is coerced back into
// its declared shape and every index is bounds-checked against the *sanitized*
// task list, so consumers can never dereference `undefined.durationSec`.
// ────────────────────────────────────────────────────────────────────────────

const sanitizeSubtask = (raw: unknown): SubTask | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newId(),
    title: typeof r.title === 'string' ? r.title : '',
    durationSec: isFiniteNumber(r.durationSec) ? Math.max(0, Math.floor(r.durationSec)) : 0,
    completed: r.completed === true,
  };
};

const sanitizeTask = (raw: unknown): Task | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const subtasks = Array.isArray(r.subtasks)
    ? (r.subtasks.map(sanitizeSubtask).filter((s): s is SubTask => s !== null))
    : undefined;

  // Keep the invariant the rest of the store maintains: a task's duration is the
  // sum of its subtasks when it has any.
  const durationSec = subtasks && subtasks.length > 0
    ? subtasks.reduce((sum, s) => sum + s.durationSec, 0)
    : (isFiniteNumber(r.durationSec) ? Math.max(0, Math.floor(r.durationSec)) : 0);

  const task: Task = {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newId(),
    title: typeof r.title === 'string' ? r.title : '',
    durationSec,
    completed: r.completed === true,
  };
  if (subtasks) task.subtasks = subtasks;
  return task;
};

type PersistedShape = Pick<
  TimerStore,
  | 'mode' | 'state' | 'tasks' | 'currentTaskIndex' | 'currentSubtaskIndex'
  | 'endTime' | 'pausedRemainingSec' | 'isMuted' | 'isCompactMode'
  | 'visualizerMode' | 'wizardStep' | 'mainGoalTitle'
  | 'sprintStartedAt' | 'sessionLogged'
>;

const TIMER_STATES: TimerState[] = ['IDLE', 'BREATHING', 'RUNNING', 'PAUSED', 'FINISHED'];
const WIZARD_STEPS: TimerStore['wizardStep'][] = ['GOAL', 'SUBTASKS', 'READY'];

/** Idempotent. Safe to run on any version of the persisted blob, or on junk. */
export function sanitizePersistedState(raw: unknown): PersistedShape {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const tasks = Array.isArray(r.tasks)
    ? (r.tasks.map(sanitizeTask).filter((t): t is Task => t !== null))
    : [];

  let state: TimerState = TIMER_STATES.indexOf(r.state as TimerState) >= 0
    ? (r.state as TimerState)
    : 'IDLE';
  // A non-IDLE state with no tasks is unrunnable by definition.
  if (tasks.length === 0) state = 'IDLE';

  const currentTaskIndex = clampIndex(r.currentTaskIndex, tasks.length);
  const subCount = tasks[currentTaskIndex]?.subtasks?.length ?? 0;
  const currentSubtaskIndex = clampIndex(r.currentSubtaskIndex, subCount);

  const rawVisualizer = typeof r.visualizerMode === 'string' ? r.visualizerMode : '';
  const visualizerMode: VisualizerMode =
    VISUALIZER_MODES.indexOf(rawVisualizer as VisualizerMode) >= 0
      ? (rawVisualizer as VisualizerMode)
      : (LEGACY_VISUALIZER_MODES[rawVisualizer] ?? 'WATCH');

  const wizardStep = WIZARD_STEPS.indexOf(r.wizardStep as TimerStore['wizardStep']) >= 0
    ? (r.wizardStep as TimerStore['wizardStep'])
    : (tasks.length > 0 ? 'READY' : 'GOAL');

  return {
    mode: r.mode === 'TEAM' ? 'TEAM' : 'SOLO',
    state,
    tasks,
    currentTaskIndex,
    currentSubtaskIndex,
    endTime: isFiniteNumber(r.endTime) ? r.endTime : null,
    pausedRemainingSec:
      isFiniteNumber(r.pausedRemainingSec) && r.pausedRemainingSec >= 0
        ? Math.floor(r.pausedRemainingSec)
        : null,
    isMuted: r.isMuted === true,
    isCompactMode: r.isCompactMode === true,
    visualizerMode,
    wizardStep,
    mainGoalTitle: typeof r.mainGoalTitle === 'string' ? r.mainGoalTitle : '',
    sprintStartedAt: isFiniteNumber(r.sprintStartedAt) ? r.sprintStartedAt : null,
    sessionLogged: r.sessionLogged === true,
  };
}

/**
 * Hydration safety (evolution log, Insight 3) without destroying recoverable work.
 *
 * The original auto-heal called `resetSprint()` for ANY stale non-IDLE state, which
 * (a) wiped the user's whole plan after a pause-and-reload and (b) wrote a phantom
 * telemetry row. The genuine property worth keeping is narrower: a RUNNING sprint
 * must never resume against a long-dead `endTime`. So we park it instead of wiping it.
 *
 * Mutates in place — `persist` calls this with the object it has already `set()`,
 * synchronously, before React renders. Returns true when it changed anything, so the
 * caller can re-persist (zustand writes storage BEFORE this callback runs).
 */
export function healRehydratedState(state: PersistedShape): boolean {
  const now = Date.now();
  const before = `${state.state}|${state.endTime}|${state.pausedRemainingSec}|${state.wizardStep}`;
  const changed = () => before !== `${state.state}|${state.endTime}|${state.pausedRemainingSec}|${state.wizardStep}`;

  if (state.tasks.length === 0) {
    state.state = 'IDLE';
    state.endTime = null;
    state.pausedRemainingSec = null;
    return changed();
  }

  switch (state.state) {
    case 'RUNNING': {
      if (state.endTime === null || state.endTime <= now) {
        // The page was gone while the clock ran out. We cannot know how much of the
        // current segment the user actually spent, so we neither auto-resume against
        // the dead deadline nor silently mark work complete: park the sprint as a
        // recoverable PAUSED session holding the current segment. No telemetry.
        state.state = 'PAUSED';
        state.endTime = null;
        state.pausedRemainingSec = currentSegmentDurationSec(state);
      }
      break;
    }
    case 'BREATHING': {
      // The 2s breathing timeout does not survive a reload; left alone this state
      // hangs on "Breathe..." forever. Drop back to the ready screen, plan intact.
      state.state = 'IDLE';
      state.endTime = null;
      state.pausedRemainingSec = null;
      state.wizardStep = 'READY';
      break;
    }
    case 'PAUSED': {
      // Fully recoverable: keep the tasks and the remaining time.
      state.endTime = null;
      if (state.pausedRemainingSec === null) {
        state.pausedRemainingSec = currentSegmentDurationSec(state);
      }
      break;
    }
    case 'FINISHED': {
      // Keep the completion screen. It is already logged (`sessionLogged`), and the
      // "Start New Sprint" button clears it. Resetting here was the second write.
      state.endTime = null;
      state.pausedRemainingSec = null;
      break;
    }
    default:
      break;
  }

  return changed();
}

/**
 * localStorage can throw on access (Safari private mode, disabled site data).
 * Falling back to an in-memory map keeps `set()` from throwing through the app.
 */
const createSafeStorage = (): StateStorage => {
  const memory = new Map<string, string>();
  const ls = (): Storage | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  };
  return {
    getItem: (name) => {
      try {
        const value = ls()?.getItem(name);
        if (typeof value === 'string') return value;
      } catch { /* fall through to memory */ }
      return memory.get(name) ?? null;
    },
    setItem: (name, value) => {
      memory.set(name, value);
      try { ls()?.setItem(name, value); } catch { /* storage full / unavailable */ }
    },
    removeItem: (name) => {
      memory.delete(name);
      try { ls()?.removeItem(name); } catch { /* storage unavailable */ }
    },
  };
};

// ────────────────────────────────────────────────────────────────────────────

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => {
      /**
       * Writes the sprint to telemetry AT MOST ONCE.
       *
       * Previously both `completeCurrentTask`/`finishTaskEarly` and `resetSprint`
       * wrote the same finished sprint, so every dashboard metric was ~2x inflated.
       * The flag is set before the write so re-entrancy cannot slip a second row in.
       */
      const commitTelemetry = (
        tasksSnapshot: Task[],
        status: 'completed' | 'abandoned'
      ) => {
        if (get().sessionLogged) return;
        set({ sessionLogged: true });
        try {
          const totalDurationSec = tasksSnapshot.reduce(
            (s, t) => s + (isFiniteNumber(t.durationSec) ? t.durationSec : 0),
            0
          );
          // Real start time. Never `Date.now() - plannedDuration`, which invented
          // sessions that never happened.
          const startedAtMs = get().sprintStartedAt ?? Date.now();
          saveSession({
            startedAt: new Date(startedAtMs).toISOString(),
            completedAt: new Date().toISOString(),
            totalDurationSec,
            tasks: tasksSnapshot.map(t => ({
              title: t.title,
              durationSec: t.durationSec,
              completed: t.completed,
            })),
            status,
          });
        } catch { /* telemetry should never crash the app */ }
      };

      return {
      mode: 'SOLO',
      visualizerMode: 'WATCH',
      state: 'IDLE',
      tasks: [],
      currentTaskIndex: 0,
      currentSubtaskIndex: 0,
      endTime: null,
      pausedRemainingSec: null,
      isMuted: false,
      isCompactMode: false,
      sprintStartedAt: null,
      sessionLogged: false,
      toggleCompactMode: () => set(state => ({ isCompactMode: !state.isCompactMode })),
      wizardStep: 'GOAL',
      mainGoalTitle: '',

      toggleMute: () => {
        set((state) => {
          const newMuted = !state.isMuted;
          setMuted(newMuted);
          return { isMuted: newMuted };
        });
      },

      setVisualizerMode: (mode) => {
        if (VISUALIZER_MODES.indexOf(mode) < 0) return;
        set({ visualizerMode: mode });
      },

      cycleVisualizerMode: () => {
        set((state) => {
          const currentIndex = VISUALIZER_MODES.indexOf(state.visualizerMode);
          const nextIndex = (currentIndex + 1) % VISUALIZER_MODES.length;
          return { visualizerMode: VISUALIZER_MODES[nextIndex] };
        });
      },

      setWizardStep: (step) => set({ wizardStep: step }),
      setMainGoalTitle: (title) => set({ mainGoalTitle: title }),
      finalizeWizard: (subtasks) => set((state) => {
        const totalDuration = subtasks.reduce((acc, st) => acc + st.durationSec, 0);
        const subtasksWithIds = subtasks.map(st => ({
          ...st,
          id: newId(),
          completed: false
        }));

        const mainTask: Task = {
          id: newId(),
          title: state.mainGoalTitle || 'Main Goal',
          durationSec: totalDuration,
          completed: false,
          subtasks: subtasksWithIds
        };

        return {
          tasks: [mainTask],
          wizardStep: 'READY',
          currentTaskIndex: 0,
          currentSubtaskIndex: 0,
          sprintStartedAt: null,
          sessionLogged: false,
        };
      }),

      setMode: (mode) => set({ mode }),
      setTasks: (tasks) => set({ tasks }),
      resetSprint: () => {
        const { state: currentState, tasks, sessionLogged } = get();
        if (breathingTimeout) {
          clearTimeout(breathingTimeout);
          breathingTimeout = null;
        }
        // Record an abandoned session — but only if this sprint has not already been
        // written. A FINISHED sprint was logged the moment it finished.
        if (!sessionLogged && currentState !== 'IDLE' && tasks.length > 0) {
          commitTelemetry(tasks, currentState === 'FINISHED' ? 'completed' : 'abandoned');
        }
        set({
          state: 'IDLE',
          tasks: [],
          currentTaskIndex: 0,
          currentSubtaskIndex: 0,
          endTime: null,
          pausedRemainingSec: null,
          wizardStep: 'GOAL',
          mainGoalTitle: '',
          sprintStartedAt: null,
          sessionLogged: false,
        });
      },

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, { ...task, id: newId(), completed: false }]
  })),

  addSubtask: (taskId, subtask) => set((state) => {
    return {
      tasks: state.tasks.map(t => {
        if (t.id === taskId) {
          const newSubtask = { ...subtask, id: newId(), completed: false };
          const subtasks = [...(t.subtasks || []), newSubtask];
          const newDuration = subtasks.reduce((sum, s) => sum + s.durationSec, 0);
          return { ...t, subtasks, durationSec: newDuration };
        }
        return t;
      })
    };
  }),

  updateTaskDuration: (id, durationSec) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, durationSec } : t)
  })),

  reorderTasks: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.tasks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { tasks: result };
  }),

  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id)
  })),

  startSprint: () => {
    const { tasks, currentTaskIndex, currentSubtaskIndex, sprintStartedAt } = get();
    if (tasks.length === 0 || currentTaskIndex >= tasks.length) return;

    const currentTask = tasks[currentTaskIndex];
    let duration = currentTask.durationSec;
    if (currentTask.subtasks && currentTask.subtasks.length > 0 && currentSubtaskIndex < currentTask.subtasks.length) {
      duration = currentTask.subtasks[currentSubtaskIndex].durationSec;
    }

    if (breathingTimeout) {
      clearTimeout(breathingTimeout);
    }

    set({
      state: 'BREATHING',
      endTime: null,
      pausedRemainingSec: null,
      // Real wall-clock start of this sprint, recorded once.
      sprintStartedAt: sprintStartedAt ?? Date.now(),
      sessionLogged: false,
    });

    breathingTimeout = setTimeout(() => {
      if (get().state === 'BREATHING') {
        set({
          state: 'RUNNING',
          endTime: Date.now() + duration * 1000
        });
      }
      breathingTimeout = null;
    }, 2000);
  },

  pauseSprint: () => {
    const { endTime, state } = get();
    if (state !== 'RUNNING' || !endTime) return;
    const remainingSec = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    if (breathingTimeout) {
      clearTimeout(breathingTimeout);
      breathingTimeout = null;
    }
    set({ state: 'PAUSED', endTime: null, pausedRemainingSec: remainingSec });
  },

  resumeSprint: () => {
    const { pausedRemainingSec } = get();
    if (pausedRemainingSec == null) return;
    set({
      state: 'RUNNING',
      endTime: Date.now() + pausedRemainingSec * 1000,
      pausedRemainingSec: null
    });
  },

  /**
   * Wall-clock catch-up.
   *
   * A hidden tab has its worker `setTimeout` throttled to minutes, so a single tick
   * can arrive long after several segments were due. Completing exactly one segment
   * per tick — and restarting the next one from `Date.now()` — handed the user back
   * all of the elapsed time. Here we drain every segment whose deadline has passed;
   * `completeCurrentTask` anchors each new deadline to the previous one, so the
   * overshoot is carried forward instead of discarded.
   */
  tick: () => {
    const initial = get();
    if (initial.state !== 'RUNNING' || initial.endTime === null) return;

    // Hard bound: you can never need more completions than there are segments.
    const maxIterations = totalSegmentCount(initial.tasks) + 1;

    for (let i = 0; i < maxIterations; i++) {
      const { state, endTime, currentTaskIndex, currentSubtaskIndex } = get();
      if (state !== 'RUNNING' || endTime === null) return;
      if (Date.now() < endTime) return;

      get().completeCurrentTask();

      const after = get();
      if (after.state !== 'RUNNING') return; // reached the terminal FINISHED state
      // Defensive: if nothing moved we would spin forever. Bail instead.
      if (
        after.currentTaskIndex === currentTaskIndex &&
        after.currentSubtaskIndex === currentSubtaskIndex &&
        after.endTime === endTime
      ) {
        return;
      }
    }
  },

  completeCurrentTask: () => {
    const { tasks, currentTaskIndex, currentSubtaskIndex, endTime } = get();
    if (tasks.length === 0 || currentTaskIndex >= tasks.length) return;

    // The boundary of the segment we are completing. When the tab was throttled or
    // the machine was asleep this is in the past — anchoring the NEXT segment to it
    // carries the overshoot forward. `Date.now()` here is what gifted a fresh full
    // segment on every background gap.
    const boundary = isFiniteNumber(endTime) ? endTime : Date.now();

    const updatedTasks = [...tasks];
    const currentTask = { ...updatedTasks[currentTaskIndex] };
    const subIndex = currentTask.subtasks && currentTask.subtasks.length > 0
      ? clampIndex(currentSubtaskIndex, currentTask.subtasks.length)
      : 0;
    let nextSubtaskIndex = subIndex;
    let nextDuration = 0;
    let isTaskDone = false;

    if (currentTask.subtasks && currentTask.subtasks.length > 0) {
      const updatedSubtasks = [...currentTask.subtasks];
      updatedSubtasks[subIndex] = { ...updatedSubtasks[subIndex], completed: true };
      currentTask.subtasks = updatedSubtasks;

      if (subIndex + 1 < updatedSubtasks.length) {
        nextSubtaskIndex = subIndex + 1;
        nextDuration = updatedSubtasks[nextSubtaskIndex].durationSec;
      } else {
        isTaskDone = true;
        currentTask.completed = true;
      }
    } else {
      isTaskDone = true;
      currentTask.completed = true;
    }

    updatedTasks[currentTaskIndex] = currentTask;

    if (!isTaskDone) {
      const nextEnd = boundary + nextDuration * 1000;
      // Still behind wall clock: another completion follows immediately, so don't
      // fire a chime per skipped segment.
      if (nextEnd > Date.now()) playTransitionChime();
      set({
        tasks: updatedTasks,
        currentSubtaskIndex: nextSubtaskIndex,
        endTime: nextEnd
      });
      return;
    }

    if (currentTaskIndex + 1 < tasks.length) {
      const nextTask = updatedTasks[currentTaskIndex + 1];
      let nextTaskDuration = nextTask.durationSec;
      if (nextTask.subtasks && nextTask.subtasks.length > 0) {
        nextTaskDuration = nextTask.subtasks[0].durationSec;
      }
      const nextEnd = boundary + nextTaskDuration * 1000;
      if (nextEnd > Date.now()) playTransitionChime();
      set({
        tasks: updatedTasks,
        currentTaskIndex: currentTaskIndex + 1,
        currentSubtaskIndex: 0,
        endTime: nextEnd
      });
    } else {
      playCompletionPulse();
      commitTelemetry(updatedTasks, 'completed');
      set({
        tasks: updatedTasks,
        state: 'FINISHED',
        endTime: null,
        pausedRemainingSec: null,
        currentSubtaskIndex: 0
      });
    }
  },

  finishTaskEarly: (elapsedSec) => {
    const { tasks, currentTaskIndex, currentSubtaskIndex } = get();
    if (tasks.length === 0 || currentTaskIndex >= tasks.length) return;
    const currentTask = tasks[currentTaskIndex];

    const hasSubtasks = !!(currentTask.subtasks && currentTask.subtasks.length > 0);
    const subIndex = hasSubtasks
      ? clampIndex(currentSubtaskIndex, currentTask.subtasks!.length)
      : 0;

    let duration = currentTask.durationSec;
    if (hasSubtasks && currentTask.subtasks) {
      duration = currentTask.subtasks[subIndex].durationSec;
    }

    const savedSec = Math.max(0, duration - elapsedSec);
    const updatedTasks = [...tasks];
    const cTask = { ...updatedTasks[currentTaskIndex] };

    let isTaskDone = false;
    let nextSubtaskIndex = subIndex;
    let nextDuration = 0;

    if (hasSubtasks && cTask.subtasks) {
      const updatedSubtasks = [...cTask.subtasks];
      updatedSubtasks[subIndex] = { ...updatedSubtasks[subIndex], completed: true };

      const remainingSubCount = updatedSubtasks.length - (subIndex + 1);
      if (remainingSubCount > 0 && savedSec > 0) {
        const bonus = Math.floor(savedSec / remainingSubCount);
        for (let i = subIndex + 1; i < updatedSubtasks.length; i++) {
          updatedSubtasks[i] = { ...updatedSubtasks[i], durationSec: updatedSubtasks[i].durationSec + bonus };
        }
      }

      cTask.subtasks = updatedSubtasks;
      cTask.durationSec = updatedSubtasks.reduce((s, st) => s + st.durationSec, 0);

      if (subIndex + 1 < updatedSubtasks.length) {
        nextSubtaskIndex = subIndex + 1;
        nextDuration = updatedSubtasks[nextSubtaskIndex].durationSec;
      } else {
        isTaskDone = true;
        cTask.completed = true;
      }
    } else {
      isTaskDone = true;
      cTask.completed = true;
    }

    updatedTasks[currentTaskIndex] = cTask;

    if (isTaskDone && savedSec > 0) {
      const remainingTasksCount = tasks.length - (currentTaskIndex + 1);
      if (remainingTasksCount > 0) {
        const bonusPerTask = Math.floor(savedSec / remainingTasksCount);
        for (let i = currentTaskIndex + 1; i < tasks.length; i++) {
          updatedTasks[i] = { ...updatedTasks[i], durationSec: updatedTasks[i].durationSec + bonusPerTask };
          if (updatedTasks[i].subtasks && updatedTasks[i].subtasks!.length > 0) {
            const subCount = updatedTasks[i].subtasks!.length;
            const subBonus = Math.floor(bonusPerTask / subCount);
            updatedTasks[i].subtasks = updatedTasks[i].subtasks!.map(st => ({ ...st, durationSec: st.durationSec + subBonus }));
            updatedTasks[i].durationSec = updatedTasks[i].subtasks!.reduce((s, st) => s + st.durationSec, 0);
          }
        }
      }
    }

    // The user pressed "Done" just now, so `Date.now()` is the correct anchor here —
    // there is no accumulated overshoot to carry forward.
    if (!isTaskDone) {
      playTransitionChime();
      set({
        tasks: updatedTasks,
        currentSubtaskIndex: nextSubtaskIndex,
        endTime: Date.now() + nextDuration * 1000
      });
      return;
    }

    if (currentTaskIndex + 1 < tasks.length) {
      playTransitionChime();
      const nextTask = updatedTasks[currentTaskIndex + 1];
      let nextTaskDuration = nextTask.durationSec;
      if (nextTask.subtasks && nextTask.subtasks.length > 0) {
        nextTaskDuration = nextTask.subtasks[0].durationSec;
      }
      set({
        tasks: updatedTasks,
        currentTaskIndex: currentTaskIndex + 1,
        currentSubtaskIndex: 0,
        endTime: Date.now() + nextTaskDuration * 1000
      });
    } else {
      playCompletionPulse();
      commitTelemetry(updatedTasks, 'completed');
      set({
        tasks: updatedTasks,
        state: 'FINISHED',
        endTime: null,
        pausedRemainingSec: null,
        currentSubtaskIndex: 0
      });
    }
  },

  addTimeToCurrentTask: (extraSec: number) => {
    const { state, tasks, currentTaskIndex, currentSubtaskIndex, endTime, pausedRemainingSec } = get();
    if (tasks.length === 0 || currentTaskIndex >= tasks.length) return;
    if (!isFiniteNumber(extraSec)) return;

    const updatedTasks = [...tasks];
    const cTask = { ...updatedTasks[currentTaskIndex] };

    if (cTask.subtasks && cTask.subtasks.length > 0 && currentSubtaskIndex < cTask.subtasks.length) {
      const updatedSubtasks = [...cTask.subtasks];
      updatedSubtasks[currentSubtaskIndex] = {
        ...updatedSubtasks[currentSubtaskIndex],
        durationSec: updatedSubtasks[currentSubtaskIndex].durationSec + extraSec
      };
      cTask.subtasks = updatedSubtasks;
      cTask.durationSec = updatedSubtasks.reduce((s, st) => s + st.durationSec, 0);
    } else {
      cTask.durationSec += extraSec;
    }

    updatedTasks[currentTaskIndex] = cTask;

    set({
      tasks: updatedTasks,
      endTime: state === 'RUNNING' && endTime ? endTime + extraSec * 1000 : endTime,
      // Keep a paused sprint's remaining time consistent with the grown duration.
      pausedRemainingSec: state === 'PAUSED' && pausedRemainingSec != null
        ? Math.max(0, pausedRemainingSec + extraSec)
        : pausedRemainingSec
    });
  }
      };
    },
    {
      name: PERSIST_NAME,
      version: PERSIST_VERSION,
      storage: createJSONStorage(createSafeStorage),
      partialize: (state): PersistedShape => ({
        mode: state.mode,
        state: state.state,
        tasks: state.tasks,
        currentTaskIndex: state.currentTaskIndex,
        currentSubtaskIndex: state.currentSubtaskIndex,
        endTime: state.endTime,
        pausedRemainingSec: state.pausedRemainingSec,
        isMuted: state.isMuted,
        isCompactMode: state.isCompactMode,
        visualizerMode: state.visualizerMode,
        wizardStep: state.wizardStep,
        mainGoalTitle: state.mainGoalTitle,
        sprintStartedAt: state.sprintStartedAt,
        sessionLogged: state.sessionLogged,
      }),
      // v0 (unversioned) → v1: the visualizer enum was realigned (CLOCK → WATCH) and
      // `sprintStartedAt` / `sessionLogged` were added. Everything is coerced anyway.
      migrate: (persistedState) => sanitizePersistedState(persistedState),
      // Runs on EVERY rehydrate, not just on a version bump, so a hand-edited or
      // truncated blob can never reach a component.
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState(persistedState),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setMuted(state.isMuted);
        const healed = healRehydratedState(state);
        if (healed) {
          // zustand persists BEFORE this callback and an in-place mutation does not
          // notify, so flush the healed state (and the version stamp) to storage on
          // the next macrotask, once `useTimerStore` is assigned.
          setTimeout(() => {
            try { useTimerStore.setState({}); } catch { /* store torn down */ }
          }, 0);
        }
      }
    }
  )
);

/**
 * Catch-up on tab re-show.
 *
 * The worker's `setTimeout` is throttled to minutes in a hidden tab, so the first
 * tick after returning can be far too late. Re-checking the wall clock the moment
 * the tab becomes visible again makes the transition immediate rather than waiting
 * for the next throttled tick. `tick()` is a no-op unless a deadline has passed.
 */
const VISIBILITY_BOUND_KEY = '__foocusTimerWallClockBound';
if (
  typeof document !== 'undefined' &&
  typeof window !== 'undefined' &&
  !(window as unknown as Record<string, unknown>)[VISIBILITY_BOUND_KEY]
) {
  (window as unknown as Record<string, unknown>)[VISIBILITY_BOUND_KEY] = true;
  const syncToWallClock = () => {
    if (document.visibilityState === 'hidden') return;
    try {
      useTimerStore.getState().tick();
    } catch { /* never let a catch-up break the page */ }
  };
  document.addEventListener('visibilitychange', syncToWallClock);
  window.addEventListener('focus', syncToWallClock);
  window.addEventListener('pageshow', syncToWallClock);
}
