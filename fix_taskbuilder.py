import re

with open('components/TaskBuilder.tsx', 'r') as f:
    content = f.read()

# Replace hook
content = content.replace(
    "const { tasks, addTask, addSubtask, removeTask, state, setTasks, startSprint } = useTimerStore();\n  const [step, setStep] = useState<WizardStep>('GOAL');",
    "const { tasks, addTask, addSubtask, removeTask, state, setTasks, startSprint, wizardStep: step, setWizardStep: setStep } = useTimerStore();"
)

# Replace 'm' with 'minutes'
content = content.replace('<span className="text-foreground/50 text-sm mr-2">m</span>', '<span className="text-foreground/50 text-sm mr-2">minutes</span>')

# Replace 'Total focus time: {Math.floor((mainTask?.durationSec || 0) / 60)}m' with 'Total focus time: {Math.floor((mainTask?.durationSec || 0) / 60)} minutes'
content = content.replace('Total focus time: {Math.floor((mainTask?.durationSec || 0) / 60)}m', 'Total focus time: {Math.floor((mainTask?.durationSec || 0) / 60)} minutes')

with open('components/TaskBuilder.tsx', 'w') as f:
    f.write(content)

