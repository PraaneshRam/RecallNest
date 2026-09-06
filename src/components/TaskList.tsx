import type { Task } from '../services/taskService'
import TaskItem from './TaskItem'

type TaskListProps = {
  tasks: Task[]
  busyId: string | null
  onToggle: (task: Task) => Promise<boolean>
  onEdit: (task: Task, title: string) => Promise<boolean>
  onDelete: (task: Task) => Promise<void>
}

function TaskList({ tasks, busyId, onToggle, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark">+</span>
        <h3>Your list is clear</h3>
        <p>Add a task above and make a little progress today.</p>
      </div>
    )
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task._id}
          task={task}
          busy={busyId === task._id}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

export default TaskList
