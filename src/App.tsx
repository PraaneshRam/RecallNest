import { useEffect, useMemo, useState } from 'react'
import './App.css'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import LearningRecall from './components/LearningRecall'
import AuthPage from './components/AuthPage'
import { clearSession, getSession, type AuthSession } from './services/authService'
import {
  createTask,
  deleteTask,
  getTasks,
  type Task,
  updateTask,
} from './services/taskService'

type Filter = 'all' | 'active' | 'completed'
type Page = 'dashboard' | 'learning'

function App() {
	const [session, setSession] = useState<AuthSession | null>(() => getSession())
	const [activePage, setActivePage] = useState<Page>('dashboard')
	const [tasks, setTasks] = useState<Task[]>([])
	const [filter, setFilter] = useState<Filter>('all')
	const [isLoading, setIsLoading] = useState(true)
	const [isAdding, setIsAdding] = useState(false)
	const [busyId, setBusyId] = useState<string | null>(null)
	const [error, setError] = useState('')

	useEffect(() => {
		if (!session) {
			return
		}
		getTasks()
			.then(setTasks)
			.catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load tasks.'))
			.finally(() => setIsLoading(false))
	}, [session])

	const visibleTasks = useMemo(() => {
		if (filter === 'active') return tasks.filter((task) => !task.completed)
		if (filter === 'completed') return tasks.filter((task) => task.completed)
		return tasks
	}, [filter, tasks])

	const completedCount = tasks.filter((task) => task.completed).length

	const runTaskAction = async (id: string, action: () => Promise<Task | { message: string }>) => {
		setBusyId(id)
		setError('')
		try {
			const result = await action()
			if ('_id' in result) setTasks((current) => current.map((task) => task._id === id ? result : task))
			return true
		} catch (reason: unknown) {
			setError(reason instanceof Error ? reason.message : 'Could not update the task.')
			return false
		} finally {
			setBusyId(null)
		}
	}

	const handleCreate = async (title: string) => {
		setIsAdding(true)
		setError('')
		try {
			const task = await createTask(title)
			setTasks((current) => [task, ...current])
		} catch (reason: unknown) {
			setError(reason instanceof Error ? reason.message : 'Could not create the task.')
		} finally {
			setIsAdding(false)
		}
	}

	const handleDelete = async (task: Task) => {
		if (!window.confirm(`Delete "${task.title}"?`)) return
		await runTaskAction(task._id, async () => {
			const result = await deleteTask(task._id)
			setTasks((current) => current.filter((item) => item._id !== task._id))
			return result
		})
	}

	if (!session) return <AuthPage onSuccess={setSession} />

	return (
		<main className="app-shell">
			<div className="page-glow" />
			<header className="app-header">
				<div>
					<p className="eyebrow"><span className="brand-mark">RN</span> {session.user.name}'s RecallNest</p>
					<h1>{activePage === 'dashboard' ? <>Make room for<br /><em>what matters.</em></> : <>Keep what you learn<br /><em>within reach.</em></>}</h1>
					<p className="intro">{activePage === 'dashboard' ? 'A calm place to capture the next useful thing.' : 'Turn study notes into lasting memory.'}</p>
				</div>
				{activePage === 'dashboard' && <div className="progress-badge" aria-label={`${completedCount} of ${tasks.length} tasks completed`}>
					<strong>{completedCount}</strong>
					<span>of {tasks.length}<br />complete</span>
				</div>}
			</header>
			<button className="logout-button" type="button" onClick={() => { clearSession(); setSession(null) }}>Sign out</button>

			<nav className="page-nav" aria-label="Main navigation">
				<button className={activePage === 'dashboard' ? 'is-selected' : ''} type="button" onClick={() => { setActivePage('dashboard'); setError('') }}>Dashboard</button>
				<button className={activePage === 'learning' ? 'is-selected' : ''} type="button" onClick={() => { setActivePage('learning'); setError('') }}>Learning Recall</button>
			</nav>

			{activePage === 'dashboard' ? <section className="workspace" aria-labelledby="tasks-heading">
				<div className="workspace-topline">
					<div>
						<p className="section-label">Your tasks</p>
						<h2 id="tasks-heading">The little list</h2>
					</div>
					<span className="task-count">{tasks.length} {tasks.length === 1 ? 'item' : 'items'}</span>
				</div>

				<TaskForm onCreate={handleCreate} disabled={isAdding} />

				{error && <div className="error-message" role="alert">{error}</div>}

				<div className="list-toolbar">
					<div className="filter-tabs" role="group" aria-label="Filter tasks">
						{(['all', 'active', 'completed'] as Filter[]).map((option) => (
							<button key={option} className={filter === option ? 'is-selected' : ''} type="button" onClick={() => setFilter(option)}>
								{option[0].toUpperCase() + option.slice(1)}
							</button>
						))}
					</div>
					{tasks.length > 0 && <span className="remaining-count">{tasks.length - completedCount} remaining</span>}
				</div>

				{isLoading ? <div className="loading-state"><span className="spinner" />Loading your tasks...</div> : (
					<TaskList
						tasks={visibleTasks}
						busyId={busyId}
						onToggle={(task) => runTaskAction(task._id, () => updateTask(task._id, { completed: !task.completed }))}
						onEdit={(task, title) => runTaskAction(task._id, () => updateTask(task._id, { title }))}
						onDelete={handleDelete}
					/>
				)}
			</section> : <>
				{error && <div className="error-message page-error" role="alert">{error}</div>}
				<LearningRecall onError={setError} />
			</>}
			<footer><span className="footer-brand">RecallNest</span> <span>•</span> Tasks and learning, kept close.</footer>
		</main>
	)
}

export default App
