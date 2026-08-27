let expectedTime = 0;
let timeoutId = null;
let intervalMs = 1000;
let isRunning = false;

function step() {
  const dt = Date.now() - expectedTime; // drift
  // Send a tick to the main thread
  self.postMessage({ type: 'TICK', timestamp: Date.now() });

  expectedTime += intervalMs;
  // Next tick adjusts for the drift to maintain precision
  timeoutId = setTimeout(step, Math.max(0, intervalMs - dt));
}

self.onmessage = (e) => {
  const { command, interval } = e.data;
  
  if (command === 'START') {
    if (!isRunning) {
      isRunning = true;
      intervalMs = interval || 1000;
      expectedTime = Date.now() + intervalMs;
      timeoutId = setTimeout(step, intervalMs);
    }
  } else if (command === 'STOP') {
    isRunning = false;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
};
