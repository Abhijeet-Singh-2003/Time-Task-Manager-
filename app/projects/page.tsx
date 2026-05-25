'use client'

import React, { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'
import ProjectCard from '@/components/ProjectCard'

interface Project {
  id: string
  name: string
  description: string
  created_at: string
}

export default function ProjectsPage() {
  const { role } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch projects')
      setProjects(data.projects ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const createProject = async () => {
    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }
      setShowCreate(false)
      setName('')
      setDescription('')
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Projects
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Create and track collaborative projects across your entire team.
              </p>
            </div>
            {role !== 'member' && (
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <button
                  onClick={() => setShowCreate(true)}
                  type="button"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Create Project
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading projects…</p>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <p className="text-sm">{error}</p>
              <button onClick={fetchProjects} className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline">
                Retry
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </main>
        <CreateModal
          open={showCreate}
          onClose={() => {
            setShowCreate(false)
            setError(null)
          }}
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          onCreate={createProject}
          creating={creating}
          error={error}
        />
      </div>
    </ProtectedRoute>
  )
}

// Create modal
function CreateModal({ open, onClose, name, setName, description, setDescription, onCreate, creating, error }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-medium mb-4 text-black">Create Project</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <input
          className="w-full mb-2 p-2 border rounded text-black bg-white placeholder-gray-500 disabled:opacity-50"
          placeholder="Project name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={creating}
        />
        <textarea
          className="w-full mb-4 p-2 border rounded text-black bg-white placeholder-gray-500 disabled:opacity-50"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={creating}
        />
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-black disabled:opacity-50"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onCreate}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Include modal in default export render
