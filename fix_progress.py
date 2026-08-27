import re

with open('components/ProgressVisualizer.tsx', 'r') as f:
    content = f.read()

content = content.replace('className="fixed inset-0', 'className="absolute inset-0')

with open('components/ProgressVisualizer.tsx', 'w') as f:
    f.write(content)

