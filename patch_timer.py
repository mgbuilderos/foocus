import re

with open('components/TimerStage.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace("Play, Pause, FastForward, Plus, Sun, Moon, Watch, Type, Volume2, VolumeX", "Play, Pause, FastForward, Plus, Sun, Moon, Watch, Rocket, Mountain, Volume2, VolumeX")
content = content.replace("import { AnalogueClock } from './AnalogueClock';", "import { AnalogueClock } from './AnalogueClock';\nimport { ProgressVisualizer } from './ProgressVisualizer';")

# 2. Update state
content = content.replace("const [clockMode, setClockMode] = useState<'DIGITAL' | 'ANALOGUE'>('DIGITAL');", "const [visualizerMode, setVisualizerMode] = useState<'WATCH' | 'SPACE' | 'MOUNTAIN'>('WATCH');\n  const cycleVisualizerMode = () => setVisualizerMode(p => p === 'WATCH' ? 'SPACE' : p === 'SPACE' ? 'MOUNTAIN' : 'WATCH');")

# 3. Update Toggle
old_toggle = """<button
              onClick={() => setClockMode(clockMode === 'DIGITAL' ? 'ANALOGUE' : 'DIGITAL')}
              className="neu-flat p-2 rounded-full text-foreground/50 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none"
              title="Toggle Clock Mode"
              aria-label="Toggle Clock Mode"
            >
              {clockMode === 'DIGITAL' ? <Watch className="w-4 h-4" /> : <Type className="w-4 h-4" />}
            </button>"""

new_toggle = """<button
              onClick={cycleVisualizerMode}
              className="neu-flat p-2 rounded-full text-foreground/50 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none"
              title="Toggle Visualizer Mode"
              aria-label="Toggle Visualizer Mode"
            >
              {visualizerMode === 'WATCH' && <Watch className="w-4 h-4" />}
              {visualizerMode === 'SPACE' && <Rocket className="w-4 h-4" />}
              {visualizerMode === 'MOUNTAIN' && <Mountain className="w-4 h-4" />}
            </button>"""

content = content.replace(old_toggle, new_toggle)

# 4. Update Clock Area
old_clock_area = """{clockMode === 'DIGITAL' ? (
          <>
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle 
                cx="50" cy="50" r="48" 
                fill="none" 
                className="stroke-foreground/20"
                strokeWidth="0.5"
              />
              <motion.circle 
                cx="50" cy="50" r="48" 
                fill="none" 
                className={`${strokeColor} transition-colors duration-1000`}
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ strokeDasharray: '301.59', strokeDashoffset: '301.59' }}
                animate={{ strokeDashoffset: 301.59 * (1 - progress) }}
                transition={{ ease: "linear", duration: 0.5 }}
              />
            </svg>
            <div className="flex flex-col items-center justify-center z-10 w-full px-8 text-center">
              <motion.span 
                key={remainingSec}
                className={`font-serif tracking-widest text-7xl font-extralight mb-2 text-foreground`}
              >
                {formatTime(remainingSec)}
              </motion.span>
              <span className="text-foreground/70 font-sans text-sm tracking-widest uppercase line-clamp-2">
                {currentTask?.title}
                {currentTask?.subtasks && currentTask.subtasks.length > 0 && currentTask.subtasks[currentSubtaskIndex] && (
                  <span className="block text-[10px] text-foreground/40 mt-1">
                    ↳ {currentTask.subtasks[currentSubtaskIndex].title}
                  </span>
                )}
              </span>
            </div>
          </>
        ) : (
          <AnalogueClock remainingSec={remainingSec} totalSec={currentTask?.durationSec || 0} />
        )}"""

new_clock_area = """{visualizerMode === 'WATCH' ? (
          <AnalogueClock remainingSec={remainingSec} totalSec={currentTask?.durationSec || 0} />
        ) : (
          <>
            <ProgressVisualizer mode={visualizerMode} progress={progress} />
            <div className="flex flex-col items-center justify-center z-10 w-full px-8 text-center pointer-events-none">
              <motion.span 
                key={remainingSec}
                className={`font-serif tracking-widest text-7xl font-extralight mb-2 text-foreground`}
              >
                {formatTime(remainingSec)}
              </motion.span>
              <span className="text-foreground/70 font-sans text-sm tracking-widest uppercase line-clamp-2">
                {currentTask?.title}
                {currentTask?.subtasks && currentTask.subtasks.length > 0 && currentTask.subtasks[currentSubtaskIndex] && (
                  <span className="block text-[10px] text-foreground/40 mt-1">
                    ↳ {currentTask.subtasks[currentSubtaskIndex].title}
                  </span>
                )}
              </span>
            </div>
          </>
        )}"""

content = content.replace(old_clock_area, new_clock_area)

with open('components/TimerStage.tsx', 'w') as f:
    f.write(content)
print("Updated TimerStage.tsx")
