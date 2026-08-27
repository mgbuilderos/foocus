"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { Play, Pause, FastForward, Plus, Watch, Rocket, Mountain, Volume2, VolumeX, Flag, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalogueClock } from './AnalogueClock';
import { ProgressVisualizer } from './ProgressVisualizer';

export const TimerStage = () => {
  const { 
    state, tasks, currentTaskIndex, currentSubtaskIndex, endTime, 
    startSprint, pauseSprint, resumeSprint, tick, finishTaskEarly, addTimeToCurrentTask,
    isMuted, toggleMute, resetSprint, isCompactMode, toggleCompactMode
  } = useTimerStore();
  
  const [remainingSec, setRemainingSec] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const [isIdle, setIsIdle] = useState(false);

  const [visualizerMode, setVisualizerMode] = useState<'WATCH' | 'SPACE' | 'MOUNTAIN' | 'RACE'>('WATCH');
  const cycleVisualizerMode = () => setVisualizerMode(p => p === 'WATCH' ? 'SPACE' : p === 'SPACE' ? 'MOUNTAIN' : p === 'MOUNTAIN' ? 'RACE' : 'WATCH');


  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = () => {
      setIsIdle(false);
      if (state === 'RUNNING') {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setIsIdle(true);
        }, 3000);
      }
    };

    if (state === 'RUNNING') {
      timeoutId = setTimeout(() => {
        setIsIdle(true);
      }, 3000);
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      setIsIdle(false);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [state]);

  const currentTask = tasks[currentTaskIndex];
  const nextTask = tasks[currentTaskIndex + 1];

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync document title for background tracking
  useEffect(() => {
    if (state === 'RUNNING') {
      const totalSprintDuration = tasks.reduce((sum, t) => sum + t.durationSec, 0);
      let elapsedSprintTime = 0;
      for (let i = 0; i < currentTaskIndex; i++) elapsedSprintTime += tasks[i].durationSec;
      if (currentTask && currentTask.subtasks && currentTask.subtasks.length > 0) {
        for (let i = 0; i < currentSubtaskIndex; i++) elapsedSprintTime += currentTask.subtasks[i].durationSec;
        elapsedSprintTime += (currentTask.subtasks[currentSubtaskIndex].durationSec - remainingSec);
      } else if (currentTask) {
        elapsedSprintTime += (currentTask.durationSec - remainingSec);
      }
      const trs = Math.max(0, totalSprintDuration - elapsedSprintTime);
      document.title = `${formatTime(trs)} - ${currentTask?.title || 'Plan & Do'}`;
    } else if (state === 'FINISHED') {
      document.title = "Sprint Complete! - Plan & Do";
    } else {
      document.title = "Plan & Do";
    }
  }, [remainingSec, state, currentTask, tasks, currentTaskIndex, currentSubtaskIndex]);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker('/timer-worker.js');
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'TICK') {
        tick();
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, [tick]);

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
      }
      frameId = requestAnimationFrame(updateLocalTimer);
    };
    frameId = requestAnimationFrame(updateLocalTimer);
    return () => cancelAnimationFrame(frameId);
  }, [state, endTime, currentTask]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        if (state === 'IDLE' || state === 'PAUSED') {
          if (state === 'PAUSED') resumeSprint(remainingSec);
          else startSprint();
        } else if (state === 'RUNNING') {
          pauseSprint(remainingSec);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, remainingSec, startSprint, pauseSprint, resumeSprint]);

  if (state === 'IDLE') return null;
  if (state === 'BREATHING') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-20 min-h-[60vh]"
        role="status"
        aria-live="polite"
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
    );
  }
  if (state === 'FINISHED') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <h2 className="text-4xl font-sans font-light tracking-wide text-foreground mb-4">Sprint Complete</h2>
        <p className="text-foreground/80 mb-8">All tasks finished. You crushed it.</p>
        
        <div className="flex flex-col items-center bg-card/50 p-6 rounded-2xl border border-foreground/5 max-w-sm w-full backdrop-blur-md shadow-sm">
          <p className="text-sm text-foreground/60 mb-4 text-center">How was your flow? Leave a genuine review to inspire others.</p>
          <textarea 
            className="neu-pressed w-full bg-transparent border-none p-3 text-sm text-foreground/80 resize-none outline-none transition-colors mb-4 rounded-xl"
            rows={3}
            placeholder="I was in the zone..."
          />
          <div className="flex w-full items-center justify-between">
            <button aria-label="Drop a heart" className="flex items-center space-x-2 text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none rounded-full px-2 py-1">
              <span>Drop a heart</span>
            </button>
            <button aria-label="Submit Review" className="neu-flat px-4 py-2 rounded-full text-xs uppercase tracking-widest text-foreground/70 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none">
              Submit Review
            </button>
          </div>
        </div>
        <button
          onClick={() => resetSprint()}
          className="mt-6 text-xs uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors"
        >
          Start New Sprint
        </button>
      </motion.div>
    );
  }

  // Calculate overall sprint progress
  const totalSprintDuration = tasks.reduce((sum, t) => sum + t.durationSec, 0);
  let elapsedSprintTime = 0;
  
  // Sum up completed tasks
  for (let i = 0; i < currentTaskIndex; i++) {
    elapsedSprintTime += tasks[i].durationSec;
  }
  
  // Sum up completed subtasks in current task
  if (currentTask && currentTask.subtasks && currentTask.subtasks.length > 0) {
    for (let i = 0; i < currentSubtaskIndex; i++) {
      elapsedSprintTime += currentTask.subtasks[i].durationSec;
    }
    // Add elapsed time of current subtask
    elapsedSprintTime += (currentTask.subtasks[currentSubtaskIndex].durationSec - remainingSec);
  } else if (currentTask) {
    elapsedSprintTime += (currentTask.durationSec - remainingSec);
  }

  const overallProgress = totalSprintDuration > 0 
    ? Math.min(1, Math.max(0, elapsedSprintTime / totalSprintDuration))
    : 0;

  const progress = overallProgress;
  const totalRemainingSec = Math.max(0, totalSprintDuration - elapsedSprintTime);

  const isLowTime = totalRemainingSec > 0 && totalRemainingSec <= 60;
  const strokeColor = "stroke-foreground";

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
        <div className="absolute bottom-0 left-0 h-[2px] bg-foreground/20 w-full">
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
            className="text-[10px] uppercase tracking-widest text-foreground/40 hover:text-foreground/80 transition-colors"
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
              if (state === 'PAUSED') resumeSprint(remainingSec);
              else if (state === 'RUNNING') pauseSprint(remainingSec);
            }}
            className="neu-pressed w-8 h-8 rounded-full transition-all flex items-center justify-center group focus-visible:outline-none"
          >
            {state === 'RUNNING' 
              ? <Pause className="w-3 h-3 text-foreground" /> 
              : <Play className="w-3 h-3 text-foreground translate-x-[1px]" />
            }
          </button>
          <button 
             onClick={() => finishTaskEarly(currentTask ? (currentTask.durationSec - remainingSec) : 0)}
             className="neu-flat w-8 h-8 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground focus-visible:outline-none"
          >
             <FastForward className="w-3 h-3" />
          </button>
          <div className="w-[1px] h-4 bg-foreground/10 mx-1" />
          <button
            onClick={toggleCompactMode}
            className="p-2 text-foreground/50 hover:text-foreground focus-visible:outline-none"
            title="Expand"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center justify-center p-8 flex-1 h-full w-full"
      onFocusCapture={() => setIsIdle(false)}
    >
      {/* Escape Hatch: Restart */}
      <button
        onClick={() => resetSprint()}
        className="absolute top-0 left-0 text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground px-3 py-1.5 border border-foreground/10 hover:border-foreground/30 rounded-full transition-all bg-foreground/5 hover:bg-foreground/10 z-50 backdrop-blur-md"
      >
        ← Restart
      </button>

      {/* Overall Sprint Progress Line */}
      <div 
        className="fixed top-0 left-0 w-full h-[2px] bg-transparent z-50"
        role="progressbar"
        aria-valuenow={Math.round(overallProgress * 100)}
        aria-valuemax={100}
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
      <motion.div 
        animate={{ opacity: state === 'RUNNING' && isIdle ? 0.05 : 0.4 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute top-0 right-8 flex items-center space-x-2 z-50 scale-90 origin-top-right transition-opacity"
      >
        <button
          onClick={toggleCompactMode}
          className="neu-flat p-1.5 rounded-full text-foreground/50 hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-foreground/50 focus-visible:outline-none"
          title="Toggle Quiet Bar"
          aria-label="Toggle Quiet Bar"
        >
          {isCompactMode ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
        </button>
        <button
          onClick={() => toggleMute()}
          className="neu-flat p-1.5 rounded-full text-foreground/50 hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-foreground/50 focus-visible:outline-none"
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        </button>
        <button
          onClick={cycleVisualizerMode}
          className="neu-flat px-3 py-1.5 flex items-center space-x-1.5 rounded-full text-[8px] uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-foreground/50 focus-visible:outline-none"
          title="Toggle Visualizer Mode"
          aria-label={`Toggle Visualizer Mode (Current: ${visualizerMode.toLowerCase()})`}
        >
          {visualizerMode === 'WATCH' && <><Watch className="w-3 h-3" /> <span>Classic</span></>}
          {visualizerMode === 'SPACE' && <><Rocket className="w-3 h-3" /> <span>Starship</span></>}
          {visualizerMode === 'MOUNTAIN' && <><Mountain className="w-3 h-3" /> <span>Mountain</span></>}
          {visualizerMode === 'RACE' && <><Flag className="w-3 h-3" /> <span>Race</span></>}
        </button>
      </motion.div>

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
              className="neu-flat flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all text-foreground/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none"
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
              resumeSprint(remainingSec);
            } else if (state === 'RUNNING') {
              pauseSprint(remainingSec);
            }
          }}
          className="neu-pressed w-20 h-20 rounded-full transition-all flex items-center justify-center group focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none"
          aria-label={state === 'RUNNING' ? 'Pause sprint' : 'Start sprint'}
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
                const elapsed = currentTask.durationSec - remainingSec;
                finishTaskEarly(elapsed);
              }}
              className="neu-flat flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all text-foreground/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none"
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
            className="h-12 mt-6 flex items-center justify-center"
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
  );
};
