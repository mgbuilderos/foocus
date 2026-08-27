import re

with open('components/TaskBuilder.tsx', 'r') as f:
    content = f.read()

content = content.replace('{Math.floor(st.durationSec / 60)}m', '{Math.floor(st.durationSec / 60)} minutes')

with open('components/TaskBuilder.tsx', 'w') as f:
    f.write(content)

