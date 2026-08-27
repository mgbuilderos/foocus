"use client";

import { useState, useEffect } from "react";
import { getAllSessions, getStats, clearAllSessions } from "@/lib/telemetry";
import type { SprintSession, TelemetryStats } from "@/lib/telemetry";
import { motion, AnimatePresence } from "framer-motion";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [sessions, setSessions] = useState<SprintSession[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET || "foocus2026";

  const handleLogin = () => {
    if (password === secret) {
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    if (authenticated) {
      setStats(getStats());
      setSessions(getAllSessions());
    }
  }, [authenticated]);

  const handleClear = () => {
    clearAllSessions();
    setStats(getStats());
    setSessions([]);
    setConfirmClear(false);
  };

  // ── Password Gate ──
  if (!authenticated) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-background text-foreground p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 w-full max-w-sm"
        >
          <h1 className="text-4xl font-medium tracking-[0.2em]">FOOCUS</h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/40">
            Admin Panel
          </p>
          <div className="w-full flex flex-col gap-3 mt-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter admin secret"
              className="w-full px-4 py-3 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground text-sm tracking-widest placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30 transition-colors"
            />
            {error && (
              <p className="text-red-400 text-[10px] uppercase tracking-widest">
                Invalid secret
              </p>
            )}
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-foreground/10 border border-foreground/10 rounded-xl text-foreground text-[11px] uppercase tracking-[0.3em] hover:bg-foreground/20 hover:border-foreground/20 transition-all"
            >
              Enter
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  // ── Dashboard ──
  const metricCards = [
    {
      label: "Total Focus",
      value: stats ? formatDuration(stats.totalFocusSeconds) : "—",
    },
    {
      label: "Sprints",
      value: stats ? stats.totalSprints.toString() : "—",
    },
    {
      label: "Avg Length",
      value: stats ? formatDuration(stats.averageSprintLengthSec) : "—",
    },
    {
      label: "Completion",
      value: stats ? `${stats.completionRate}%` : "—",
    },
    {
      label: "Tasks Done",
      value: stats ? stats.totalTasksCompleted.toString() : "—",
    },
    {
      label: "Tasks Created",
      value: stats ? stats.totalTasksCreated.toString() : "—",
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-medium tracking-[0.2em]">FOOCUS</h1>
            <p className="text-[9px] uppercase tracking-[0.4em] text-foreground/40 mt-1">
              Telemetry Dashboard
            </p>
          </div>
          <a
            href="/"
            className="text-[10px] uppercase tracking-widest text-foreground/50 hover:text-foreground border border-foreground/10 px-4 py-2 rounded-full hover:border-foreground/30 transition-all"
          >
            ← Back to App
          </a>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="bg-foreground/[0.03] border border-foreground/[0.06] rounded-2xl p-5 flex flex-col items-center gap-2"
            >
              <span className="text-2xl sm:text-3xl font-light tracking-wider">
                {card.value}
              </span>
              <span className="text-[8px] uppercase tracking-[0.3em] text-foreground/40">
                {card.label}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Sessions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-foreground/60">
              Recent Sessions
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setStats(getStats());
                  setSessions(getAllSessions());
                }}
                className="text-[9px] uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors"
              >
                Refresh
              </button>
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-[9px] uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Clear All
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-widest text-red-400">
                    Confirm?
                  </span>
                  <button
                    onClick={handleClear}
                    className="text-[9px] uppercase tracking-widest text-red-400 border border-red-400/30 px-3 py-1 rounded-full hover:bg-red-400/10 transition-all"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-[9px] uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="border border-foreground/[0.06] rounded-2xl p-12 flex items-center justify-center">
              <p className="text-foreground/30 text-[11px] uppercase tracking-[0.3em]">
                No sessions recorded yet. Complete a sprint to see data here.
              </p>
            </div>
          ) : (
            <div className="border border-foreground/[0.06] rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_100px_1fr_80px] sm:grid-cols-[1fr_100px_2fr_80px] gap-4 px-5 py-3 border-b border-foreground/[0.06] bg-foreground/[0.02]">
                <span className="text-[8px] uppercase tracking-[0.3em] text-foreground/40">
                  Date
                </span>
                <span className="text-[8px] uppercase tracking-[0.3em] text-foreground/40">
                  Duration
                </span>
                <span className="text-[8px] uppercase tracking-[0.3em] text-foreground/40">
                  Tasks
                </span>
                <span className="text-[8px] uppercase tracking-[0.3em] text-foreground/40 text-right">
                  Status
                </span>
              </div>

              {/* Table Rows */}
              <AnimatePresence>
                {sessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-[1fr_100px_1fr_80px] sm:grid-cols-[1fr_100px_2fr_80px] gap-4 px-5 py-3.5 border-b border-foreground/[0.03] hover:bg-foreground/[0.02] transition-colors"
                  >
                    <span className="text-sm text-foreground/70 tabular-nums">
                      {formatDate(session.completedAt)}
                    </span>
                    <span className="text-sm text-foreground/70 font-mono tabular-nums">
                      {formatDuration(session.totalDurationSec)}
                    </span>
                    <span className="text-sm text-foreground/50 truncate">
                      {session.tasks.map((t) => t.title).join(", ")}
                    </span>
                    <span
                      className={`text-[9px] uppercase tracking-widest text-right ${
                        session.status === "completed"
                          ? "text-emerald-400/70"
                          : "text-amber-400/70"
                      }`}
                    >
                      {session.status}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[8px] uppercase tracking-[0.4em] text-foreground/20 mt-12">
          Data stored locally in your browser
        </p>
      </motion.div>
    </main>
  );
}
