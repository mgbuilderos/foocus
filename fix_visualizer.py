import re

with open('components/ProgressVisualizer.tsx', 'r') as f:
    content = f.read()

# Replace all "fixed inset-0" with "absolute inset-0"
content = content.replace('className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent"', 'className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-transparent"')

with open('components/ProgressVisualizer.tsx', 'w') as f:
    f.write(content)

