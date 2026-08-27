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
    let mPath = "0,100 ";
    const numTasks = safeTimeline.length;
    
    safeTimeline.forEach((p, i) => {
      const prev = i === 0 ? 0 : safeTimeline[i-1];
      // If only 1 task, center the peak at 50%
      const peakX = numTasks === 1 ? 0.5 : prev + (p - prev) / 2;
      const peakY = numTasks === 1 ? 60 : 90 - ((i + 1) / numTasks) * 40; 
      
      mPath += `${peakX * 100},${peakY} ${p * 100},100 `;
    });
    
    let cX = progress * 100;
    let cY = 100;
    
    let currentTaskIdx = safeTimeline.findIndex(p => progress <= p);
    if (currentTaskIdx === -1) currentTaskIdx = safeTimeline.length - 1;
    if (currentTaskIdx === -1) currentTaskIdx = 0;
    
    const p = safeTimeline[currentTaskIdx];
    const prev = currentTaskIdx === 0 ? 0 : safeTimeline[currentTaskIdx - 1];
    
    const peakX = numTasks === 1 ? 0.5 : prev + (p - prev) / 2;
    const startY = currentTaskIdx === 0 ? 100 : 100;
    const peakY = numTasks === 1 ? 60 : 90 - ((currentTaskIdx + 1) / numTasks) * 40; 

    if (progress < peakX) {
        const seg = (progress - prev) / (peakX - prev || 1);
        cY = startY - (seg * (startY - peakY));
    } else {
        const seg = (progress - peakX) / (p - peakX || 1);
        cY = peakY + (seg * (100 - peakY));
    }

    return { mountainPath: mPath, climberX: cX, climberY: cY };
  }, [progress, safeTimeline]);

  // SPACE: Planet Data with realistic radial gradients and rotation
  const planets = [
    { size: 28, bg: "radial-gradient(circle at 40% 40%, rgba(34,139,34,0.6) 10%, transparent 30%), radial-gradient(circle at 70% 60%, rgba(34,139,34,0.5) 15%, transparent 35%), radial-gradient(circle at 30% 30%, #4b6cb7 0%, #182848 80%, #0a1128 100%)", shadow: "rgba(75,108,183,0.4)" },
    { size: 40, bg: "radial-gradient(circle at 25% 25%, rgba(0,0,0,0.3) 5%, transparent 10%), radial-gradient(circle at 60% 40%, rgba(0,0,0,0.25) 8%, transparent 15%), radial-gradient(circle at 45% 75%, rgba(0,0,0,0.35) 6%, transparent 12%), radial-gradient(circle at 30% 30%, #a8b0c3 0%, #4a5568 80%, #2a303c 100%)", shadow: "rgba(168,176,195,0.3)" },
    { size: 52, bg: "radial-gradient(circle at 30% 30%, #c05e46 0%, #5a1e12 80%, #2d0f09 100%)", shadow: "rgba(192,94,70,0.4)" },
    { size: 68, bg: "radial-gradient(circle at 30% 30%, #d4a373 0%, #8a5a44 80%, #452d22 100%)", shadow: "rgba(212,163,115,0.3)" },
    { size: 44, bg: "radial-gradient(circle at 30% 30%, #e9c46a 0%, #8c6d31 80%, #463618 100%)", shadow: "rgba(233,196,106,0.3)" }
  ];

  if (mode === 'SPACE') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent">
        <div className="absolute inset-0">
          {stars.map((star) => (
            <motion.div 
              key={star.id}
              className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ width: star.size, height: star.size, left: `${star.left}%`, top: `${star.top}%` }}
              animate={{ opacity: [star.opacity * 0.2, star.opacity, star.opacity * 0.2] }}
              transition={{ repeat: Infinity, duration: star.duration, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Linear Interplanetary Journey Track */}
        <div className="absolute bottom-16 left-0 w-full flex flex-col justify-center opacity-90">
          <div className="w-full h-[1px] border-b border-dashed border-foreground/10 absolute top-1/2 -translate-y-1/2" />
          
          {/* Earth (Start) */}
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 rounded-full border border-black/50" 
            style={{ 
              left: '5%', 
              width: planets[0].size, 
              height: planets[0].size, 
              marginLeft: -(planets[0].size/2),
              background: planets[0].bg,
              boxShadow: `0 0 25px ${planets[0].shadow}, inset -6px -6px 12px rgba(0,0,0,0.6)`
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
          />

          {/* Destination Planets */}
          {safeTimeline.map((tp, i) => {
             const planet = planets[(i + 1) % planets.length];
             return (
               <motion.div 
                 key={i} 
                 className="absolute top-1/2 -translate-y-1/2 rounded-full border border-black/50" 
                 style={{ 
                   left: `calc(5% + ${tp * 90}%)`, 
                   width: planet.size, 
                   height: planet.size, 
                   marginLeft: -(planet.size/2),
                   background: planet.bg,
                   boxShadow: `0 0 25px ${planet.shadow}, inset -6px -6px 12px rgba(0,0,0,0.6)`
                 }}
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 80 + (i * 20), ease: "linear" }}
               />
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
          <div className="relative flex items-center justify-center -translate-y-1/2 drop-shadow-[0_0_15px_rgba(var(--foreground),0.8)]">
            <motion.div 
              className="absolute right-[80%] top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-white blur-[1px] rounded-full"
              animate={{ width: [30, 50, 30], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 0.2 }}
            />
            {/* Realistic Rocket SVG pointing Right */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground fill-foreground/10 rotate-45 relative z-10">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="m12 15-3-3a22 22 0 0 1 3.82-13.82 2.1 2.1 0 0 1 3.82 1.63L16 6l3.5 1.23a2.1 2.1 0 0 1 1.63 3.82A22 22 0 0 1 15 12z"/>
              <path d="m9 15 2 2"/>
              <path d="m15 9 2 2"/>
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
