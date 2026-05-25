'use client'

import React, { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

interface Member {
  user_id: string
  role: string
  profiles: { id: string; name: string; email: string } | null
}

interface Project {
  id: string
  name: string
  description: string
  owner_id: string
  created_at: string
  project_members?: Member[]
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  due_date?: string | null
  assignee_id?: string | null
  created_at: string
  profiles?: { id: string; name: string; email: string } | null
}

const statusLabel: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const statusClass: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}

const priorityClass: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
}

export default function ProjectDetailsPage({ params }: ProjectPageProps) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjectData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projectRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${id}`, { credentials: 'include' }),
        fetch(`/api/tasks?project_id=${id}`, { credentials: 'include' }),
      ])

      const projectData = await projectRes.json()
      const tasksData = await tasksRes.json()

      if (!projectRes.ok) {
        throw new Error(projectData.error || 'Failed to load project')
      }
      if (!tasksRes.ok) {
        throw new Error(tasksData.error || 'Failed to load tasks')
      }

      setProject(projectData.project)
      setTasks(tasksData.tasks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProjectData()
  }, [loadProjectData])

  const members = project?.project_members ?? []

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/projects"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to Projects
            </Link>
          </div>

          {loading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Project Overview</h3>
              <p className="text-gray-500 text-sm">Loading project details and members…</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={loadProjectData}
                className="mt-3 text-sm font-medium underline"
              >
                Retry
              </button>
            </div>
          ) : project ? (
            <>
              <div className="md:flex md:items-start md:justify-between mb-8 gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
                    {project.name}
                  </h2>
                  {project.description ? (
                    <p className="mt-2 text-sm text-gray-600">{project.description}</p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400 italic">No description</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href="/tasks"
                  className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shrink-0"
                >
                  Manage Tasks
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Project Overview</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Members</dt>
                      <dd className="font-medium text-gray-900">{members.length}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Tasks</dt>
                      <dd className="font-medium text-gray-900">{tasks.length}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Completed</dt>
                      <dd className="font-medium text-gray-900">
                        {tasks.filter((t) => t.status === 'completed').length}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Members</h3>
                  {members.length === 0 ? (
                    <p className="text-sm text-gray-500">No members yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {members.map((m) => {
                        const name =
                          m.profiles?.name ||
                          m.profiles?.email?.split('@')[0] ||
                          'Unknown user'
                        return (
                          <li
                            key={m.user_id}
                            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{name}</p>
                              {m.profiles?.email && (
                                <p className="text-xs text-gray-500">{m.profiles.email}</p>
                              )}
                            </div>
                            <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              {m.role}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4 gap-4">
                  <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                  <button
                    type="button"
                    onClick={loadProjectData}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Refresh
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-500 mb-4">No tasks in this project yet.</p>
                    <Link
                      href="/tasks"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Create Task
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {tasks.map((task) => {
                      const assignee =
                        task.profiles?.name ||
                        task.profiles?.email?.split('@')[0] ||
                        null
                      return (
                        <li key={task.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-semibold text-gray-900 ${
                                  task.status === 'completed' ? 'line-through text-gray-400' : ''
                                }`}
                              >
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    statusClass[task.status] ?? statusClass.todo
                                  }`}
                                >
                                  {statusLabel[task.status] ?? task.status}
                                </span>
                                {task.priority && (
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                                      priorityClass[task.priority] ?? ''
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                )}
                                {assignee && (
                                  <span className="text-xs text-gray-500">
                                    Assigned to {assignee}
                                  </span>
                                )}
                              </div>
                            </div>
                            {task.due_date && (
                              <span className="text-xs text-gray-500 shrink-0">
                                Due{' '}
                                {new Date(task.due_date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  )
}
