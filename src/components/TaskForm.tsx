import { useState } from 'react'

type TaskFormProps = {
  onCreate: (title: string) => Promise<void>
  disabled?: boolean
}

function TaskForm({ onCreate, disabled = false }: TaskFormProps) {
  const [title, setTitle] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    await onCreate(trimmedTitle)
    setTitle('')
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="new-task">Task title</label>
      <input
        id="new-task"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What needs to get done?"
        maxLength={120}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !title.trim()}>
        {disabled ? 'Adding...' : 'Add task'}
      </button>
    </form>
  )
}

export default TaskForm
