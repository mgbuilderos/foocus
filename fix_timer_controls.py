import re

with open('components/TimerStage.tsx', 'r') as f:
    content = f.read()

# Wrap the Restart button and Top Toggles in a max-w-2xl container
content = content.replace(
    '''      {/* Escape Hatch: Restart */}
      <button
        onClick={() => resetSprint()}
        className="absolute top-0 left-0 text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground px-3 py-1.5 border border-foreground/10 hover:border-foreground/30 rounded-full transition-all bg-foreground/5 hover:bg-foreground/10 z-50 backdrop-blur-md"
      >
        ← Restart
      </button>''',
    '''      {/* Escape Hatch: Restart */}
      <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-50">
        <div className="w-full max-w-2xl flex justify-between items-center relative pointer-events-auto">
          <button
            onClick={() => resetSprint()}
            className="text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground px-3 py-1.5 border border-foreground/10 hover:border-foreground/30 rounded-full transition-all bg-foreground/5 hover:bg-foreground/10 backdrop-blur-md"
          >
            ← Restart
          </button>
        </div>
      </div>'''
)

content = content.replace(
    '''      {/* Top Toggles */}
      <motion.div 
        animate={{ opacity: state === 'RUNNING' && isIdle ? 0.05 : 0.4 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute top-0 right-0 flex items-center space-x-2 z-50 scale-90 origin-top-right transition-opacity"
      >''',
    '''      {/* Top Toggles */}
      <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-50">
        <div className="w-full max-w-2xl flex justify-end items-center relative pointer-events-auto">
          <motion.div 
            animate={{ opacity: state === 'RUNNING' && isIdle ? 0.05 : 0.4 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="flex items-center space-x-2 scale-90 origin-top-right transition-opacity"
          >'''
)

content = content.replace(
    '''          {visualizerMode === 'WATCH' && <><Watch className="w-3 h-3" /> <span>Classic</span></>}
          {visualizerMode === 'SPACE' && <><Rocket className="w-3 h-3" /> <span>Starship</span></>}
          {visualizerMode === 'MOUNTAIN' && <><Mountain className="w-3 h-3" /> <span>Mountain</span></>}
          {visualizerMode === 'RACE' && <><Flag className="w-3 h-3" /> <span>Race</span></>}
        </button>
      </motion.div>''',
    '''          {visualizerMode === 'WATCH' && <><Watch className="w-3 h-3" /> <span>Classic</span></>}
          {visualizerMode === 'SPACE' && <><Rocket className="w-3 h-3" /> <span>Starship</span></>}
          {visualizerMode === 'MOUNTAIN' && <><Mountain className="w-3 h-3" /> <span>Mountain</span></>}
          {visualizerMode === 'RACE' && <><Flag className="w-3 h-3" /> <span>Race</span></>}
        </button>
          </motion.div>
        </div>
      </div>'''
)

with open('components/TimerStage.tsx', 'w') as f:
    f.write(content)

