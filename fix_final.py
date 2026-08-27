import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

# Remove max-w-2xl from page layout so TimerStage can span the entire screen
content = content.replace(
    'z-10 w-full max-w-2xl flex flex-col items-center h-full max-h-[850px] pt-12',
    'z-10 w-full flex flex-col items-center h-full max-h-[850px] pt-12'
)

with open('app/page.tsx', 'w') as f:
    f.write(content)

with open('components/ProgressVisualizer.tsx', 'r') as f:
    content = f.read()

# Make ProgressVisualizer absolute inside TimerStage instead of fixed to the viewport
# This ensures its bottom aligns perfectly with TimerStage's bounds
content = content.replace('className="fixed inset-0', 'className="absolute inset-0')

# For the Race track, it currently says 'absolute bottom-[10%]'
# Change it to 'absolute bottom-8' so it anchors to the bottom of the TimerStage padding
content = content.replace('absolute bottom-[10%] left-0 w-full h-32', 'absolute bottom-8 left-0 w-full h-32')
content = content.replace('absolute bottom-[10%] mb-12 z-10', 'absolute bottom-8 mb-12 z-10')

with open('components/ProgressVisualizer.tsx', 'w') as f:
    f.write(content)

