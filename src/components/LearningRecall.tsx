import { useEffect, useMemo, useState } from 'react'
import {
  createProject,
  createLearningEntry,
  createReviewAttempt,
  deleteProject,
  deleteLearningEntry,
  generateLearningQuestions,
  getLearningEntries,
  getProjects,
  getReviewAttempts,
  type LearningEntry,
  type RecallQuestion,
  type ReviewAttempt,
  type StudyProject,
} from '../services/learningService'

type LearningRecallProps = {
  onError: (message: string) => void
}

type RecallFilter = 'all' | 'due' | 'upcoming' | 'completed'
type RecallSort = 'reminder' | 'newest' | 'alphabetical'

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value))

const getToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const isDue = (value: string) => value.slice(0, 10) <= getToday()
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function LearningRecall({ onError }: LearningRecallProps) {
  const [entries, setEntries] = useState<LearningEntry[]>([])
  const [projects, setProjects] = useState<StudyProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeQuiz, setActiveQuiz] = useState<{ entryId: string; questions: RecallQuestion[] } | null>(null)
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null)
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([])
  const [ratedAnswers, setRatedAnswers] = useState<Record<number, boolean>>({})
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [latestAttempts, setLatestAttempts] = useState<Record<string, ReviewAttempt | undefined>>({})
  const [reviewHistory, setReviewHistory] = useState<Record<string, ReviewAttempt[]>>({})
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [recallFilter, setRecallFilter] = useState<RecallFilter>('all')
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [recallSort, setRecallSort] = useState<RecallSort>('reminder')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const selectedEntries = useMemo(() => entries.filter((entry) => entry.project === selectedProjectId), [entries, selectedProjectId])

  const dashboard = useMemo(() => {
    const reviewedEntries = selectedEntries
      .map((entry) => {
        const attempts = reviewHistory[entry._id] ?? []
        if (attempts.length === 0) return null
        const average = attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total) * 100, 0) / attempts.length
        return { topic: entry.topic, average }
      })
      .filter((entry): entry is { topic: string; average: number } => entry !== null)
    const allAttempts = Object.values(reviewHistory).flat()
    const averageScore = allAttempts.length === 0
      ? 0
      : allAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total) * 100, 0) / allAttempts.length
    const strongest = reviewedEntries.length > 0 ? [...reviewedEntries].sort((first, second) => second.average - first.average)[0] : null
    const weakest = reviewedEntries.length > 0 ? [...reviewedEntries].sort((first, second) => first.average - second.average)[0] : null
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 6)
    const reviewedThisWeek = allAttempts.filter((attempt) => new Date(attempt.createdAt) >= weekStart).length
    const reviewDays = new Set(allAttempts.map((attempt) => attempt.createdAt.slice(0, 10)))
    let streak = 0
    const streakDate = new Date()
    while (reviewDays.has(dateKey(streakDate))) {
      streak += 1
      streakDate.setDate(streakDate.getDate() - 1)
    }
    const trend = [...allAttempts].reverse().slice(-8).map((attempt) => Math.round((attempt.score / attempt.total) * 100))

    return {
      total: selectedEntries.length,
      due: selectedEntries.filter((entry) => isDue(entry.reminderDate)).length,
      reviewed: reviewedEntries.length,
      average: Math.round(averageScore),
      strongest,
      weakest,
      reviewedThisWeek,
      streak,
      trend,
    }
  }, [selectedEntries, reviewHistory])

  const visibleEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filtered = selectedEntries
      .filter((entry) => recallFilter === 'all' || recallFilter === 'due' && isDue(entry.reminderDate) || recallFilter === 'upcoming' && !isDue(entry.reminderDate) || recallFilter === 'completed' && (reviewHistory[entry._id]?.length ?? 0) > 0)
      .filter((entry) => !normalizedSearch || `${entry.topic} ${entry.notes}`.toLowerCase().includes(normalizedSearch))
    return [...filtered].sort((first, second) => {
      if (recallSort === 'alphabetical') return first.topic.localeCompare(second.topic)
      if (recallSort === 'newest') return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      return new Date(first.reminderDate).getTime() - new Date(second.reminderDate).getTime()
    })
  }, [selectedEntries, recallFilter, recallSort, searchTerm, reviewHistory])

  const dueCount = selectedEntries.filter((entry) => isDue(entry.reminderDate)).length
  const upcomingCount = selectedEntries.length - dueCount
  const completedCount = selectedEntries.filter((entry) => (reviewHistory[entry._id]?.length ?? 0) > 0).length
  const calendar = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { label: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(calendarMonth), days: Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : new Date(year, month, index - firstDay + 1)) }
  }, [calendarMonth])

  const moveCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const focusCalendarDay = (day: Date) => {
    const dayEntries = selectedEntries.filter((entry) => entry.reminderDate.slice(0, 10) === dateKey(day))
    if (dayEntries.length > 0) {
      setRecallFilter('all')
      setSearchTerm(dayEntries[0].topic)
      setExpandedEntryId(dayEntries[0]._id)
    }
  }

  useEffect(() => {
    Promise.all([getProjects(), getLearningEntries()])
      .then(async ([loadedProjects, loadedEntries]) => {
        setProjects(loadedProjects)
        setSelectedProjectId((current) => current || loadedProjects[0]?._id || '')
        setEntries(loadedEntries)
        const histories = await Promise.all(loadedEntries.map(async (entry) => [entry._id, await getReviewAttempts(entry._id)] as const))
        setReviewHistory(Object.fromEntries(histories))
        setLatestAttempts(Object.fromEntries(histories.map(([id, attempts]) => [id, attempts[0]])))
      })
      .catch((reason: unknown) => onError(reason instanceof Error ? reason.message : 'Could not load learning entries.'))
      .finally(() => setIsLoading(false))
  }, [onError])

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!projectName.trim()) return
    try {
      const project = await createProject(projectName.trim())
      setProjects((current) => [...current, project])
      setSelectedProjectId(project._id)
      setProjectName('')
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : 'Could not create the study project.')
    }
  }

  const handleDeleteProject = async () => {
    const project = projects.find((item) => item._id === selectedProjectId)
    if (!project || !window.confirm(`Delete the project "${project.name}"? Concepts will become uncategorized.`)) return
    try {
      await deleteProject(project._id)
      const remaining = projects.filter((item) => item._id !== project._id)
      setProjects(remaining)
      setSelectedProjectId(remaining[0]?._id || '')
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : 'Could not delete the study project.')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const entry = await createLearningEntry({ topic: topic.trim(), notes: notes.trim(), reminderDate, projectId: selectedProjectId })
      setEntries((current) => [...current, entry].sort((first, second) => new Date(first.reminderDate).getTime() - new Date(second.reminderDate).getTime()))
      setTopic('')
      setNotes('')
      setReminderDate('')
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : 'Could not save the learning entry.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (entry: LearningEntry) => {
    if (!window.confirm(`Remove your notes about "${entry.topic}"?`)) return
    try {
      await deleteLearningEntry(entry._id)
      setEntries((current) => current.filter((item) => item._id !== entry._id))
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : 'Could not delete the learning entry.')
    }
  }

  const handleGenerateQuestions = async (entry: LearningEntry) => {
    setIsGeneratingFor(entry._id)
    try {
      const result = await generateLearningQuestions(entry._id)
      setActiveQuiz({ entryId: entry._id, questions: result.questions })
      setRevealedAnswers([])
      setRatedAnswers({})
      setSelectedAnswers({})
      const attempts = await getReviewAttempts(entry._id)
      setLatestAttempts((current) => ({ ...current, [entry._id]: attempts[0] }))
      setReviewHistory((current) => ({ ...current, [entry._id]: attempts }))
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : 'Could not generate recall questions.')
    } finally {
      setIsGeneratingFor(null)
    }
  }

  const rateQuestion = async (entry: LearningEntry, index: number, knewIt: boolean) => {
    const nextRatings = { ...ratedAnswers, [index]: knewIt }
    setRatedAnswers(nextRatings)
    if (!activeQuiz || Object.keys(nextRatings).length !== activeQuiz.questions.length) return

    setIsSavingReview(true)
    try {
      const score = Object.values(nextRatings).filter(Boolean).length
      const result = await createReviewAttempt(entry._id, score, activeQuiz.questions.length)
      setLatestAttempts((current) => ({ ...current, [entry._id]: result.attempt }))
      setReviewHistory((current) => ({ ...current, [entry._id]: [result.attempt, ...(current[entry._id] ?? [])] }))
      setEntries((current) => current.map((item) => item._id === entry._id ? result.entry : item))
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : 'Could not save review progress.')
    } finally {
      setIsSavingReview(false)
    }
  }

  return (
    <section className="learning-section" aria-labelledby="learning-heading">
      <div className="learning-heading">
        <div>
          <p className="section-label">Learning Recall</p>
          <h2 id="learning-heading">Remember what you study.</h2>
          <p className="learning-intro">Save a concept while it is fresh. On the reminder date, we will turn it into a recall session.</p>
        </div>
        <span className="recall-mark">↗</span>
      </div>

      <div className="recall-dashboard" aria-label="Learning progress summary">
        <div><strong>{dashboard.total}</strong><span>concepts</span></div>
        <div><strong>{dashboard.due}</strong><span>ready today</span></div>
        <div><strong>{dashboard.reviewed}</strong><span>topics reviewed</span></div>
        <div><strong>{dashboard.average}%</strong><span>average score</span></div>
        {dashboard.strongest && <p>Strongest so far: <b>{dashboard.strongest.topic}</b> at {Math.round(dashboard.strongest.average)}%</p>}
        {dashboard.weakest && <p>Needs attention: <b>{dashboard.weakest.topic}</b> at {Math.round(dashboard.weakest.average)}%</p>}
        <p>{dashboard.reviewedThisWeek} reviewed this week · {dashboard.streak} day streak</p>
        {dashboard.trend.length > 0 && <div className="score-trend" aria-label="Recent score trend">{dashboard.trend.map((score, index) => <span key={`${score}-${index}`} style={{ height: `${Math.max(score, 8)}%` }} title={`${score}%`} />)}</div>}
      </div>

      <div className="project-bar">
        <label>
          Study project
          <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} disabled={projects.length === 0}>
            {projects.length === 0 ? <option value="">Create your first project</option> : projects.map((project) => <option value={project._id} key={project._id}>{project.name} ({project.conceptCount})</option>)}
          </select>
        </label>
        {selectedProjectId && <button type="button" className="project-delete" onClick={() => void handleDeleteProject()}>Delete project</button>}
        <form className="project-create" onSubmit={handleCreateProject}>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New project name" maxLength={80} aria-label="New project name" />
          <button type="submit">Create project</button>
        </form>
      </div>

      <div className="reminder-calendar">
        <div className="calendar-heading">
          <button type="button" onClick={() => moveCalendarMonth(-1)} aria-label="Previous month">‹</button>
          <strong>{calendar.label}</strong>
          <button type="button" onClick={() => moveCalendarMonth(1)} aria-label="Next month">›</button>
          <span>Reminder calendar</span>
        </div>
        <div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {calendar.days.map((day, index) => {
            const reminders = day ? selectedEntries.filter((entry) => entry.reminderDate.slice(0, 10) === dateKey(day)) : []
            return <div className={`calendar-day${day && dateKey(day) === getToday() ? ' is-today' : ''}${reminders.some((entry) => isDue(entry.reminderDate)) ? ' is-overdue' : ''}`} key={day ? dateKey(day) : `blank-${index}`}>
              {day && <button type="button" onClick={() => focusCalendarDay(day)} disabled={reminders.length === 0}><span>{day.getDate()}</span>{reminders.length > 0 && <b title={reminders.map((entry) => entry.topic).join(', ')}>{reminders.length}</b>}</button>}
            </div>
          })}
        </div>
      </div>

      <form className="learning-form" onSubmit={handleSubmit}>
        <label>
          Concept
          <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. React useEffect" required maxLength={120} />
        </label>
        <label>
          Your notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What did you learn? Add an example or question..." required maxLength={2000} rows={4} />
        </label>
        <div className="learning-form-footer">
          <label>
            Remind me on
            <input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} required />
          </label>
          <button type="submit" disabled={isSaving || !selectedProjectId}>{isSaving ? 'Saving...' : 'Save for recall'}</button>
        </div>
      </form>

      <div className="recall-tabs" role="tablist" aria-label="Learning entries">
        {[
          ['all', 'All concepts', selectedEntries.length],
          ['due', 'Ready now', dueCount],
          ['upcoming', 'Upcoming', upcomingCount],
          ['completed', 'Reviewed', completedCount],
        ].map(([value, label, count]) => (
          <button
            key={value}
            className={recallFilter === value ? 'is-selected' : ''}
            type="button"
            role="tab"
            aria-selected={recallFilter === value}
            onClick={() => setRecallFilter(value as RecallFilter)}
          >
            <span>{label}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>

      <div className="recall-tools">
        <label className="search-field">
          <span className="sr-only">Search concepts</span>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search concepts and notes..." />
        </label>
        <label className="sort-field">
          <span className="sr-only">Sort concepts</span>
          <select value={recallSort} onChange={(event) => setRecallSort(event.target.value as RecallSort)}>
            <option value="reminder">Soonest reminder</option>
            <option value="newest">Recently added</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </label>
      </div>

      <div className="recall-list">
        {isLoading ? <p className="learning-status">Loading your learning trail...</p> : visibleEntries.length === 0 ? (
          <p className="learning-status">{projects.length === 0 ? 'Create a study project to begin.' : selectedEntries.length === 0 ? 'This project has no concepts yet.' : 'Nothing in this view yet.'}</p>
        ) : (
          visibleEntries.map((entry) => (
          <article className={`recall-entry${isDue(entry.reminderDate) ? ' is-due' : ''}${expandedEntryId === entry._id ? ' is-expanded' : ''}`} key={entry._id}>
            <div className="recall-entry-topline">
              <span className="recall-date">{isDue(entry.reminderDate) ? 'Ready for recall' : `Review ${formatDate(entry.reminderDate)}`}</span>
              <button type="button" onClick={() => void handleDelete(entry)} aria-label={`Delete ${entry.topic}`}>Delete</button>
            </div>
            <button className="concept-toggle" type="button" aria-expanded={expandedEntryId === entry._id} onClick={() => setExpandedEntryId((current) => current === entry._id ? null : entry._id)}>
              <h3>{entry.topic}</h3>
              <span>{expandedEntryId === entry._id ? 'Hide notes' : 'View notes'}</span>
            </button>
            {(reviewHistory[entry._id]?.length ?? 0) > 0 && (
              <div className="progress-summary">
                <span>{reviewHistory[entry._id].length} review{reviewHistory[entry._id].length === 1 ? '' : 's'}</span>
                <span>Average {Math.round(reviewHistory[entry._id].reduce((sum, attempt) => sum + (attempt.score / attempt.total) * 100, 0) / reviewHistory[entry._id].length)}%</span>
                <span>Latest {latestAttempts[entry._id]?.score}/{latestAttempts[entry._id]?.total}</span>
              </div>
            )}
            {expandedEntryId === entry._id && <p className="concept-notes">{entry.notes}</p>}
            {expandedEntryId === entry._id && isDue(entry.reminderDate) && (
              <>
                <button className="question-placeholder" type="button" onClick={() => void handleGenerateQuestions(entry)} disabled={isGeneratingFor === entry._id}>
                  {isGeneratingFor === entry._id ? 'Thinking of questions...' : activeQuiz?.entryId === entry._id ? 'Refresh questions' : 'Start recall questions'}
                </button>
                {activeQuiz?.entryId === entry._id && (
                  <div className="question-list">
                    {latestAttempts[entry._id] && <p className="review-score">Latest score: {latestAttempts[entry._id]?.score}/{latestAttempts[entry._id]?.total}</p>}
                    {activeQuiz.questions.map((item, index) => (
                      <div className="recall-question" key={`${item.question}-${index}`}>
                        <strong>{index + 1}. {item.question}</strong>
                        {item.options && item.correctAnswer && !revealedAnswers.includes(index) && (
                          <div className="answer-options">
                            {item.options.map((option) => <button type="button" className={selectedAnswers[index] === option ? 'is-chosen' : ''} key={option} onClick={() => { setSelectedAnswers((current) => ({ ...current, [index]: option })); setRevealedAnswers((current) => [...current, index]); void rateQuestion(entry, index, option === item.correctAnswer) }}>{option}</button>)}
                          </div>
                        )}
                        {revealedAnswers.includes(index) ? (
                          <>
                            <p className={item.correctAnswer && selectedAnswers[index] !== item.correctAnswer ? 'answer-wrong' : 'answer-right'}>{item.correctAnswer ? selectedAnswers[index] === item.correctAnswer ? 'Correct. ' : `Not quite. Correct answer: ${item.correctAnswer}. ` : ''}{item.answer}</p>
                            <div className="rating-actions">
                              <button type="button" className={ratedAnswers[index] === true ? 'is-rated' : ''} disabled={isSavingReview} onClick={() => void rateQuestion(entry, index, true)}>I knew it</button>
                              <button type="button" className={ratedAnswers[index] === false ? 'is-rated' : ''} disabled={isSavingReview} onClick={() => void rateQuestion(entry, index, false)}>Need review</button>
                            </div>
                          </>
                        ) : !item.options && <button type="button" onClick={() => setRevealedAnswers((current) => [...current, index])}>Reveal answer</button>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </article>
          ))
        )}
      </div>
    </section>
  )
}

export default LearningRecall
