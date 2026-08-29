"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function TerminalPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET || "foocus2026";

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === secret) {
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-xs">
        <form onSubmit={handleLogin} className="flex flex-col gap-4 border border-[#333] p-8 rounded-none w-80 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
          <div className="text-[#00ff00] text-center mb-4 uppercase tracking-widest text-[10px]">
            Operator Terminal
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ENTER CLEARANCE CODE"
            className="bg-black border border-[#333] text-[#00ff00] p-2 focus:outline-none focus:border-[#00ff00] transition-colors text-center uppercase placeholder:text-[#333]"
          />
          {error && <div className="text-[#ff0000] text-[10px] text-center">ACCESS DENIED</div>}
          <button
            type="submit"
            className="bg-black text-[#00ff00] border border-[#00ff00] p-2 hover:bg-[#00ff00] hover:text-black transition-colors uppercase tracking-widest text-[10px]"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return <TerminalDashboard />;
}

function TerminalDashboard() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString());
    };
    updateTime();
    const timer = setInterval(updateTime, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-[#888] font-mono text-[10px] sm:text-xs p-2 sm:p-4 selection:bg-[#00ff00] selection:text-black">
      {/* HEADER */}
      <header className="flex justify-between items-center border-b border-[#333] pb-2 mb-4">
        <div className="flex gap-4">
          <span className="text-[#00ff00] font-bold tracking-widest">SYS.TERMINAL.01</span>
          <span className="text-[#00ffff]">STATUS: ONLINE</span>
        </div>
        <div className="text-[#00ffff]">{time}</div>
      </header>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 h-[calc(100vh-80px)] overflow-hidden">
        
        {/* LEFT COLUMN: LIVE FEED & ACTIVE NODES */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full">
          <Section title="LIVE FEED" className="flex-1 flex flex-col overflow-hidden">
            <LiveFeed />
          </Section>
          
          <Section title="ACTIVE NODES" className="h-48">
            <ActiveNodes />
          </Section>
        </div>

        {/* CENTER COLUMN: GLOBAL SESSIONS & RETENTION */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 h-full">
          <Section title="GLOBAL SESSIONS" className="h-64">
            <GlobalSessions />
          </Section>
          
          <Section title="RETENTION MATRIX" className="flex-1">
            <RetentionMatrix />
          </Section>
        </div>

        {/* RIGHT COLUMN: FEATURE HEATMAP & METRICS */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full">
          <Section title="FEATURE HEATMAP" className="h-64">
            <FeatureHeatmap />
          </Section>
          
          <Section title="SYSTEM METRICS" className="flex-1">
            <SystemMetrics />
          </Section>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#333] bg-black p-2 flex flex-col ${className}`}>
      <div className="text-[#00ff00] border-b border-[#333] pb-1 mb-2 tracking-widest text-[10px] uppercase">
        {title}
      </div>
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}

function LiveFeed() {
  const logs = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    time: new Date(Date.now() - i * 15000).toISOString().split('T')[1].slice(0, -1),
    type: ["INFO", "WARN", "ERR", "OK"][Math.floor(Math.random() * 4)],
    msg: ["User initiated session", "Telemetry batch uploaded", "Connection dropped", "Ping latency 45ms", "Resource allocated"][Math.floor(Math.random() * 5)]
  }));

  return (
    <div className="overflow-y-auto h-full flex flex-col gap-1 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 black' }}>
      {logs.map(log => (
        <div key={log.id} className="flex gap-2 whitespace-nowrap">
          <span className="text-[#555]">{log.time}</span>
          <span className={
            log.type === "ERR" ? "text-[#ff0000]" : 
            log.type === "WARN" ? "text-[#ffff00]" : 
            log.type === "OK" ? "text-[#00ff00]" : "text-[#00ffff]"
          }>
            [{log.type.padEnd(4)}]
          </span>
          <span className="text-[#ccc] truncate">{log.msg}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveNodes() {
  return (
    <div className="grid grid-cols-4 gap-1 h-full content-start">
      {Array.from({ length: 32 }).map((_, i) => {
        const active = Math.random() > 0.3;
        const ping = Math.floor(Math.random() * 150);
        return (
          <div key={i} className={`border p-1 flex flex-col items-center justify-center ${active ? 'border-[#00ff00] text-[#00ff00]' : 'border-[#333] text-[#333]'}`}>
            <div className="text-[8px]">N{i.toString().padStart(2, '0')}</div>
            {active && <div className="text-[8px]">{ping}ms</div>}
          </div>
        )
      })}
    </div>
  );
}

function GlobalSessions() {
  return (
    <div className="flex items-end h-full gap-[2px] pt-4">
      {Array.from({ length: 60 }).map((_, i) => {
        const h = Math.random() * 100;
        const color = h > 80 ? 'bg-[#ff0000]' : h > 50 ? 'bg-[#00ff00]' : 'bg-[#00ffff]';
        return (
          <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
            <div className={`w-full ${color} opacity-70 group-hover:opacity-100 transition-all`} style={{ height: `${h}%` }}></div>
          </div>
        )
      })}
    </div>
  );
}

function RetentionMatrix() {
  return (
    <div className="flex flex-col h-full gap-1">
      <div className="flex text-[#00ffff] border-b border-[#333] pb-1">
        <div className="w-12">COHORT</div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 text-center">D{i}</div>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 black' }}>
        {Array.from({ length: 15 }).map((_, row) => (
          <div key={row} className="flex">
            <div className="w-12 text-[#555]">Aug {29 - row}</div>
            {Array.from({ length: 7 }).map((_, col) => {
              const val = Math.max(0, 100 - col * (10 + Math.random() * 10) - row * 2);
              const opacity = val / 100;
              return (
                <div key={col} className="flex-1 m-[1px] relative flex items-center justify-center" style={{ backgroundColor: `rgba(0, 255, 0, ${opacity * 0.5})` }}>
                  {val > 0 && <span className="relative z-10 text-[8px] text-white">{Math.round(val)}%</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureHeatmap() {
  return (
    <div className="grid grid-cols-10 grid-rows-10 gap-[1px] h-full">
      {Array.from({ length: 100 }).map((_, i) => {
        const val = Math.random();
        const bg = val > 0.9 ? 'bg-[#ff0000]' : val > 0.6 ? 'bg-[#00ff00]' : val > 0.3 ? 'bg-[#00ffff]' : 'bg-[#111]';
        return (
          <div key={i} className={`w-full h-full ${bg} hover:border hover:border-white transition-all`}></div>
        )
      })}
    </div>
  );
}

function SystemMetrics() {
  const metrics = [
    { label: "CPU_LOAD", val: "42.8%", color: "text-[#00ff00]" },
    { label: "MEM_ALLOC", val: "14.2GB", color: "text-[#00ffff]" },
    { label: "NET_TX", val: "842Mb/s", color: "text-[#00ff00]" },
    { label: "NET_RX", val: "1.2Gb/s", color: "text-[#00ff00]" },
    { label: "ERR_RATE", val: "0.01%", color: "text-[#ff0000]" },
    { label: "DB_LATENCY", val: "4ms", color: "text-[#00ff00]" },
  ];
  return (
    <div className="flex flex-col gap-2">
      {metrics.map((m, i) => (
        <div key={i} className="flex justify-between items-center border-b border-[#222] pb-1">
          <span className="text-[#888]">{m.label}</span>
          <span className={`font-bold ${m.color}`}>{m.val}</span>
        </div>
      ))}
      <div className="mt-4 p-2 border border-[#333] flex flex-col gap-1 text-[8px] text-[#555]">
        <div>{">"} KERNEL: PANIC_MODE=OFF</div>
        <div>{">"} GC: SWEEPING... OK</div>
        <div>{">"} OVERRIDE: DISABLED</div>
        <div className="mt-2 text-[#00ff00] animate-pulse">_</div>
      </div>
    </div>
  );
}
