"use client"

import React, { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'
import TaskCard from '@/components/TaskCard'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  due_date?: string | null
  projects?: { id: string; name: string } | null
  profiles?: { id: string; name: string; email: string } | null
}

interface User {
  id: string
  name?: string
  email?: string
}

export default function TasksPage() {
  const { role } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // create form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projId, setProjId] = useState<string | null>(null)
  const [assigneeId, setAssigneeId] = useState<string | null>(null)

  useEffect(() => {
    if (role === null) return
    const load = async () => {
      setLoading(true)
      try {
        const p = await fetch('/api/projects', { credentials: 'include' })
        const pd = await p.json()
        setProjects(pd.projects ?? [])

        const u = await fetch('/api/users', { credentials: 'include' })
        const ud = await u.json()
        setUsers(ud.users ?? [])

        const tasksUrl =
          role === 'member' ? '/api/tasks?assignee=me' : '/api/tasks'
        const tRes = await fetch(tasksUrl, { credentials: 'include' })
        const td = await tRes.json()
        if (tRes.ok) setTasks(td.tasks ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [role])

  const refreshTasks = async () => {
    const tasksUrl = role === 'member' ? '/api/tasks?assignee=me' : '/api/tasks'
    const tRes = await fetch(tasksUrl, { credentials: 'include' })
    const td = await tRes.json()
    if (tRes.ok) setTasks(td.tasks ?? [])
  }

  const createTask = async () => {
    if (!title.trim() || !projId) {
      setCreateError('Title and project are required')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          project_id: projId,
          assignee_id: assigneeId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create task')
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setProjId(null)
      setAssigneeId(null)
      await refreshTasks()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    await refreshTasks()
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Tasks
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage, assign, and track the progress of all task deliverables.
              </p>
            </div>
            {role !== 'member' && (
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <button
                  onClick={() => setShowCreate(true)}
                  type="button"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Create Task
                </button>
              </div>
            )}
          </div>

          <div className="mt-6">
            {loading ? (
              <p className="text-sm text-gray-500">Loading tasks…</p>
            ) : tasks.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    showCompleteToggle={role === 'member'}
                    onToggleComplete={async (id, completed) => {
                      await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: completed ? 'completed' : 'todo' }) })
                      await refreshTasks()
                    }}
                    onDelete={role !== 'member' ? (id: string) => deleteTask(id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
        <CreateTaskModal
          open={showCreate}
          onClose={() => { setShowCreate(false); setCreateError(null) }}
          projects={projects}
          users={users}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          projId={projId}
          setProjId={setProjId}
          assigneeId={assigneeId}
          setAssigneeId={setAssigneeId}
          onCreate={createTask}
          creating={creating}
          error={createError}
        />
      </div>
    </ProtectedRoute>
  )
}

function CreateTaskModal({
  open,
  onClose,
  projects,
  users,
  title,
  setTitle,
  description,
  setDescription,
  projId,
  setProjId,
  assigneeId,
  setAssigneeId,
  onCreate,
  creating,
  error,
}: {
  open: boolean
  onClose: () => void
  projects: { id: string; name: string }[]
  users: User[]
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  projId: string | null
  setProjId: (v: string | null) => void
  assigneeId: string | null
  setAssigneeId: (v: string | null) => void
  onCreate: () => void
  creating?: boolean
  error?: string | null
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-lg">
        <h3 className="text-lg font-medium mb-4 text-black">Create Task</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <input className="w-full mb-2 p-2 border rounded text-black bg-white placeholder-gray-500 disabled:opacity-50" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} disabled={creating} />
        <textarea className="w-full mb-2 p-2 border rounded text-black bg-white placeholder-gray-500 disabled:opacity-50" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} disabled={creating} />
        <select className="w-full mb-2 p-2 border rounded text-black bg-white disabled:opacity-50" value={projId ?? ''} onChange={e => setProjId(e.target.value || null)} disabled={creating}>
          <option value="">Select project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="w-full mb-4 p-2 border rounded text-black bg-white disabled:opacity-50" value={assigneeId ?? ''} onChange={e => setAssigneeId(e.target.value || null)} disabled={creating}>
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 text-black disabled:opacity-50" onClick={onClose} disabled={creating}>Cancel</button>
          <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onClick={onCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
