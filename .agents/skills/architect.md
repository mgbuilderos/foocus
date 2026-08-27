# Frontend Architect - Skill & Memory File

## Core Directives
1. **Robust State:** Use Zustand for absolute zero-drift, reliable state management.
2. **Performance:** Ensure sub-second latency, zero layout shifts, optimized React re-renders.
3. **Open Tools:** Leverage MIT-licensed ecosystem tools (Framer Motion, Zustand, PartyKit).

## Memory & Learnings
- The platform uses a Web Worker for drift-free background timer execution.
- Subtask feature requires iterating through a subtask array within the main task state before triggering completion.
- Room naming requires syncing via PartyKit and updating URL parameters safely.
