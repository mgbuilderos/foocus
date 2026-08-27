"use client";

import React, { useState } from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, X } from 'lucide-react';

type WizardStep = 'GOAL' | 'SUBTASKS' | 'READY';

export const TaskBuilder = () => {
  const { tasks, addTask, addSubtask, removeTask, state, setTasks, startSprint } = useTimerStore();
  const [step, setStep] = useState<WizardStep>('GOAL');
  const [mainGoal, setMainGoal] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
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

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    
    const mainTaskId = tasks[0]?.id;
    if (mainTaskId) {
      addSubtask(mainTaskId, { title: subtaskTitle, durationSec: 25 * 60 });
      setSubtaskTitle('');
    }
  };

  const removeSubtask = (taskId: string, subtaskIndex: number) => {
    const updatedTasks = [...tasks];
    const task = updatedTasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
      task.subtasks.splice(subtaskIndex, 1);
      task.durationSec = task.subtasks.reduce((sum, st) => sum + st.durationSec, 0);
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
                className="ml-2 w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center opacity-0 group-focus-within:opacity-100 disabled:opacity-0 transition-all duration-500 translate-x-4 group-focus-within:translate-x-0 disabled:translate-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 shadow-md"
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
                A massive goal is just a bunch of tiny tasks in a trench coat. Let's unmask them.
              </p>
            </div>

            <div className="w-full max-w-lg space-y-4">
              <form onSubmit={handleAddSubtask} className="neu-pressed flex items-center p-2 rounded-xl">
                <button type="submit" aria-label="Add subtask" className="p-2 ml-1 text-foreground/40 hover:text-foreground transition-colors focus-visible:outline-none">
                  <Plus className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask... (press Enter)"
                  aria-label="Subtask Title"
                  className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 rounded-lg text-foreground placeholder:text-foreground/30 font-sans px-2 py-2"
                  autoFocus
                />
                <div className="flex shrink-0 gap-1 pr-2">
                  {[15, 25, 45].map(m => (
                    <button 
                      key={m}
                      type="button"
                      onClick={() => {
                        if (mainTask && subtaskTitle.trim()) {
                          addSubtask(mainTask.id, { title: subtaskTitle, durationSec: m * 60 });
                          setSubtaskTitle('');
                        }
                      }}
                      className="neu-flat text-[10px] uppercase tracking-widest text-foreground/70 hover:text-foreground px-2 py-1.5 rounded-lg transition-colors focus-visible:outline-none"
                    >
                      +{m}m
                    </button>
                  ))}
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
                        {Math.floor(st.durationSec / 60)}m
                      </span>
                      <button 
                        onClick={() => removeSubtask(mainTask.id, idx)}
                        className="text-foreground/30 hover:text-foreground transition-colors p-1"
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
                onClick={(e) => {
                  // If there is text in the input but they clicked Continue, auto-add it first
                  if (subtaskTitle.trim() && mainTask) {
                    addSubtask(mainTask.id, { title: subtaskTitle, durationSec: 25 * 60 });
                    setSubtaskTitle('');
                  }
                  setStep('READY');
                }}
                disabled={(!mainTask?.subtasks?.length && !subtaskTitle.trim())}
                className="neu-flat px-8 py-3 rounded-full text-sm uppercase tracking-widest hover:text-foreground transition-colors focus-visible:outline-none disabled:opacity-50"
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
                Total focus time: {Math.floor((mainTask?.durationSec || 0) / 60)}m
              </p>
            </div>
            
            <button 
              onClick={startSprint}
              className="neu-flat px-10 py-4 rounded-full text-sm uppercase tracking-widest text-foreground/80 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
            >
              Begin Sprint
            </button>
            
            <button 
              onClick={() => setStep('SUBTASKS')}
              className="text-xs uppercase tracking-widest text-foreground/40 hover:text-foreground/70 transition-colors mt-4"
            >
              Back to Subtasks
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
