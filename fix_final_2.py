import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

# 1. Remove max-h-[850px] to prevent shifting on mobile/safari address bar hide
content = content.replace(
    'z-10 w-full flex flex-col items-center h-full max-h-[850px] pt-12',
    'z-10 w-full flex flex-col items-center h-full pt-12'
)

# 2. Fix the header horizontal alignment by wrapping the inner contents in max-w-2xl
content = content.replace(
    '<header className="absolute top-6 left-0 w-full px-6 flex justify-between items-start z-50 h-10">',
    '''<header className="absolute top-6 left-0 w-full px-6 flex justify-center items-start z-50 h-10 pointer-events-none">
          <div className="w-full max-w-2xl flex justify-between items-center pointer-events-auto">'''
)

# Close the new inner div before the </header>
content = content.replace(
    '''          </button>
        </header>''',
    '''          </button>
          </div>
        </header>'''
)

with open('app/page.tsx', 'w') as f:
    f.write(content)

