import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playTransitionChime, playCompletionPulse, setMuted } from '@/lib/sound';

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

interface TimerStore {
  mode: TimerMode;
  state: TimerState;
  tasks: Task[];
  currentTaskIndex: number;
  currentSubtaskIndex: number;
  endTime: number | null; // The absolute Unix timestamp when the current task should end
  isMuted: boolean;
  isCompactMode: boolean;
  visualizerMode: 'CLOCK' | 'SPACE' | 'MOUNTAIN';
  
  // Actions
  toggleMute: () => void;
  toggleCompactMode: () => void;
  cycleVisualizerMode: () => void;
  setMode: (mode: TimerMode) => void;
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  addSubtask: (taskId: string, subtask: Omit<SubTask, 'id'|'completed'>) => void;
  updateTaskDuration: (id: string, durationSec: number) => void;
  reorderTasks: (startIndex: number, endIndex: number) => void;
  removeTask: (id: string) => void;
  
  startSprint: () => void;
  pauseSprint: (remainingSec: number) => void; // Need remaining seconds to recalculate endTime on resume
  resumeSprint: (remainingSec: number) => void;
  
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

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      mode: 'SOLO',
      visualizerMode: 'CLOCK',
      state: 'IDLE',
      tasks: [],
      currentTaskIndex: 0,
      currentSubtaskIndex: 0,
      endTime: null,
      isMuted: false,
      isCompactMode: false,
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

      cycleVisualizerMode: () => {
        set((state) => {
          const modes: Array<'CLOCK' | 'SPACE' | 'MOUNTAIN'> = ['CLOCK', 'SPACE', 'MOUNTAIN'];
          const currentIndex = modes.indexOf(state.visualizerMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          return { visualizerMode: modes[nextIndex] };
        });
      },

      setWizardStep: (step) => set({ wizardStep: step }),
      setMainGoalTitle: (title) => set({ mainGoalTitle: title }),
      finalizeWizard: (subtasks) => set((state) => {
        const totalDuration = subtasks.reduce((acc, st) => acc + st.durationSec, 0);
        const subtasksWithIds = subtasks.map(st => ({
          ...st,
          id: Math.random().toString(36).substring(2, 9),
          completed: false
        }));
        
        const mainTask: Task = {
          id: Math.random().toString(36).substring(2, 9),
          title: state.mainGoalTitle || 'Main Goal',
          durationSec: totalDuration,
          completed: false,
          subtasks: subtasksWithIds
        };
        
        return {
          tasks: [mainTask],
          wizardStep: 'READY'
        };
      }),

      setMode: (mode) => set({ mode }),
      setTasks: (tasks) => set({ tasks }),
      resetSprint: () => {
        if (breathingTimeout) {
          clearTimeout(breathingTimeout);
          breathingTimeout = null;
        }
        set({
          state: 'IDLE',
          tasks: [],
          currentTaskIndex: 0,
          currentSubtaskIndex: 0,
          endTime: null,
          wizardStep: 'GOAL',
          mainGoalTitle: '',
        });
      },
  
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, { ...task, id: Math.random().toString(36).substring(2, 9), completed: false }]
  })),

  addSubtask: (taskId, subtask) => set((state) => {
    return {
      tasks: state.tasks.map(t => {
        if (t.id === taskId) {
          const newSubtask = { ...subtask, id: Math.random().toString(36).substring(2, 9), completed: false };
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
    const { tasks, currentTaskIndex, currentSubtaskIndex } = get();
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
      endTime: null 
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

  pauseSprint: (remainingSec) => {
    if (breathingTimeout) {
      clearTimeout(breathingTimeout);
      breathingTimeout = null;
    }
    set({ state: 'PAUSED', endTime: null });
  },

  resumeSprint: (remainingSec) => {
    set({ 
      state: 'RUNNING', 
      endTime: Date.now() + remainingSec * 1000 
    });
  },

  tick: () => {
    const { state, endTime } = get();
    if (state !== 'RUNNING' || !endTime) return;

    if (Date.now() >= endTime) {
      get().completeCurrentTask();
    }
  },

  completeCurrentTask: () => {
    const { tasks, currentTaskIndex, currentSubtaskIndex } = get();
    
    const updatedTasks = [...tasks];
    const currentTask = { ...updatedTasks[currentTaskIndex] };
    let nextSubtaskIndex = currentSubtaskIndex;
    let nextDuration = 0;
    let isTaskDone = false;

    if (currentTask.subtasks && currentTask.subtasks.length > 0) {
      const updatedSubtasks = [...currentTask.subtasks];
      if (currentSubtaskIndex < updatedSubtasks.length) {
        updatedSubtasks[currentSubtaskIndex] = { ...updatedSubtasks[currentSubtaskIndex], completed: true };
      }
      currentTask.subtasks = updatedSubtasks;

      if (currentSubtaskIndex + 1 < updatedSubtasks.length) {
        nextSubtaskIndex = currentSubtaskIndex + 1;
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
      set({
        tasks: updatedTasks,
        state: 'FINISHED',
        endTime: null,
        currentSubtaskIndex: 0
      });
    }
  },

  finishTaskEarly: (elapsedSec) => {
    const { tasks, currentTaskIndex, currentSubtaskIndex } = get();
    const currentTask = tasks[currentTaskIndex];
    
    let duration = currentTask.durationSec;
    let hasSubtasks = currentTask.subtasks && currentTask.subtasks.length > 0;
    if (hasSubtasks && currentTask.subtasks) {
      duration = currentTask.subtasks[currentSubtaskIndex].durationSec;
    }

    const savedSec = Math.max(0, duration - elapsedSec);
    let updatedTasks = [...tasks];
    const cTask = { ...updatedTasks[currentTaskIndex] };
    
    let isTaskDone = false;
    let nextSubtaskIndex = currentSubtaskIndex;
    let nextDuration = 0;

    if (hasSubtasks && cTask.subtasks) {
      const updatedSubtasks = [...cTask.subtasks];
      updatedSubtasks[currentSubtaskIndex] = { ...updatedSubtasks[currentSubtaskIndex], completed: true };
      
      const remainingSubCount = updatedSubtasks.length - (currentSubtaskIndex + 1);
      if (remainingSubCount > 0 && savedSec > 0) {
        const bonus = Math.floor(savedSec / remainingSubCount);
        for (let i = currentSubtaskIndex + 1; i < updatedSubtasks.length; i++) {
          updatedSubtasks[i] = { ...updatedSubtasks[i], durationSec: updatedSubtasks[i].durationSec + bonus };
        }
      }

      cTask.subtasks = updatedSubtasks;
      cTask.durationSec = updatedSubtasks.reduce((s, st) => s + st.durationSec, 0);

      if (currentSubtaskIndex + 1 < updatedSubtasks.length) {
        nextSubtaskIndex = currentSubtaskIndex + 1;
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
      set({
        tasks: updatedTasks,
        state: 'FINISHED',
        endTime: null,
        currentSubtaskIndex: 0
      });
    }
  },

  addTimeToCurrentTask: (extraSec: number) => {
    const { state, tasks, currentTaskIndex, currentSubtaskIndex, endTime } = get();
    if (tasks.length === 0 || currentTaskIndex >= tasks.length) return;

    let updatedTasks = [...tasks];
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
      endTime: state === 'RUNNING' && endTime ? endTime + extraSec * 1000 : endTime
    });
  }
    }),
    {
      name: 'plan-and-do-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          setMuted(state.isMuted);
          // Auto-heal ANY stale non-IDLE session on page reload
          if (state.state !== 'IDLE') {
            const isStale =
              state.state === 'FINISHED' ||
              state.state === 'PAUSED' ||
              state.endTime === null ||
              state.endTime < Date.now();

            if (isStale) {
              // Use setTimeout so the store is fully initialized before calling resetSprint
              setTimeout(() => {
                useTimerStore.getState().resetSprint();
              }, 0);
            }
          }
        }
      }
    }
  )
);
