# Global Evolution & Learnings Log

## Run: Architecture CoE (Persistence, Sound Design, A11y)
- **Insight 1 (Design -> A11y Handoff):** The Chief Design Officer excels at generating complex Neumorphic CSS structures but often omits `focus-visible` classes which breaks keyboard navigation. Routing through the `Accessibility_Expert` is mandatory for all custom UI components.
- **Insight 2 (QA):** The Next.js build compiler occasionally throws `ENOTFOUND` during sandbox compilation if external fonts (`next/font/google`) fail to resolve offline. QA must be aware of network-reliant assets during the strict check phase.
- **Insight 3 (Zustand):** Implementing `persist` middleware must account for hydration mismatches. The Architect successfully used `onRehydrateStorage` to sync the state without triggering server-side rendering errors.

## Run: Intelligent Setup Wizard & Minimalist Tracker
- **Insight 4 (UX Psychology):** When moving from a generic list to a strict wizard flow, state management (`useTimerStore`) must gracefully transition variables (`mainGoalTitle` into `tasks`). The Frontend Architect successfully created an intermediate holding state to achieve this.
- **Insight 5 (A11y Progress Indicators):** When building custom DOM elements for progress bars (like a 2px top edge line), the Design Officer must not forget `role="progressbar"` and the math for `aria-valuenow`. The Accessibility Expert corrected this safely.

## Run: Gamified Neumorphic Visualizers & Thought Engine
- **Insight 6 (State Routing):** The Frontend Architect cleanly utilized `cycleVisualizerMode` to cycle between dynamic UI components (`CLOCK`, `SPACE`, `MOUNTAIN`).
- **Insight 7 (Consumer A11y):** The A11y Expert correctly utilized `aria-live="polite"` on the cycle button, ensuring screen reader users are notified when the progress visualization mode changes without interrupting their flow.

## Run: Micro-interactions (Breathe & Fade)
- **Insight 8 (A11y for Fade States):** When dimming UI elements to low opacity (e.g. `opacity: 0.1` for deep focus), low-vision keyboard users can lose their place. The `Accessibility_Expert` brilliantly added `onFocusCapture` to break the idle state automatically if the user tabs into the hidden UI.

**Action Item for Future Tasks:** Any agent generating UI must inherit the `aria-label` and `focus-visible` parameters natively. Ensure `aria-live` is used on all dynamic state toggles. Always break idle/fade UI states if an `onFocus` event is captured.
