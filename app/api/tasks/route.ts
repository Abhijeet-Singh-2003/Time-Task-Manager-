import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const taskFields =
  'id, title, description, status, priority, due_date, project_id, assignee_id, created_at'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get role first
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const userRole = profile?.role ?? 'member'

  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')
  const status = searchParams.get('status')
  const assignee = searchParams.get('assignee')

  let tasksQuery = supabase
    .from('tasks')
    .select(taskFields)
    .order('created_at', { ascending: false })

  if (userRole === 'member' || assignee === 'me') {
    // Members always see only their assigned tasks
    tasksQuery = tasksQuery.eq('assignee_id', user.id)
  } else {
    // Admin: filter by project or accessible projects
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)

    const { data: owned } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)

    const accessibleProjectIds = [
      ...new Set([
        ...(memberships?.map((m) => m.project_id).filter(Boolean) ?? []),
        ...(owned?.map((p) => p.id) ?? []),
      ]),
    ]

    if (project_id) {
      tasksQuery = tasksQuery.eq('project_id', project_id)
    } else if (accessibleProjectIds.length > 0) {
      tasksQuery = tasksQuery.in('project_id', accessibleProjectIds)
    } else {
      return NextResponse.json({ tasks: [] })
    }

    // Admin can also filter by a specific assignee
    if (assignee && assignee !== 'me') {
      tasksQuery = tasksQuery.eq('assignee_id', assignee)
    }
  }

  if (status && status !== 'overdue') tasksQuery = tasksQuery.eq('status', status)

  const { data: tasks, error } = await tasksQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = new Date().toISOString().split('T')[0]
  const filtered =
    status === 'overdue'
      ? (tasks ?? []).filter(
          (t) => t.due_date && t.due_date < now && t.status !== 'done'
        )
      : (tasks ?? [])

  const projectIds = [...new Set(filtered.map((t) => t.project_id).filter(Boolean))]
  const assigneeIds = [...new Set(filtered.map((t) => t.assignee_id).filter(Boolean))]

  let projectsById: Record<string, { id: string; name: string }> = {}
  let profilesById: Record<string, { id: string; name: string; email: string }> = {}

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds)
    projectsById = Object.fromEntries((projects ?? []).map((p) => [p.id, p]))
  }

  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', assigneeIds)
    profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  }

  const tasksWithDetails = filtered.map((t) => ({
    ...t,
    projects: t.project_id ? projectsById[t.project_id] ?? null : null,
    profiles: t.assignee_id ? profilesById[t.assignee_id] ?? null : null,
  }))

  return NextResponse.json({ tasks: tasksWithDetails })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = profile?.role ?? 'member'
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { title, description, status, priority, due_date, project_id, assignee_id } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!project_id) return NextResponse.json({ error: 'project_id is required' }, { status: 400 })

  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .maybeSingle()

  if (projectErr || !project) {
    return NextResponse.json(
      { error: projectErr?.message || 'Project not found or access denied' },
      { status: 404 }
    )
  }

  const insertPayload: Record<string, unknown> = {
    title: title.trim(),
    description: description?.trim() ?? '',
    status: status ?? 'todo',
    priority: priority ?? 'medium',
    project_id,
    assignee_id: assignee_id ?? null,
    creator_id: user.id,
    due_date: due_date || null,
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(insertPayload)
    .select(taskFields)
    .single()

  if (error) {
    console.error('Task insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: projectInfo } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', project_id)
    .maybeSingle()

  return NextResponse.json(
    { task: { ...task, projects: projectInfo ?? null } },
    { status: 201 }
  )
}