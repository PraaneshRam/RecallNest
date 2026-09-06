import { useState } from 'react'
import type { Task } from '../services/taskService'

type TaskItemProps = {
  task: Task
  busy: boolean
  onToggle: (task: Task) => Promise<boolean>
  onEdit: (task: Task, title: string) => Promise<boolean>
  onDelete: (task: Task) => Promise<void>
}

function TaskItem({ task, busy, onToggle, onEdit, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title)

  const saveEdit = async () => {
    const nextTitle = title.trim()
    if (!nextTitle || nextTitle === task.title) {
      setTitle(task.title)
      setIsEditing(false)
      return
    }
    const saved = await onEdit(task, nextTitle)
    if (saved) setIsEditing(false)
  }

  return (
    <li className={`task-item${task.completed ? ' is-complete' : ''}`}>
      <button
        className="check-button"
        type="button"
        aria-label={task.completed ? `Mark ${task.title} as pending` : `Complete ${task.title}`}
        aria-pressed={task.completed}
        disabled={busy}
        onClick={() => onToggle(task)}
      >
        {task.completed ? '✓' : ''}
      </button>
      {isEditing ? (
        <input
          className="edit-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void saveEdit()
            if (event.key === 'Escape') {
              setTitle(task.title)
              setIsEditing(false)
            }
          }}
          autoFocus
          maxLength={120}
          aria-label="Edit task title"
        />
      ) : (
        <span className="task-title">{task.title}</span>
      )}
      <div className="task-actions">
        {isEditing ? (
          <button type="button" onClick={() => void saveEdit()} disabled={busy}>Save</button>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)} disabled={busy}>Edit</button>
        )}
        <button className="delete-button" type="button" onClick={() => void onDelete(task)} disabled={busy}>Delete</button>
      </div>
    </li>
  )
}

export default TaskItem
