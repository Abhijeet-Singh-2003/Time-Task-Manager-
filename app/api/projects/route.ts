import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type ProjectRow = {
  id: string
  name: string
  description: string
  owner_id: string
  created_at: string
}

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: { name?: string } }
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) return profile

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    role: 'member',
  })

  if (profileError) {
    console.error('Profile creation error:', profileError)
  }

  return { id: user.id, role: 'member' as const }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureProfile(supabase, user)

  const projectsMap = new Map<string, ProjectRow>()

  // Only fetch this user's membership rows (matches non-recursive RLS: user_id = auth.uid())
  const { data: memberRows, error: memErr } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)

  if (memErr) {
    console.error('project_members fetch error:', memErr)
    return NextResponse.json({ error: memErr.message }, { status: 500 })
  }

  const projectIds = memberRows?.map((m) => m.project_id).filter(Boolean) ?? []

  if (projectIds.length > 0) {
    const { data: memberProjects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, description, owner_id, created_at')
      .in('id', projectIds)

    if (projErr) {
      console.error('projects fetch error:', projErr)
      return NextResponse.json({ error: projErr.message }, { status: 500 })
    }

    for (const p of memberProjects ?? []) {
      if (p?.id) projectsMap.set(p.id, p)
    }
  }

  const { data: owned, error: ownedErr } = await supabase
    .from('projects')
    .select('id, name, description, owner_id, created_at')
    .eq('owner_id', user.id)

  if (ownedErr) {
    console.error('owned projects fetch error:', ownedErr)
    return NextResponse.json({ error: ownedErr.message }, { status: 500 })
  }

  for (const p of owned ?? []) {
    if (p?.id) projectsMap.set(p.id, p)
  }

  const projects = [...projectsMap.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  }

  const profile = await ensureProfile(supabase, user)
  const role = profile.role ?? 'member'

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name: name.trim(), description: description?.trim() ?? '', owner_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { error: memberError } = await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    console.error('project_members insert error:', memberError)
  }

  return NextResponse.json({ project }, { status: 201 })
}
