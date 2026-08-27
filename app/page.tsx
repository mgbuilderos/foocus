"use client";

import { useEffect, useState } from "react";
import { TaskBuilder } from "@/components/TaskBuilder";
import { TimerStage } from "@/components/TimerStage";
import { TeamRoom } from "@/components/TeamRoom";
import { motion, LayoutGroup } from "framer-motion";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function Home() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Generate a secure anonymous link id if not present in URL
    const params = new URLSearchParams(window.location.search);
    let id = params.get("room");
    if (!id) {
      id = "sprint-" + Math.random().toString(36).substring(2, 10);
      window.history.replaceState(null, "", `?room=${id}`);
    }
    setRoomId(id);
  }, []);

  if (!roomId) return null;

  return (
    <main className="flex h-dvh flex-col items-center justify-center p-4 relative overflow-hidden bg-transparent">
      
      {mounted && (
        <>
          <div className="absolute top-6 left-6 z-50">
            <TeamRoom roomId={roomId} />
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="absolute top-6 right-6 p-2 rounded-full border border-foreground/10 bg-foreground/5 text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-all focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none backdrop-blur-md"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </>
      )}

      <LayoutGroup>
        <motion.div layout className="z-10 w-full max-w-2xl flex flex-col items-center h-full max-h-[850px] pt-12">
          
          <motion.header layout className="mb-12 text-center shrink-0 w-full flex flex-col items-center">
            <h1 className="text-7xl font-medium tracking-[0.2em] text-foreground">FOOCUS</h1>
            <p className="text-[9px] uppercase tracking-[0.4em] text-foreground/40 mt-3">Frictionless Focus</p>
          </motion.header>

          <div className="flex-1 w-full flex flex-col justify-center min-h-0 z-10 pb-20">
            <TaskBuilder />
            <TimerStage />
          </div>
          
        </motion.div>
      </LayoutGroup>
    </main>
  );
}
