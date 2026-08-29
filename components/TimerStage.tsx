"use client";

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTimerStore, type VisualizerMode } from '@/store/useTimerStore';
import { Play, Pause, FastForward, Plus, Watch, Rocket, Mountain, Volume2, VolumeX, Flag, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalogueClock } from './AnalogueClock';
import { ProgressVisualizer } from './ProgressVisualizer';
import { getStats, type TelemetryStats } from '@/lib/telemetry';

/**
 * Shared, on-brand focus treatment. Neumorphism has almost no edge contrast, so a
 * ring alone can vanish against the surface — the offset lifts it clear of the shadow.
 * Written out in full (not composed) so Tailwind's content scanner sees every class.
 */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Anything that either consumes Space itself (button/checkbox activation, typing a
 * space) or is user-focusable. If the key event originates inside one of these we must
 * not touch it — no preventDefault, no shortcut. Matched with closest() so shadow-ish
 * wrappers (icon inside a button, label inside a role="button" div) resolve correctly.
 */
const SPACE_OWNING_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  'audio[controls]',
  'video[controls]',
  'details',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="option"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="tab"]',
  '[role="link"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="spinbutton"]',
  '[role="slider"]',
  '[role="listbox"]',
  '[role="treeitem"]',
].join(',');

const VISUALIZER_LABELS: Record<VisualizerMode, string> = {
  WATCH: 'Classic clock',
  SPACE: 'Starship',
  MOUNTAIN: 'Mountain',
  RACE: 'Race',
};

export const TimerStage = () => {
  const { 
    state, tasks, currentTaskIndex, currentSubtaskIndex, endTime, 
    pauseSprint, resumeSprint, tick, finishTaskEarly, addTimeToCurrentTask,
    isMuted, toggleMute, resetSprint, isCompactMode, toggleCompactMode,
    visualizerMode, cycleVisualizerMode
  } = useTimerStore();
  
  const [remainingSec, setRemainingSec] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const [workerFailed, setWorkerFailed] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  // Screen-reader announcements. Two channels so a state change and a time update
  // never overwrite one another before either has been read out.
  const [statusMessage, setStatusMessage] = useState('');
  const [timeAnnouncement, setTimeAnnouncement] = useState('');

  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [showDonation, setShowDonation] = useState(false);

  useEffect(() => {
    if (state === 'FINISHED') {
      const id = setTimeout(() => setShowDonation(true), 3000);
      return () => clearTimeout(id);
    } else {
      setShowDonation(false);
    }
  }, [state]);

  // Idle fade. Pointer events cover mouse, touch and pen in one listener; touchstart
  // is kept as a fallback for engines without pointer events, so a phone user can
  // always bring the dimmed controls back.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleIdle = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsIdle(true), 3000);
    };

    const handleActivity = () => {
      setIsIdle(false);
      scheduleIdle();
    };

    if (state === 'RUNNING') {
      scheduleIdle();
      window.addEventListener('pointermove', handleActivity, { passive: true });
      window.addEventListener('pointerdown', handleActivity, { passive: true });
      window.addEventListener('touchstart', handleActivity, { passive: true });
    } else {
      setIsIdle(false);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [state]);

  const currentTask = tasks[currentTaskIndex];
  const nextTask = tasks[currentTaskIndex + 1];

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFocusTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Sprint-wide totals. Hoisted above the early returns so the announcement effects
  // (which are hooks) can read them, and so the maths lives in exactly one place.
  const { totalSprintDuration, overallProgress, totalRemainingSec } = useMemo(() => {
    const total = tasks.reduce((sum, t) => sum + t.durationSec, 0);
    let elapsed = 0;
    for (let i = 0; i < currentTaskIndex; i++) elapsed += tasks[i].durationSec;

    const task = tasks[currentTaskIndex];
    if (task && task.subtasks && task.subtasks.length > 0) {
      for (let i = 0; i < currentSubtaskIndex; i++) elapsed += task.subtasks[i].durationSec;
      const activeSubtask = task.subtasks[currentSubtaskIndex];
      if (activeSubtask) elapsed += (activeSubtask.durationSec - remainingSec);
    } else if (task) {
      elapsed += (task.durationSec - remainingSec);
    }

    return {
      totalSprintDuration: total,
      overallProgress: total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0,
      totalRemainingSec: Math.max(0, total - elapsed),
    };
  }, [tasks, currentTaskIndex, currentSubtaskIndex, remainingSec]);

  // Sync document title for background tracking
  useEffect(() => {
    if (state === 'RUNNING') {
      document.title = `${formatTime(totalRemainingSec)} - ${currentTask?.title || 'Plan & Do'}`;
    } else if (state === 'FINISHED') {
      document.title = "Sprint Complete! - Plan & Do";
    } else {
      document.title = "Plan & Do";
    }
  }, [totalRemainingSec, state, currentTask]);

  // Initialize Web Worker. If the worker script cannot be fetched or constructed the
  // sprint would otherwise hang silently at the current time, so failure is captured
  // and surfaced rather than swallowed.
  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker('/timer-worker.js');
      worker.onmessage = (e) => {
        if (e.data?.type === 'TICK') {
          tick();
        }
      };
      worker.onerror = () => {
        setWorkerFailed(true);
        workerRef.current = null;
      };
      workerRef.current = worker;
      setWorkerFailed(false);
    } catch {
      workerRef.current = null;
      setWorkerFailed(true);
    }
    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, [tick]);

  // Degraded fallback: drive ticks from the main thread if the worker never came up.
  // Less drift-resistant when the tab is backgrounded, but the sprint still advances.
  useEffect(() => {
    if (!workerFailed || state !== 'RUNNING') return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [workerFailed, state, tick]);

  // Sync state with Worker
  useEffect(() => {
    if (state === 'RUNNING') {
      workerRef.current?.postMessage({ command: 'START', interval: 1000 });
    } else {
      workerRef.current?.postMessage({ command: 'STOP' });
    }
  }, [state]);

  // Local render loop for smooth UI
  useEffect(() => {
    let frameId: number;
    const updateLocalTimer = () => {
      if (state === 'RUNNING' && endTime) {
        const sec = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setRemainingSec(sec);
      } else if (state === 'IDLE' && currentTask) {
        setRemainingSec(currentTask.durationSec);
      } else if (state === 'PAUSED' && useTimerStore.getState().pausedRemainingSec != null) {
        setRemainingSec(useTimerStore.getState().pausedRemainingSec!);
      }
      frameId = requestAnimationFrame(updateLocalTimer);
    };
    frameId = requestAnimationFrame(updateLocalTimer);
    return () => cancelAnimationFrame(frameId);
  }, [state, endTime, currentTask]);

  // Announce visualizer mode changes (evolution log Insight 7). Driven off the store
  // value rather than the click handler so any caller of cycleVisualizerMode announces.
  const prevVisualizerRef = useRef<VisualizerMode | null>(null);
  useEffect(() => {
    if (prevVisualizerRef.current === null || prevVisualizerRef.current === visualizerMode) {
      prevVisualizerRef.current = visualizerMode;
      return;
    }
    prevVisualizerRef.current = visualizerMode;
    setStatusMessage(`Visualizer mode: ${VISUALIZER_LABELS[visualizerMode]}.`);
  }, [visualizerMode]);

  // Announce run/pause/finish transitions.
  const prevStateRef = useRef(state);
  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev === state) return;
    prevStateRef.current = state;

    if (state === 'BREATHING') setStatusMessage('Getting ready. Breathe.');
    else if (state === 'RUNNING') setStatusMessage(prev === 'PAUSED' ? 'Sprint resumed.' : 'Sprint started.');
    else if (state === 'PAUSED') setStatusMessage('Sprint paused.');
    else if (state === 'FINISHED') setStatusMessage('Sprint complete. All tasks finished.');
    else setStatusMessage('');
  }, [state]);

  // Announce task / subtask advancement.
  const prevPositionRef = useRef<string | null>(null);
  useEffect(() => {
    if (state !== 'RUNNING') {
      if (state === 'IDLE') prevPositionRef.current = null;
      return;
    }
    const key = `${currentTaskIndex}:${currentSubtaskIndex}`;
    if (prevPositionRef.current === key) return;
    const isFirstPosition = prevPositionRef.current === null;
    prevPositionRef.current = key;
    if (isFirstPosition) return; // "Sprint started" already covers this

    const task = tasks[currentTaskIndex];
    const subtask = task?.subtasks?.[currentSubtaskIndex];
    const target = subtask ?? task;
    if (!target) return;
    setStatusMessage(`Now on ${target.title}. ${Math.max(1, Math.round(target.durationSec / 60))} minutes.`);
  }, [state, currentTaskIndex, currentSubtaskIndex, tasks]);

  // Announce remaining time at coarse (per-minute) intervals. A per-second live region
  // is unusable with a screen reader, and role="timer" has an implicit aria-live of
  // "off", so without this the remaining time is unreachable in every visualizer mode.
  const lastAnnouncedMinuteRef = useRef<number | null>(null);
  useEffect(() => {
    if (state !== 'RUNNING') {
      lastAnnouncedMinuteRef.current = null;
      return;
    }
    const minutes = Math.ceil(totalRemainingSec / 60);
    if (lastAnnouncedMinuteRef.current === minutes) return;
    lastAnnouncedMinuteRef.current = minutes;
    setTimeAnnouncement(
      minutes <= 1
        ? 'Less than one minute remaining in this sprint.'
        : `${minutes} minutes remaining in this sprint.`
    );
  }, [state, totalRemainingSec]);

  // Read (never write) the telemetry already persisted by the store when the sprint
  // finished. Runs in an effect so localStorage is never touched during render.
  useEffect(() => {
    if (state !== 'FINISHED') {
      setStats(null);
      return;
    }
    try {
      setStats(getStats());
    } catch {
      setStats(null);
    }
  }, [state]);

  // Global Keyboard Shortcuts.
  // Only armed while a sprint is actually in flight — in IDLE the wizard owns the page
  // and Space must reach its buttons. Never calls preventDefault on a path it does not
  // handle, and never steals the key from a control that owns it (WCAG 2.1.1).
  useEffect(() => {
    if (state !== 'RUNNING' && state !== 'PAUSED') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Match on both: `code` is layout-independent, but some input methods and
      // assistive-tech key routes populate only `key`.
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.defaultPrevented) return;

      const target = e.target as Element | null;
      if (target instanceof Element && target.closest(SPACE_OWNING_SELECTOR)) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;

      e.preventDefault();
      if (state === 'PAUSED') resumeSprint();
      else pauseSprint();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, pauseSprint, resumeSprint]);

  const liveRegions = (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{statusMessage}</div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{timeAnnouncement}</div>
    </>
  );

  const workerNotice = workerFailed ? (
    <div
      role="status"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-3 py-1.5 rounded-full border border-foreground/20 bg-card/90 backdrop-blur-md text-[10px] uppercase tracking-widest text-foreground/70 pointer-events-none"
    >
      Background timer unavailable — keep this tab visible
    </div>
  ) : null;

  if (state === 'IDLE') return null;

  if (state === 'BREATHING') {
    return (
      <>
        {liveRegions}
        {workerNotice}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-20 min-h-[60vh]"
          role="status"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="neu-pressed w-64 h-64 sm:w-80 sm:h-80 rounded-full flex items-center justify-center"
          >
            <span className="text-2xl font-sans font-light tracking-widest text-foreground/70">
              Breathe...
            </span>
          </motion.div>
        </motion.div>
      </>
    );
  }

  if (state === 'FINISHED') {
    return (
      <>
        {liveRegions}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <h2 className="text-4xl font-sans font-light tracking-wide text-foreground mb-4">Sprint Complete</h2>
          <p className="text-foreground/80 mb-8">All tasks finished. You crushed it.</p>

          {stats && stats.totalSprints > 0 && (
            <div className="flex flex-col items-center bg-card/50 p-6 rounded-2xl border border-foreground/5 max-w-sm w-full backdrop-blur-md shadow-sm">
              <p className="text-[9px] uppercase tracking-[0.3em] text-foreground/50 mb-5 text-center">
                Your focus record — kept on this device only
              </p>
              <dl className="grid grid-cols-3 gap-4 w-full text-center">
                <div>
                  <dd className="font-sans text-2xl font-light text-foreground tabular-nums">{stats.totalSprints}</dd>
                  <dt className="text-[9px] uppercase tracking-widest text-foreground/50 mt-1">Sprints</dt>
                </div>
                <div>
                  <dd className="font-sans text-2xl font-light text-foreground tabular-nums">{formatFocusTime(stats.totalFocusSeconds)}</dd>
                  <dt className="text-[9px] uppercase tracking-widest text-foreground/50 mt-1">Focused</dt>
                </div>
                <div>
                  <dd className="font-sans text-2xl font-light text-foreground tabular-nums">{stats.completionRate}%</dd>
                  <dt className="text-[9px] uppercase tracking-widest text-foreground/50 mt-1">Finished</dt>
                </div>
              </dl>
            </div>
          )}

          <button
            onClick={() => resetSprint()}
            className={`mt-6 rounded-full px-4 py-2 text-xs uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors ${FOCUS_RING}`}
          >
            Start New Sprint
          </button>

          <AnimatePresence>
            {showDonation && (
              <motion.a
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                href="https://throne.com/foocus"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-8 text-sm text-foreground/40 hover:text-foreground/80 transition-colors duration-500 font-sans tracking-wide"
              >
                Fuel the next sprint ☕
              </motion.a>
            )}
          </AnimatePresence>
        </motion.div>
      </>
    );
  }

  const progress = overallProgress;
  const progressPercent = Math.round(overallProgress * 100);

  // Calculate timeline checkpoints for the visualizer
  let progressiveSum = 0;
  const timelinePoints: number[] = [];
  tasks.forEach(task => {
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(st => {
        progressiveSum += st.durationSec;
        timelinePoints.push(progressiveSum / totalSprintDuration);
      });
    } else {
      progressiveSum += task.durationSec;
      timelinePoints.push(progressiveSum / totalSprintDuration);
    }
  });
  if (timelinePoints.length > 0 && timelinePoints[timelinePoints.length - 1] >= 0.99) {
    timelinePoints.pop();
  }

  if (isCompactMode) {
    return (
      <>
        {liveRegions}
        {workerNotice}
        <motion.div 
          layout
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl h-16 bg-card/80 backdrop-blur-xl border border-foreground/5 rounded-2xl flex items-center justify-between px-4 z-50 shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none -z-10">
             <ProgressVisualizer 
               mode={visualizerMode as any} 
               progress={progress}
               timeString={formatTime(totalRemainingSec)}
               taskTitle={currentTask?.title || 'FOCUS'}
               timelinePoints={timelinePoints}
             />
          </div>
          
          {/* Progress Line */}
          <div 
            className="absolute bottom-0 left-0 h-[2px] bg-foreground/20 w-full"
            role="progressbar"
            aria-label="Sprint progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-valuetext={`${progressPercent} percent complete`}
          >
            <motion.div 
              className="h-full bg-foreground"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress * 100}%` }}
              transition={{ ease: "linear", duration: 0.5 }}
            />
          </div>

          <div className="flex items-center space-x-3 z-10 w-1/3">
            <button
              onClick={() => resetSprint()}
              className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-widest text-foreground/40 hover:text-foreground/80 transition-colors ${FOCUS_RING}`}
            >
              ← Exit
            </button>
            <span className="text-foreground/70 font-sans text-xs tracking-widest uppercase truncate max-w-[120px]">
               {currentTask?.title}
            </span>
          </div>

          <div className="flex items-center justify-center z-10 font-sans tracking-widest text-xl font-light text-foreground w-1/3 text-center">
            {formatTime(totalRemainingSec)}
          </div>

          <div className="flex items-center justify-end space-x-2 z-10 w-1/3">
            <button 
              onClick={() => {
                if (state === 'PAUSED') resumeSprint();
                else if (state === 'RUNNING') pauseSprint();
              }}
              className={`neu-pressed w-8 h-8 rounded-full transition-all flex items-center justify-center group ${FOCUS_RING}`}
              aria-label={state === 'RUNNING' ? 'Pause sprint' : 'Resume sprint'}
            >
              {state === 'RUNNING' 
                ? <Pause className="w-3 h-3 text-foreground" /> 
                : <Play className="w-3 h-3 text-foreground translate-x-[1px]" />
              }
            </button>
            <button 
               onClick={() => {
                  const duration = currentTask?.subtasks && currentTask.subtasks.length > 0 ? currentTask.subtasks[currentSubtaskIndex].durationSec : (currentTask?.durationSec || 0);
                  finishTaskEarly(Math.max(0, duration - remainingSec));
               }}
               className={`neu-flat w-8 h-8 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground ${FOCUS_RING}`}
               aria-label="Finish task early"
            >
               <FastForward className="w-3 h-3" />
            </button>
            <div className="w-[1px] h-4 bg-foreground/10 mx-1" />
            <button
              onClick={toggleCompactMode}
              className={`p-2 rounded-full text-foreground/50 hover:text-foreground ${FOCUS_RING}`}
              title="Expand"
              aria-label="Expand to full timer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {liveRegions}
      {workerNotice}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col items-center justify-center p-8 flex-1 h-full w-full"
        onFocusCapture={() => setIsIdle(false)}
      >
        {/* Escape Hatch: Restart */}
        <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-50">
          <div className="w-full max-w-2xl flex justify-between items-center relative">
            <button
              onClick={() => resetSprint()}
              className={`pointer-events-auto text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground px-3 py-1.5 border border-foreground/10 hover:border-foreground/30 rounded-full transition-all bg-foreground/5 hover:bg-foreground/10 backdrop-blur-md ${FOCUS_RING}`}
            >
              ← Restart
            </button>
          </div>
        </div>

        {/* Overall Sprint Progress Line */}
        <div 
          className="fixed top-0 left-0 w-full h-[2px] bg-transparent z-50"
          role="progressbar"
          aria-label="Sprint progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          aria-valuetext={`${progressPercent} percent complete`}
        >
          <motion.div 
            className="h-full bg-foreground"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress * 100}%` }}
            transition={{ ease: "linear", duration: 0.5 }}
          />
        </div>

        {visualizerMode !== 'WATCH' && (
          <ProgressVisualizer 
            mode={visualizerMode as any} 
            progress={progress} 
            timeString={formatTime(totalRemainingSec)}
            taskTitle={currentTask?.title || 'FOCUS'}
            timelinePoints={timelinePoints}
          />
        )}

        {/* Top Toggles */}
        <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-50">
          <div className="w-full max-w-2xl flex justify-end items-center relative">
            <motion.div 
              animate={{ opacity: state === 'RUNNING' && isIdle ? 0.05 : 0.4 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="pointer-events-auto flex items-center space-x-2 scale-90 origin-top-right transition-opacity"
            >
          <button
            onClick={toggleCompactMode}
            className={`neu-flat p-1.5 rounded-full text-foreground/50 hover:text-foreground transition-colors ${FOCUS_RING}`}
            title="Toggle Quiet Bar"
            aria-label="Toggle Quiet Bar"
          >
            {isCompactMode ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => toggleMute()}
            className={`neu-flat p-1.5 rounded-full text-foreground/50 hover:text-foreground transition-colors ${FOCUS_RING}`}
            title={isMuted ? "Unmute" : "Mute"}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
          <button
            onClick={cycleVisualizerMode}
            className={`neu-flat px-3 py-1.5 flex items-center space-x-1.5 rounded-full text-[8px] uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors ${FOCUS_RING}`}
            title="Toggle Visualizer Mode"
            aria-label={`Toggle Visualizer Mode (Current: ${VISUALIZER_LABELS[visualizerMode]})`}
          >
            {visualizerMode === 'WATCH' && <><Watch className="w-3 h-3" /> <span>Classic</span></>}
            {visualizerMode === 'SPACE' && <><Rocket className="w-3 h-3" /> <span>Starship</span></>}
            {visualizerMode === 'MOUNTAIN' && <><Mountain className="w-3 h-3" /> <span>Mountain</span></>}
            {visualizerMode === 'RACE' && <><Flag className="w-3 h-3" /> <span>Race</span></>}
          </button>
            </motion.div>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-foreground/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col items-center justify-center flex-1 w-full gap-8">
          {/* Clock Area - Only occupy space in WATCH mode */}
          {visualizerMode === 'WATCH' ? (
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center z-10 pointer-events-none">
              <div className="pointer-events-auto">
                <AnalogueClock remainingSec={totalRemainingSec} totalSec={totalSprintDuration} />
              </div>
            </div>
          ) : (
            <div className="relative w-full flex flex-col items-center justify-center z-10 pointer-events-none">
              <h1 className="text-6xl sm:text-7xl font-sans text-foreground font-light tracking-widest opacity-90">
                {formatTime(totalRemainingSec)}
              </h1>
              <p className="text-foreground/50 text-[10px] sm:text-xs uppercase tracking-[0.3em] mt-2">
                {currentTask?.title || 'FOCUS'}
              </p>
            </div>
          )}

          {/* Controls */}
          <motion.div 
            animate={{ opacity: state === 'RUNNING' && isIdle ? 0.1 : 1 }}
            transition={{ duration: 1 }}
            className="flex items-center space-x-4 z-10 h-16"
          >
          <AnimatePresence>
            {state === 'RUNNING' && (
              <motion.button 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => addTimeToCurrentTask(5 * 60)}
                className={`neu-flat flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all text-foreground/50 hover:text-foreground ${FOCUS_RING}`}
                aria-label="Add 5 minutes"
              >
                <Plus className="w-4 h-4 mb-1" />
                <span className="text-[9px] uppercase tracking-wider">5 min</span>
              </motion.button>
            )}
          </AnimatePresence>

          <button 
            onClick={() => {
              if (state === 'PAUSED') {
                resumeSprint();
              } else if (state === 'RUNNING') {
                pauseSprint();
              }
            }}
            className={`neu-pressed w-20 h-20 rounded-full transition-all flex items-center justify-center group ${FOCUS_RING}`}
            aria-label={state === 'RUNNING' ? 'Pause sprint' : 'Resume sprint'}
          >
            {state === 'RUNNING' 
              ? <Pause className="w-8 h-8 text-foreground group-hover:text-foreground/70" /> 
              : <Play className="w-8 h-8 text-foreground group-hover:text-foreground/70 translate-x-[2px]" />
            }
          </button>

          <AnimatePresence>
            {state === 'RUNNING' && (
              <motion.button 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => {
                  const duration = currentTask?.subtasks && currentTask.subtasks.length > 0 ? currentTask.subtasks[currentSubtaskIndex].durationSec : (currentTask?.durationSec || 0);
                  finishTaskEarly(Math.max(0, duration - remainingSec));
                }}
                className={`neu-flat flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all text-foreground/50 hover:text-foreground ${FOCUS_RING}`}
                aria-label="Finish task early"
              >
                <FastForward className="w-4 h-4 mb-1" />
                <span className="text-[9px] uppercase tracking-wider">Done</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
        </div>

        {/* Upcoming (Only in WATCH mode) */}
        <AnimatePresence>
          {visualizerMode === 'WATCH' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: state === 'RUNNING' && isIdle ? 0.1 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 h-12 flex items-center justify-center pointer-events-none"
            >
              {nextTask ? (
                <div className="flex items-center space-x-4 text-foreground/50 text-sm bg-card/30 px-6 py-2 rounded-full border border-foreground/5">
                  <span className="text-[10px] uppercase tracking-widest text-foreground/60">Next</span>
                  <span className="font-sans text-foreground/80 truncate max-w-[200px]">{nextTask.title}</span>
                  <span className="font-mono tabular-nums">{Math.floor(nextTask.durationSec / 60)} minutes</span>
                </div>
              ) : (
                <div className="text-[10px] uppercase tracking-widest text-foreground/30">
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};
