import re

with open('components/TimerStage.tsx', 'r') as f:
    content = f.read()

content = content.replace('className="absolute top-0 right-8', 'className="absolute top-0 right-0')

with open('components/TimerStage.tsx', 'w') as f:
    f.write(content)

