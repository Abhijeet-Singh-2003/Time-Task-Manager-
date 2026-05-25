import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const taskFields =
    'id, title, description, status, priority, due_date, project_id, assignee_id, created_at'

  const { data: task, error } = await supabase
    .from('tasks')
    .select(taskFields)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ task })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, status, priority, due_date, assignee_id } = body

  // Fetch current task and the user's role
  const { data: existing, error: getErr } = await supabase.from('tasks').select('assignee_id').eq('id', id).single()
  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'member'

  // Determine which fields are being updated
  const updates: Record<string, unknown> = {}
  if (title       !== undefined) updates.title       = title?.trim()
  if (description !== undefined) updates.description = description?.trim()
  if (status      !== undefined) updates.status      = status
  if (priority    !== undefined) updates.priority    = priority
  if (due_date    !== undefined) updates.due_date    = due_date || null
  if (assignee_id !== undefined) updates.assignee_id = assignee_id || null

  // If the update includes anything other than `status`, require admin
  const nonStatusKeys = Object.keys(updates).filter(k => k !== 'status')
  if (nonStatusKeys.length > 0 && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If only status is being changed, allow the assignee or admin to do it
  if (Object.keys(updates).length === 1 && updates.status !== undefined) {
    const isAssignee = existing?.assignee_id === user.id
    if (!isAssignee && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const taskFields =
    'id, title, description, status, priority, due_date, project_id, assignee_id, created_at'

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select(taskFields)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task })
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can delete tasks
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'member'
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
