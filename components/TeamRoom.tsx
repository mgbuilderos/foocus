"use client";

import React, { useEffect, useState } from 'react';
import usePartySocket from 'partysocket/react';
import { useTimerStore } from '@/store/useTimerStore';
import { Users, Copy, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PartyKit is a separate service — Vercel does not host it. The host must
 * therefore be declared explicitly; it is never inferred from the page origin.
 *
 * `NEXT_PUBLIC_*` vars are inlined by Next at build time, so this has to stay a
 * literal member expression (no destructuring, no dynamic key lookup).
 *
 *   set   -> Team Room connects to that host (e.g. foocus.<user>.partykit.dev)
 *   unset -> Solo Session. No socket is created at all: no retry storm, no
 *            console noise, no heartbeat timer. In local dev we fall back to
 *            PartyKit's own dev port (1999) so `npm run party:dev` just works.
 */
const PARTYKIT_HOST: string | undefined =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ||
  (process.env.NODE_ENV === 'development' ? 'localhost:1999' : undefined);

type Peer = {
  id: string;
  state?: string;
  currentTaskIndex?: number;
  totalTasks?: number;
};

const MICRO_LABEL = "text-[8px] uppercase tracking-widest";

/**
 * Presentational shell. Owns the pill geometry (fixed 32px height keeps the
 * header baseline from shifting) so Solo and Live are visually identical
 * containers and only their contents differ.
 */
const TeamRoomShell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center space-x-3 bg-transparent px-3 h-[32px] rounded-full shadow-none backdrop-blur-md opacity-50 hover:opacity-100 transition-opacity">
    {children}
  </div>
);

/**
 * Solo Session — rendered when no PartyKit host is configured.
 *
 * Presence, invite and rename all depend on the relay, so they are omitted
 * rather than left as dead controls. What remains is an honest, on-brand
 * statement of the current mode.
 */
const TeamRoomSolo = () => (
  <TeamRoomShell>
    <div
      className="flex items-center space-x-1.5 text-slate-500"
      title="Solo session — nothing leaves this device"
    >
      <Users className="w-3 h-3" aria-hidden="true" />
      <span className={MICRO_LABEL}>Solo Session</span>
    </div>
  </TeamRoomShell>
);

/**
 * Live Team Room — only ever mounted with a real, configured host.
 */
const TeamRoomLive = ({ host, roomId }: { host: string; roomId: string }) => {
  const [copied, setCopied] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [activeRoomId, setActiveRoomId] = useState(roomId);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [inputValue, setInputValue] = useState(roomId);

  const { state, currentTaskIndex, tasks } = useTimerStore();

  const socket = usePartySocket({
    host,
    room: activeRoomId,
    onMessage: (e) => {
      // A malformed or binary frame must never take the client down.
      if (typeof e.data !== 'string') return;
      let data: any;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!data || typeof data !== 'object') return;

      if (data.type === 'SYNC_PEERS') {
        setPeers(Array.isArray(data.peers) ? data.peers : []);
      } else if (data.type === 'ROOM_RENAMED' && typeof data.newRoomId === 'string') {
        const newRoomId = data.newRoomId.trim();
        if (!newRoomId) return;
        setActiveRoomId(newRoomId);
        window.history.replaceState(null, "", `?room=${encodeURIComponent(newRoomId)}`);
      }
    }
  });

  useEffect(() => {
    // Send heartbeat — only while the socket is actually open, so nothing is
    // queued against a connecting/closed socket.
    const interval = setInterval(() => {
      if (socket.readyState !== socket.OPEN) return;
      socket.send(JSON.stringify({
        type: 'HEARTBEAT',
        state,
        currentTaskIndex,
        totalTasks: tasks.length
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [socket, state, currentTaskIndex, tasks.length]);

  const copyLink = async () => {
    const url = window.location.origin + window.location.pathname + "?room=" + activeRoomId;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Failed to copy link to clipboard.");
    }
  };

  const handleRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim()) {
      const newRoomId = inputValue.trim();
      // Unguarded on purpose: unlike a heartbeat, a rename is a one-shot
      // command peers must eventually receive, so let partysocket queue it
      // and flush on reconnect.
      socket.send(JSON.stringify({ type: 'ROOM_RENAMED', newRoomId }));
      setActiveRoomId(newRoomId);
      window.history.replaceState(null, "", `?room=${encodeURIComponent(newRoomId)}`);
    } else {
      setInputValue(activeRoomId);
    }
    setIsEditingMode(false);
  };

  return (
    <TeamRoomShell>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-slate-500">
          <Users className="w-3 h-3" aria-hidden="true" />
          <span className={`${MICRO_LABEL} mr-2`}>{peers.length + 1} Connected</span>
          {isEditingMode ? (
            <form onSubmit={handleRename} className="flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onBlur={() => handleRename()}
                autoFocus
                className={`bg-transparent ${MICRO_LABEL} text-foreground outline-none w-24 border-b border-foreground/30 focus:border-foreground/70 pb-0.5`}
                aria-label="Rename team room"
              />
            </form>
          ) : (
            <div
              onClick={() => setIsEditingMode(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsEditingMode(true);
                }
              }}
              role="button"
              tabIndex={0}
              className={`flex items-center ${MICRO_LABEL} group cursor-pointer focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none rounded`}
              title="Rename room"
              aria-label={`Room: ${activeRoomId}. Click to rename`}
            >
              <span className="text-foreground/70 group-hover:text-foreground border-b border-transparent group-hover:border-foreground/30 pb-0.5 transition-colors">{activeRoomId}</span>
              <Edit2 className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-50 transition-opacity" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex -space-x-1.5">
          {peers.length > 0 && (
            <div className="neu-flat w-5 h-5 rounded-full flex items-center justify-center text-[8px] uppercase text-foreground/50 z-10" title="You">
              ME
            </div>
          )}
          {/* Peers */}
          <AnimatePresence>
            {peers.map((peer, i) => (
              <motion.div
                key={peer.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="neu-pressed w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[8px] text-foreground z-0"
                style={{ zIndex: peers.length - i }}
                title={`Peer ${peer.id.slice(0,4)}`}
              >
                {peer.id.slice(0, 2)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={copyLink}
        className={`flex items-center space-x-1.5 px-2 py-1 rounded bg-transparent hover:bg-foreground/5 transition-colors text-slate-400 ${MICRO_LABEL} focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none`}
        aria-label={copied ? 'Invite link copied' : 'Copy invite link'}
      >
        {copied ? <Check className="w-3 h-3 text-green-400" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
        <span>{copied ? 'Copied' : 'Invite'}</span>
      </button>
    </TeamRoomShell>
  );
};

export const TeamRoom = ({ roomId }: { roomId: string }) => {
  // usePartySocket is a hook and cannot be called conditionally, so the
  // decision is made one level up: TeamRoomLive is simply never mounted
  // without a host, which means no socket is ever constructed.
  if (!PARTYKIT_HOST) return <TeamRoomSolo />;
  return <TeamRoomLive host={PARTYKIT_HOST} roomId={roomId} />;
};
