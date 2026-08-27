import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'max-h-[850px]',
    ''
)

with open('app/page.tsx', 'w') as f:
    f.write(content)

