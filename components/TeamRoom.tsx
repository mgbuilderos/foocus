"use client";

import React, { useEffect, useState } from 'react';
import usePartySocket from 'partysocket/react';
import { useTimerStore } from '@/store/useTimerStore';
import { Users, Copy, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const TeamRoom = ({ roomId }: { roomId: string }) => {
  const [copied, setCopied] = useState(false);
  const [peers, setPeers] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState(roomId);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [inputValue, setInputValue] = useState(roomId);

  const { state, currentTaskIndex, tasks } = useTimerStore();

  const socket = usePartySocket({
    host: typeof window !== 'undefined' ? window.location.host : 'localhost:3000', // In production, this would be the PartyKit host
    room: activeRoomId,
    onMessage: (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'SYNC_PEERS') {
        setPeers(data.peers);
      }
    }
  });

  useEffect(() => {
    // Send heartbeat
    const interval = setInterval(() => {
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
      setActiveRoomId(inputValue.trim());
      window.history.replaceState(null, "", `?room=${inputValue.trim()}`);
    } else {
      setInputValue(activeRoomId);
    }
    setIsEditingMode(false);
  };

  return (
    <div className="flex items-center space-x-3 bg-transparent px-3 py-1.5 rounded-full shadow-none backdrop-blur-md opacity-50 hover:opacity-100 transition-opacity">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-slate-500">
          <Users className="w-3 h-3" />
          <span className="text-[8px] uppercase tracking-widest mr-2">{peers.length + 1} Connected</span>
          {isEditingMode ? (
            <form onSubmit={handleRename} className="flex items-center">
              <input 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)}
                onBlur={() => handleRename()}
                autoFocus
                className="bg-transparent text-[8px] uppercase tracking-widest text-foreground outline-none w-24 border-b border-foreground/30 focus:border-foreground/70 pb-0.5"
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
              className="flex items-center text-[8px] uppercase tracking-widest group cursor-pointer focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none rounded"
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
        className="flex items-center space-x-1.5 px-2 py-1 rounded bg-transparent hover:bg-foreground/5 transition-colors text-slate-400 text-[8px] uppercase tracking-widest focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none"
        aria-label={copied ? 'Invite link copied' : 'Copy invite link'}
      >
        {copied ? <Check className="w-3 h-3 text-green-400" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
        <span>{copied ? 'Copied' : 'Invite'}</span>
      </button>
    </div>
  );
};
