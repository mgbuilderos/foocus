import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'z-10 w-full max-w-2xl flex flex-col items-center h-full  pt-12',
    'z-10 w-full flex flex-col items-center h-full pt-12'
)

with open('app/page.tsx', 'w') as f:
    f.write(content)

