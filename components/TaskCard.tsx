'use client'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  due_date?: string | null
  projects?: { id: string; name: string } | null
  profiles?: { id: string; name: string; email: string } | null
}

interface TaskCardProps {
  task: Task
  onClick?: (task: Task) => void
  onDelete?: (id: string) => void
  showCompleteToggle?: boolean
  onToggleComplete?: (id: string, completed: boolean) => void
}

const statusLabel: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

export default function TaskCard({
  task,
  onClick,
  onDelete,
  showCompleteToggle,
  onToggleComplete,
}: TaskCardProps) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = task.due_date ? new Date(task.due_date) : null
  const isOverdue = due && due < now && task.status !== 'done'
  const isDueSoon = due && !isOverdue && (due.getTime() - now.getTime()) <= 2 * 24 * 60 * 60 * 1000

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const assigneeName = task.profiles?.name || task.profiles?.email?.split('@')[0] || null
  const assigneeInitials = assigneeName ? assigneeName.slice(0, 2).toUpperCase() : null

  return (
    <div
      className="glass-hover"
      onClick={() => onClick?.(task)}
      style={{
        borderRadius: '14px',
        padding: '16px 18px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Complete toggle for assignees */}
      {typeof showCompleteToggle !== 'undefined' && showCompleteToggle && (
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={(e) => { e.stopPropagation(); onToggleComplete?.(task.id, e.target.checked) }}
          style={{ position: 'absolute', left: '12px', top: '12px', width: '16px', height: '16px', zIndex: 5 }}
          title={task.status === 'done' ? 'Mark as incomplete' : 'Mark as done'}
        />
      )}

      {/* Priority accent bar */}
      {task.priority && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
          borderRadius: '14px 0 0 14px',
          background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981',
        }} />
      )}

      <div style={{ paddingLeft: task.priority ? '8px' : '0' }}>
        {/* Top row: status + priority badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span className={`badge badge-${task.status}`}>
            {statusLabel[task.status] ?? task.status}
          </span>
          {task.priority && (
            <span className={`badge badge-${task.priority}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )}
          {isOverdue && <span className="badge badge-overdue">Overdue</span>}
        </div>

        {/* Title */}
        <h4 style={{
          margin: '0 0 6px',
          fontSize: '14px',
          fontWeight: 600,
          color: task.status === 'done' ? '#10b981' : '#000',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
          lineHeight: '1.4',
        }}>
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p style={{
            margin: '0 0 12px',
            fontSize: '13px',
            color: '#333',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {task.description}
          </p>
        )}

        {/* Bottom row: project + assignee + due date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Project chip */}
            {task.projects && (
              <span style={{
                fontSize: '11px', fontWeight: 500,
                color: '#000',
                background: '#e5e7eb',
                border: '1px solid #d1d5db',
                borderRadius: '6px', padding: '2px 8px',
              }}>
                {task.projects.name}
              </span>
            )}
            {/* Assignee */}
            {assigneeInitials && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700, color: '#fff',
                }}>
                  {assigneeInitials}
                </div>
                <span style={{ fontSize: '12px', color: '#000' }}>{assigneeName}</span>
              </div>
            )}
          </div>

          {/* Due date */}
          {due && (
            <span style={{
              fontSize: '11px', fontWeight: 500,
              color: isOverdue ? '#f87171' : isDueSoon ? '#fbbf24' : '#666',
              flexShrink: 0,
            }}>
              {formatDate(due)}
            </span>
          )}
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#000', padding: '8px', borderRadius: '6px',
              display: 'flex', transition: 'all .15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.color = '#000')}
            title="Delete task"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}