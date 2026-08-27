"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface AnalogueClockProps {
  remainingSec: number;
  totalSec: number;
  mode?: 'WATCH' | 'APPLE';
}

export const AnalogueClock: React.FC<AnalogueClockProps> = ({ remainingSec, totalSec, mode = 'WATCH' }) => {
  // Use absolute degrees based on total remaining seconds to avoid 360->0 snapping
  const secDegrees = (remainingSec / 60) * 360;
  const minDegrees = (remainingSec / 3600) * 360;
  const hourDegrees = (remainingSec / 43200) * 360;

  // Format remaining time as MM:SS
  const displayMin = Math.floor(remainingSec / 60);
  const displaySec = remainingSec % 60;
  const digitalTime = `${String(displayMin).padStart(2, '0')}:${String(displaySec).padStart(2, '0')}`;

  const isApple = mode === 'APPLE';

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full" role="timer" aria-label="Premium Analogue Clock">
      <div className="relative flex-1 w-full flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" aria-hidden="true">
          
          {isApple ? (
            /* APPLE WATCH FACE */
            <>
              {/* Sleek Dark Rim (optional if we just want a clean face) */}
              <circle cx="50" cy="50" r="48" fill="none" className="stroke-foreground/10" strokeWidth="1" />
              
              {/* Minimalist 12 Hour Ticks */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="50" y1="4" x2="50" y2="10"
                  className="stroke-foreground/80"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  transform={`rotate(${i * 30} 50 50)`}
                />
              ))}

              {/* Minute Dots */}
              {Array.from({ length: 60 }).map((_, i) => {
                if (i % 5 === 0) return null;
                return (
                  <line
                    key={`m-${i}`}
                    x1="50" y1="5" x2="50" y2="7"
                    className="stroke-foreground/40"
                    strokeWidth="0.75"
                    strokeLinecap="round"
                    transform={`rotate(${i * 6} 50 50)`}
                  />
                );
              })}

              {/* Hour Hand (Thick and rounded) */}
              <motion.line
                x1="50" y1="50" x2="50" y2="22"
                className="stroke-foreground"
                strokeWidth="4"
                strokeLinecap="round"
                style={{ transformOrigin: '50px 50px' }}
                animate={{ rotate: hourDegrees }}
                transition={{ type: "tween", ease: "linear", duration: 1 }}
              />

              {/* Minute Hand (Slightly thinner) */}
              <motion.line
                x1="50" y1="50" x2="50" y2="12"
                className="stroke-foreground"
                strokeWidth="3"
                strokeLinecap="round"
                style={{ transformOrigin: '50px 50px' }}
                animate={{ rotate: minDegrees }}
                transition={{ type: "tween", ease: "linear", duration: 1 }}
              />

              {/* Apple Watch Sweeping Second Hand (Vibrant Red/Orange) */}
              <motion.line
                x1="50" y1="60" x2="50" y2="10"
                stroke="#ff3b30"
                strokeWidth="1"
                strokeLinecap="round"
                style={{ transformOrigin: '50px 50px' }}
                animate={{ rotate: secDegrees }}
                transition={{ type: "tween", ease: "linear", duration: 1 }}
              />

              {/* Center Pin */}
              <circle cx="50" cy="50" r="2.5" fill="#ff3b30" />
              <circle cx="50" cy="50" r="1" fill="#000" />
            </>
          ) : (
            /* CLASSIC WATCH FACE */
            <>
              {/* Outer Rim */}
              <circle cx="50" cy="50" r="48" fill="none" className="stroke-foreground/30" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="45" fill="none" className="stroke-foreground/30" strokeWidth="2" />

              {/* 12 Hour Ticks */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="50" y1="7" x2="50" y2="12"
                  className="stroke-foreground/70"
                  strokeWidth="1"
                  strokeLinecap="round"
                  transform={`rotate(${i * 30} 50 50)`}
                />
              ))}

              {/* 60 Minute Dots (Fixed: larger and better positioned) */}
              {Array.from({ length: 60 }).map((_, i) => {
                if (i % 5 === 0) return null; // skip hour ticks
                return (
                  <circle
                    key={`m-${i}`}
                    cx="50" cy="8" r="0.8"
                    className="fill-foreground/50"
                    transform={`rotate(${i * 6} 50 50)`}
                  />
                );
              })}

              {/* Hour Hand */}
              <motion.line
                x1="50" y1="50" x2="50" y2="28"
                className="stroke-foreground"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ transformOrigin: '50px 50px' }}
                animate={{ rotate: hourDegrees }}
                transition={{ type: "tween", ease: "linear", duration: 1 }}
              />

              {/* Minute Hand */}
              <motion.line
                x1="50" y1="50" x2="50" y2="16"
                className="stroke-foreground/80"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ transformOrigin: '50px 50px' }}
                animate={{ rotate: minDegrees }}
                transition={{ type: "tween", ease: "linear", duration: 1 }}
              />

              {/* Sweeping Second Hand (Thin and elegant) */}
              <motion.line
                x1="50" y1="58" x2="50" y2="12"
                className="stroke-foreground"
                strokeWidth="0.5"
                strokeLinecap="round"
                style={{ transformOrigin: '50px 50px' }}
                animate={{ rotate: secDegrees }}
                transition={{ type: "tween", ease: "linear", duration: 1 }}
              />

              {/* Center Pin */}
              <circle cx="50" cy="50" r="2" className="fill-background stroke-foreground" strokeWidth="1" />
              <circle cx="50" cy="50" r="0.5" className="fill-foreground" />
            </>
          )}
        </svg>
      </div>
      {/* Digital time readout below the clock face */}
      <div className="font-sans tracking-widest text-2xl text-foreground/70 select-none" aria-label={`${displayMin} minutes and ${displaySec} seconds remaining`}>
        {digitalTime}
      </div>
    </div>
  );
};
