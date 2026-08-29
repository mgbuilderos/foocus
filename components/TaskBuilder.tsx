"use client";

import React, { useState } from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, X } from 'lucide-react';

type WizardStep = 'GOAL' | 'SUBTASKS' | 'READY';

/**
 * Shared, on-brand focus treatment. Neumorphic surfaces have almost no edge contrast,
 * so a bare ring can disappear into the shadow — the offset lifts it clear.
 * Spelled out in full (not composed) so Tailwind's content scanner sees every class.
 */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** The subtask duration input advertises min="1" max="120"; every code path must honour it. */
const MIN_SUBTASK_MINUTES = 1;
const MAX_SUBTASK_MINUTES = 120;

export const TaskBuilder = () => {
  const { tasks, addTask, addSubtask, removeTask, state, setTasks, startSprint, wizardStep: step, setWizardStep: setStep } = useTimerStore();
  const [mainGoal, setMainGoal] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDuration, setSubtaskDuration] = useState('25');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "e.g. Design the new landing page...",
    "e.g. Write chapter 3 of the thesis...",
    "e.g. Code the authentication API...",
    "e.g. Study for the AWS certification...",
    "e.g. Plan the Q3 marketing strategy..."
  ];

  React.useEffect(() => {
    if (step !== 'GOAL') return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [step]);
  
  if (state !== 'IDLE') return null;

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainGoal.trim()) return;
    
    // Clear existing tasks to ensure a fresh sprint
    setTasks([]);
    // Add the main goal
    addTask({ title: mainGoal, durationSec: 120 * 60 }); // default to 120m 
    setStep('SUBTASKS');
  };

  /**
   * Single source of truth for the duration field. Returns minutes clamped to the same
   * bounds the <input> declares, and writes the clamped value back so the user can see
   * what was actually accepted instead of silently getting something else.
   */
  const readSubtaskMinutes = (): number | null => {
    const parsed = parseInt(subtaskDuration, 10);
    if (isNaN(parsed)) return null;
    const clamped = Math.min(MAX_SUBTASK_MINUTES, Math.max(MIN_SUBTASK_MINUTES, parsed));
    if (clamped !== parsed) setSubtaskDuration(String(clamped));
    return clamped;
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    const dur = readSubtaskMinutes();
    if (dur === null) return;
    
    const mainTaskId = tasks[0]?.id;
    if (mainTaskId) {
      addSubtask(mainTaskId, { title: subtaskTitle, durationSec: dur * 60 });
      setSubtaskTitle('');
    }
  };

  const removeSubtask = (taskId: string, subtaskIndex: number) => {
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = { ...updatedTasks[taskIndex] };
      task.subtasks = [...(task.subtasks || [])];
      task.subtasks.splice(subtaskIndex, 1);
      task.durationSec = task.subtasks.reduce((sum, st) => sum + st.durationSec, 0);
      updatedTasks[taskIndex] = task;
      setTasks(updatedTasks);
    }
  };

  const mainTask = tasks[0];

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh]">
      <AnimatePresence mode="wait">
        {step === 'GOAL' && (
          <motion.form 
            key="goal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onSubmit={handleGoalSubmit}
            className="w-full flex flex-col items-center space-y-8"
          >
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-4xl sm:text-5xl font-sans text-foreground font-medium tracking-tight">
                What will you accomplish?
              </h1>
              <p className="text-[9px] text-foreground/40 font-medium uppercase tracking-[0.4em]">
                One Goal. Zero Distractions.
              </p>
            </div>
            <div className="group w-full max-w-xl flex items-center p-2 rounded-2xl bg-foreground/[0.02] border border-foreground/10 hover:border-foreground/20 focus-within:border-foreground/30 focus-within:bg-foreground/[0.04] transition-all duration-500 relative h-16 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden">
              {mainGoal === '' && (
                <div className="absolute left-6 pointer-events-none flex space-x-1.5 z-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={placeholderIndex}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: { staggerChildren: 0.15 }
                        },
                        exit: { opacity: 0, transition: { duration: 0.3 } }
                      }}
                      className="flex space-x-1.5"
                    >
                      {placeholders[placeholderIndex].split(" ").map((word, i) => (
                        <motion.span
                          key={i}
                          variants={{
                            hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
                            visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } }
                          }}
                          className="text-foreground/30 font-sans text-lg font-light tracking-wide"
                        >
                          {word}
                        </motion.span>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
              <input 
                type="text" 
                value={mainGoal}
                onChange={(e) => setMainGoal(e.target.value)}
                aria-label="Main Goal"
                className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 rounded-lg text-foreground font-sans px-4 py-3 text-lg z-10 font-light tracking-wide"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!mainGoal.trim()}
                className={`ml-2 w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center opacity-0 group-focus-within:opacity-100 disabled:opacity-0 transition-all duration-500 translate-x-4 group-focus-within:translate-x-0 disabled:translate-x-4 shadow-md ${FOCUS_RING}`}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.form>
        )}

        {step === 'SUBTASKS' && (
          <motion.div 
            key="subtasks"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex flex-col items-center space-y-8"
          >
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-sans text-foreground font-normal tracking-tight">
                {mainTask?.title}
              </h2>
              <p className="text-sm text-foreground/50 max-w-md mx-auto font-sans leading-relaxed">
                A massive goal is just a bunch of tiny tasks.
              </p>
            </div>

            <div className="w-full max-w-lg space-y-4">
              <form onSubmit={handleAddSubtask} className="neu-pressed flex items-center p-2 rounded-xl">
                <button type="submit" aria-label="Add subtask" className={`p-2 ml-1 rounded-lg text-foreground/40 hover:text-foreground transition-colors ${FOCUS_RING}`}>
                  <Plus className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask... (press Enter)"
                  aria-label="Subtask Title"
                  className={`flex-1 bg-transparent border-0 outline-none rounded-lg text-foreground placeholder:text-foreground/30 font-sans px-2 py-2 ${FOCUS_RING}`}
                  autoFocus
                />
                <div className="flex shrink-0 items-center gap-1 pr-2">
                  <input
                    type="number"
                    value={subtaskDuration}
                    onChange={(e) => setSubtaskDuration(e.target.value)}
                    min="1"
                    max="120"
                    className={`w-16 bg-transparent border-0 outline-none rounded-lg text-foreground font-sans text-right px-1 py-2 text-sm ${FOCUS_RING}`}
                    aria-label="Subtask Duration (minutes)"
                  />
                  <span className="text-foreground/50 text-sm mr-2">minutes</span>
                  <button 
                    type="submit"
                    className={`neu-flat text-[10px] uppercase tracking-widest text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg transition-colors ${FOCUS_RING}`}
                  >
                    Add
                  </button>
                </div>
              </form>

              <div className="space-y-3 mt-6">
                {mainTask?.subtasks?.map((st, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={st.id} 
                    className="neu-flat flex items-center justify-between p-4 rounded-xl group"
                  >
                    <span className="text-foreground font-sans">{st.title}</span>
                    <div className="flex items-center space-x-4">
                      <span className="font-mono text-sm text-foreground/50 tabular-nums">
                        {Math.floor(st.durationSec / 60)} minutes
                      </span>
                      <button 
                        type="button"
                        onClick={() => removeSubtask(mainTask.id, idx)}
                        aria-label={`Remove subtask: ${st.title}`}
                        className={`text-foreground/30 hover:text-foreground transition-colors p-1 rounded-md ${FOCUS_RING}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <button 
                type="button"
                onClick={() => {
                  // If there is text in the input but they clicked Continue, auto-add it first.
                  // Goes through readSubtaskMinutes so this path obeys the same 1-120 bound
                  // as the form: previously `dur > 0` let a typed 99999 through unclamped.
                  if (subtaskTitle.trim() && mainTask) {
                    const dur = readSubtaskMinutes();
                    if (dur !== null) {
                      addSubtask(mainTask.id, { title: subtaskTitle, durationSec: dur * 60 });
                      setSubtaskTitle('');
                    }
                  }
                  setStep('READY');
                }}
                disabled={(!mainTask?.subtasks?.length && !subtaskTitle.trim())}
                className={`neu-flat px-8 py-3 rounded-full text-sm uppercase tracking-widest hover:text-foreground transition-colors disabled:opacity-50 ${FOCUS_RING}`}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {step === 'READY' && (
          <motion.div 
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center space-y-8"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-sans text-foreground font-light">You are ready.</h2>
              <p className="text-foreground/50 font-sans text-sm">
                Total focus time: {Math.floor((mainTask?.durationSec || 0) / 60)} minutes
              </p>
            </div>
            
            <button 
              onClick={startSprint}
              className={`neu-flat px-10 py-4 rounded-full text-sm uppercase tracking-widest text-foreground/80 hover:text-foreground transition-colors ${FOCUS_RING}`}
            >
              Begin Sprint
            </button>
            
            <button 
              onClick={() => setStep('SUBTASKS')}
              className={`text-xs uppercase tracking-widest text-foreground/40 hover:text-foreground/70 transition-colors mt-4 rounded-full px-3 py-1.5 ${FOCUS_RING}`}
            >
              Back to Subtasks
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
