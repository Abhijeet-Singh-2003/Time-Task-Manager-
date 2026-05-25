import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, owner_id, created_at')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: memberRows } = await supabase
    .from('project_members')
    .select('user_id, role')
    .eq('project_id', id)

  const userIds = memberRows?.map((m) => m.user_id).filter(Boolean) ?? []
  let profilesById: Record<string, { id: string; name: string; email: string }> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds)

    profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  }

  const members = (memberRows ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    profiles: profilesById[m.user_id] ?? null,
  }))

  return NextResponse.json({ project: { ...project, project_members: members } })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: project } = await supabase.from('projects').select('owner_id').eq('id', id).single()
  if (!project || project.owner_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, description } = body

  const { data: updated, error } = await supabase
    .from('projects')
    .update({ name: name?.trim(), description: description?.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: updated })
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can delete projects
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'member'
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
