'use client'

import React, { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import TaskCard from '@/components/TaskCard'
import ProjectCard from '@/components/ProjectCard'

// ✅ Fixed to match DB schema exactly
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

interface Project {
  id: string
  name: string
  description: string
  created_at: string
}

export default function DashboardPage() {
  const { user, role } = useAuth()
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const isMember = role === 'member'
  const isAdmin = role === 'admin'

  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [users, setUsers] = useState<{ id: string; email: string; name?: string; role?: string }[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchTasks = async () => {
    setLoadingTasks(true)
    setTasksError(null)
    try {
      // ✅ API already handles role filtering server-side
      // member → only their assigned tasks
      // admin → all accessible project tasks
      const res = await fetch('/api/tasks', { credentials: 'include' })
      const data = await res.json()
      console.log('[DEBUG Dashboard] Tasks response:', { status: res.status, data, role, isMember })
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks')
      setTasks(data.tasks ?? [])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load tasks'
      console.error('[DEBUG Dashboard] Failed to fetch tasks:', errorMsg)
      setTasksError(errorMsg)
      setTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

  const fetchProjects = async () => {
    setLoadingProjects(true)
    try {
      const res = await fetch('/api/projects', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setProjects(data.projects ?? [])
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setUsers(data.users ?? [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  useEffect(() => {
    if (role === null) return
    fetchTasks()
    if (isAdmin) {
      fetchProjects()
      fetchUsers()
    }
  }, [role])

  const openCreateModal = () => {
    setCreateError(null)
    setProjectName('')
    setProjectDescription('')
    setSelectedMembers([])
    setShowCreate(true)
  }

  const createProject = async () => {
    if (!projectName.trim()) {
      setCreateError('Project name is required')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim(),
          memberIds: selectedMembers,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')
      setShowCreate(false)
      setSelectedMembers([])
      await fetchProjects()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  // ✅ Only called by admins — API also enforces this
  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete task')
      // ✅ Remove from state immediately instead of refetching
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  // ✅ Fixed: 'done' not 'completed'
  const completedCount = tasks.filter((t) => t.status === 'done').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const pendingCount = tasks.filter((t) => t.status !== 'done').length

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Welcome back, {userName}!
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {isMember
                  ? 'View your assigned work from the Tasks page.'
                  : 'Here is what is happening with your projects and tasks today.'}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 gap-2">
              <Link
                href="/tasks"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Tasks
              </Link>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  <span aria-hidden="true">+</span>
                  Create Project
                </button>
              )}
            </div>
          </div>

          {isMember ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                  <dt className="text-sm font-medium text-gray-500">Tasks Assigned</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {loadingTasks ? '…' : tasks.length}
                  </dd>
                </div>
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                  <dt className="text-sm font-medium text-gray-500">Completed</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {loadingTasks ? '…' : completedCount}
                  </dd>
                </div>
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                  <dt className="text-sm font-medium text-gray-500">In Progress</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {loadingTasks ? '…' : inProgressCount}
                  </dd>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4 gap-4">
                  <h3 className="text-lg font-medium text-gray-900">Your Tasks</h3>
                  <button
                    type="button"
                    onClick={fetchTasks}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Refresh
                  </button>
                </div>
                {loadingTasks ? (
                  <p className="text-sm text-gray-500">Loading tasks…</p>
                ) : tasksError ? (
                  <div className="text-sm text-red-600">
                    <p>{tasksError}</p>
                    <button type="button" onClick={fetchTasks} className="mt-2 underline">
                      Retry
                    </button>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm text-gray-500 mt-4">No tasks assigned yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {tasks.map((t) => (
                      // ✅ Members never get onDelete
                      <TaskCard key={t.id} task={t} onDelete={undefined} />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                  <dt className="text-sm font-medium text-gray-500">Active Projects</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {loadingProjects ? '…' : projects.length}
                  </dd>
                </div>
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                  <dt className="text-sm font-medium text-gray-500">Tasks Completed</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {loadingTasks ? '…' : completedCount}
                  </dd>
                </div>
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                  <dt className="text-sm font-medium text-gray-500">Pending Tasks</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {loadingTasks ? '…' : pendingCount}
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Projects</h3>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shrink-0"
                    >
                      <span aria-hidden="true">+</span>
                      New Project
                    </button>
                  </div>
                  {loadingProjects ? (
                    <p className="text-sm text-gray-500">Loading projects…</p>
                  ) : projects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No projects yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                      {projects.slice(0, 3).map((p) => (
                        <ProjectCard key={p.id} project={p} />
                      ))}
                      {projects.length > 3 && (
                        <Link
                          href="/projects"
                          className="block text-center py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          View all {projects.length} projects →
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Tasks</h3>
                    <button
                      type="button"
                      onClick={fetchTasks}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>
                  {loadingTasks ? (
                    <p className="text-sm text-gray-500">Loading tasks…</p>
                  ) : tasksError ? (
                    <div className="text-sm text-red-600">
                      <p>{tasksError}</p>
                      <button type="button" onClick={fetchTasks} className="mt-2 underline">
                        Retry
                      </button>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 mb-4">No tasks yet.</p>
                      <Link
                        href="/tasks"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Manage Tasks
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                      {tasks.slice(0, 5).map((t) => (
                        // ✅ Only admins get delete
                        <TaskCard key={t.id} task={t} onDelete={deleteTask} />
                      ))}
                      {tasks.length > 5 && (
                        <Link
                          href="/tasks"
                          className="block text-center py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          View all {tasks.length} tasks →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {showCreate && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black opacity-30"
              onClick={() => { setShowCreate(false); setCreateError(null) }}
            />
            <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4 text-gray-900">Create Project</h3>
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {createError}
                </div>
              )}
              <input
                className="w-full mb-2 p-2 border rounded text-gray-900 bg-white placeholder-gray-500 disabled:opacity-50"
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={creating}
              />
              <textarea
                className="w-full mb-4 p-2 border rounded text-gray-900 bg-white placeholder-gray-500 disabled:opacity-50"
                placeholder="Description (optional)"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                disabled={creating}
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Members (optional)</label>
                <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto space-y-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500">No users available</p>
                  ) : (
                    users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, u.id])
                            } else {
                              setSelectedMembers(selectedMembers.filter((id) => id !== u.id))
                            }
                          }}
                          disabled={creating}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-900">{u.name || u.email} {u.role === 'admin' ? '(Admin)' : ''}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 disabled:opacity-50"
                  onClick={() => { setShowCreate(false); setCreateError(null) }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  onClick={createProject}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}