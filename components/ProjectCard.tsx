'use client'

import Link from 'next/link'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    created_at: string
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{project.description}</p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">
          Created {new Date(project.created_at).toLocaleDateString()}
        </span>
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View Project &rarr;
        </Link>
      </div>
    </div>
  )
}
