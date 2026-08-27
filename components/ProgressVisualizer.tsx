import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export type VisualizerMode = 'WATCH' | 'SPACE' | 'MOUNTAIN' | 'RACE';

interface ProgressVisualizerProps {
  mode: VisualizerMode;
  progress: number; // 0 to 1
  timeString: string;
  taskTitle: string;
  timelinePoints?: number[];
}

export const ProgressVisualizer: React.FC<ProgressVisualizerProps> = ({ mode, progress, timeString, taskTitle, timelinePoints = [] }) => {
  const safeTimeline = timelinePoints.length > 0 ? timelinePoints : [1];

  // SPACE: Drifting stars (top half)
  const stars = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      left: Math.random() * 100,
      top: Math.random() * 60, // Keep stars in the upper part
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 4 + 3,
    }));
  }, []);

  // MOUNTAIN: Escalating Multi-peak generation with centered single peak
  const { mountainPath, climberX, climberY } = useMemo(() => {
    // Ensure the timeline spans the full width (0 to 1) perfectly without cutting off flatly
    const timeline = [...safeTimeline];
    if (timeline.length > 0 && timeline[timeline.length - 1] < 1) {
      timeline[timeline.length - 1] = 1;
    }

    let mPath = "0,100 ";
    const numTasks = timeline.length;
    
    timeline.forEach((p, i) => {
      const prev = i === 0 ? 0 : timeline[i-1];
      // If only 1 task, center the peak at 50%
      const peakX = numTasks === 1 ? 0.5 : prev + (p - prev) / 2;
      const peakY = numTasks === 1 ? 60 : 90 - ((i + 1) / numTasks) * 40; 
      
      mPath += `${peakX * 100},${peakY} ${p * 100},100 `;
    });
    
    let cX = progress * 100;
    let cY = 100;
    
    let currentTaskIdx = timeline.findIndex(p => progress <= p);
    if (currentTaskIdx === -1) currentTaskIdx = timeline.length - 1;
    if (currentTaskIdx === -1) currentTaskIdx = 0;
    
    const p = timeline[currentTaskIdx];
    const prev = currentTaskIdx === 0 ? 0 : timeline[currentTaskIdx - 1];
    
    const peakX = numTasks === 1 ? 0.5 : prev + (p - prev) / 2;
    const startY = 100;
    const peakY = numTasks === 1 ? 60 : 90 - ((currentTaskIdx + 1) / numTasks) * 40; 

    if (progress <= peakX) {
        const seg = (progress - prev) / (peakX - prev || 1);
        cY = startY - (seg * (startY - peakY));
    } else {
        const seg = (progress - peakX) / (p - peakX || 1);
        cY = peakY + (seg * (100 - peakY));
    }

    return { mountainPath: mPath, climberX: cX, climberY: cY };
  }, [progress, safeTimeline]);

  // SPACE: Planet Data with highly detailed inline SVGs
  const planets = [
    { size: 36, content: (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <radialGradient id="earthGlow" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#earthGlow)" />
          <path fill="#15803d" opacity="0.85" d="M 15 35 Q 30 15, 55 25 T 85 45 Q 95 70, 75 85 T 30 90 Q 5 75, 15 35 Z" />
          <path fill="#166534" opacity="0.7" d="M 10 50 Q 25 40, 45 65 T 20 85 Q 0 65, 10 50 Z" />
          <path fill="white" opacity="0.4" d="M 5 25 Q 25 10, 50 35 T 95 30 Q 100 50, 75 55 T 25 50 Q 0 40, 5 25 Z" />
        </svg>
    )},
    { size: 44, content: (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <radialGradient id="moonGlow" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="70%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#374151" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#moonGlow)" />
          <circle cx="35" cy="35" r="12" fill="#6b7280" opacity="0.5" />
          <circle cx="32" cy="32" r="8" fill="#4b5563" opacity="0.4" />
          <circle cx="70" cy="55" r="16" fill="#6b7280" opacity="0.5" />
          <circle cx="68" cy="52" r="10" fill="#4b5563" opacity="0.4" />
          <circle cx="45" cy="75" r="10" fill="#6b7280" opacity="0.5" />
          <circle cx="85" cy="25" r="8" fill="#6b7280" opacity="0.5" />
        </svg>
    )},
    { size: 54, content: (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <radialGradient id="marsGlow" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="70%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#431407" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#marsGlow)" />
          <path fill="#7c2d12" opacity="0.6" d="M 15 45 Q 35 25, 65 40 T 90 65 Q 70 90, 40 80 T 15 45 Z" />
          <circle cx="40" cy="40" r="14" fill="#7c2d12" opacity="0.5" />
          <circle cx="75" cy="65" r="12" fill="#7c2d12" opacity="0.4" />
        </svg>
    )},
    { size: 70, content: (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <radialGradient id="jupiterGlow" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="70%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#jupiterGlow)" />
          <path fill="#d97706" opacity="0.7" d="M 2 30 Q 50 25, 98 30 L 99 45 Q 50 40, 1 45 Z" />
          <path fill="#f59e0b" opacity="0.6" d="M 0 55 Q 50 50, 100 55 L 98 70 Q 50 65, 2 70 Z" />
          <circle cx="65" cy="62" r="12" fill="#92400e" opacity="0.8" />
        </svg>
    )},
    { size: 48, content: (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <radialGradient id="neptuneGlow" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="70%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#082f49" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#neptuneGlow)" />
          <path fill="#0284c7" opacity="0.5" d="M 5 40 Q 50 35, 95 40 L 98 55 Q 50 50, 2 55 Z" />
          <path fill="white" opacity="0.2" d="M 15 65 Q 40 55, 75 60 T 85 75 Q 50 65, 15 65 Z" />
        </svg>
    )}
  ];

  if (mode === 'SPACE') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent">
        <div className="absolute inset-0">
          {stars.map((star) => (
            <motion.div 
              key={star.id}
              className="absolute bg-foreground rounded-full shadow-[0_0_8px_currentColor]"
              style={{ width: star.size, height: star.size, left: `${star.left}%`, top: `${star.top}%` }}
              animate={{ opacity: [star.opacity * 0.2, star.opacity, star.opacity * 0.2] }}
              transition={{ repeat: Infinity, duration: star.duration, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Linear Interplanetary Journey Track */}
        <div className="absolute bottom-16 left-0 w-full flex flex-col justify-center opacity-90">
          <div className="w-full h-[1px] border-b border-dashed border-foreground/40 absolute top-1/2 -translate-y-1/2" />
          
          {/* Earth (Start) */}
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 rounded-full border border-foreground/20 bg-background" 
            style={{ 
              left: '5%', 
              width: planets[0].size, 
              height: planets[0].size, 
              marginLeft: -(planets[0].size/2),
              boxShadow: `0 0 20px rgba(var(--foreground),0.2)`
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
          >
            {planets[0].content}
          </motion.div>

          {/* Destination Planets */}
          {safeTimeline.map((tp, i) => {
             const planet = planets[(i + 1) % planets.length];
             return (
               <motion.div 
                 key={i} 
                 className="absolute top-1/2 -translate-y-1/2 rounded-full border border-foreground/20 bg-background" 
                 style={{ 
                   left: `calc(5% + ${tp * 90}%)`, 
                   width: planet.size, 
                   height: planet.size, 
                   marginLeft: -(planet.size/2),
                   boxShadow: `0 0 20px rgba(var(--foreground),0.2)`
                 }}
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 80 + (i * 20), ease: "linear" }}
               >
                 {planet.content}
               </motion.div>
             );
          })}
        </div>

        {/* The Starship (flying left to right) */}
        <motion.div
          className="absolute bottom-16 z-10 ml-8"
          initial={{ left: "5%" }}
          animate={{ left: `calc(5% + ${progress * 90}%)` }}
          transition={{ ease: "linear", duration: 1 }}
        >
          <div className="relative flex items-center justify-center -translate-y-1/2 drop-shadow-[0_0_15px_currentColor]">
            <motion.div 
              className="absolute right-[80%] top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-white blur-[1px] rounded-full"
              animate={{ width: [30, 50, 30], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 0.2 }}
            />
            {/* Highly detailed Rocket SVG */}
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none" className="text-foreground rotate-45 relative z-10 drop-shadow-[0_0_8px_currentColor]">
              <path d="M18.8 4.2C15.6 2 11.2 2 11.2 2s-.5 4.7-1.1 7.1L4.8 11.5c-2.3.9-3.7 2.1-3.7 2.1s2 1.7 5.2 2.7l-3.1 3.1c-1.3 1.3-1.3 3.3 0 4.5 1.3 1.3 3.3 1.3 4.5 0l3.1-3.1c1.1 3.2 2.7 5.2 2.7 5.2s1.2-1.4 2.1-3.7l2.4-5.3c2.4-.6 7.1-1.1 7.1-1.1s0-4.4-2.2-7.6c-2-3-6-4.1-6-4.1z" fill="currentColor" opacity="0.8"/>
              <path d="M15.5 11c-1.4 0-2.5-1.1-2.5-2.5S14.1 6 15.5 6 18 7.1 18 8.5 16.9 11 15.5 11z" fill="var(--background)" />
              <path d="M15.5 8.5c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1z" fill="currentColor" />
              <path d="M8 21.5l-2.5 2.5 1.5 1.5L9.5 23 8 21.5z" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === 'MOUNTAIN') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent">
        {/* High-End Dynamic Wireframe Mountains */}
        <div className="absolute bottom-0 w-full h-[40vh]">
          <svg 
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <defs>
              <linearGradient id="mountainFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Aesthetic Peaks */}
            <polygon points="20,100 60,40 100,100" fill="none" className="stroke-foreground/10" strokeWidth="0.2" />
            <polygon points="-20,100 30,50 80,100" fill="none" className="stroke-foreground/10" strokeWidth="0.2" />
            
            {/* Main Multi-Peak (maps to tasks) */}
            <polygon 
               points={`${mountainPath} 100,100 0,100`} 
               fill="url(#mountainFill)" 
               className="text-foreground stroke-foreground/40" 
               strokeWidth="0.5" 
               strokeLinejoin="round" 
            />
          </svg>

          {/* The Climber: Precision tracking dot */}
          <motion.div
            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 bg-background border border-foreground/50 rounded-full shadow-[0_0_15px_rgba(var(--foreground),1)] flex items-center justify-center"
            initial={{ left: "0%", top: "100%" }}
            animate={{ left: `${climberX}%`, top: `${climberY}%` }}
            transition={{ ease: "linear", duration: 1 }}
          >
            <div className="w-1.5 h-1.5 bg-foreground rounded-full" />
          </motion.div>
        </div>
      </div>
    );
  }

  if (mode === 'RACE') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent">
        {/* Minimalist Abstract Track */}
        <div className="absolute bottom-[10%] left-0 w-full h-32 border-y border-foreground/10 flex flex-col justify-evenly opacity-50">
          <div className="w-full h-[1px] border-b border-dashed border-foreground/20" />
          <div className="w-full h-[1px] border-b border-dashed border-foreground/20" />
          <div className="w-full h-[1px] border-b border-dashed border-foreground/20" />
          
          {/* Subtask Timeline Indicators */}
          {safeTimeline.map((tp, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-[2px] bg-foreground/20" style={{ left: `calc(5% + ${tp * 90}%)` }} />
          ))}

          {/* Finish Line Indicator */}
          <div className="absolute right-[5%] top-0 bottom-0 w-[4px] bg-foreground/40" />
        </div>

        {/* The Runner: Sleek SVG Runner */}
        <motion.div
          className="absolute bottom-[10%] mb-12 z-10"
          initial={{ left: "5%" }}
          animate={{ left: `calc(5% + ${progress * 90}%)` }}
          transition={{ ease: "linear", duration: 1 }}
        >
          <div className="relative flex items-center justify-center -ml-3 drop-shadow-[0_0_10px_rgba(var(--foreground),0.3)]">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-foreground">
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
            </svg>
            {/* Precision Speed Lines */}
            <motion.div 
              className="absolute right-full mr-2 h-[2px] bg-gradient-to-l from-foreground/50 to-transparent"
              animate={{ width: [10, 30, 10] }}
              transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};
