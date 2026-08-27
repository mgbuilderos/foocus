import re

with open('components/TeamRoom.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="flex items-center space-x-3 bg-transparent px-3 py-1.5 rounded-full shadow-none backdrop-blur-md opacity-50 hover:opacity-100 transition-opacity">',
    '<div className="flex items-center space-x-3 bg-transparent px-3 h-[32px] rounded-full shadow-none backdrop-blur-md opacity-50 hover:opacity-100 transition-opacity">'
)

with open('components/TeamRoom.tsx', 'w') as f:
    f.write(content)

