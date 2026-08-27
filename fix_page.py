import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

# Fix header alignment by wrapping in consistent flex height containers and ensuring absolute centering of cross-axis
content = content.replace(
    '<header className="absolute top-6 left-0 w-full px-6 flex justify-between items-center z-50">',
    '<header className="absolute top-6 left-0 w-full px-6 flex justify-between items-start z-50 h-10">'
)

content = content.replace(
    '<TeamRoom roomId={roomId} />',
    '<div className="flex items-center h-[32px]"><TeamRoom roomId={roomId} /></div>'
)

content = content.replace(
    'aria-label="Toggle Theme"',
    'aria-label="Toggle Theme" style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}'
)

# Remove pb-20 that pushes TimerStage up artificially
content = content.replace(
    '<div className="flex-1 w-full flex flex-col justify-center min-h-0 z-10 pb-20">',
    '<div className="flex-1 w-full flex flex-col justify-center min-h-0 z-10">'
)

with open('app/page.tsx', 'w') as f:
    f.write(content)

