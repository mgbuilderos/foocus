import re

with open('components/TimerStage.tsx', 'r') as f:
    content = f.read()

content = content.replace('{Math.floor(nextTask.durationSec / 60)}m', '{Math.floor(nextTask.durationSec / 60)} minutes')
content = content.replace('>5m<', '>5 min<')

with open('components/TimerStage.tsx', 'w') as f:
    f.write(content)

