import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: members, error } = await supabase
    .from('project_members')
    .select('user_id, role, profiles(id, name, email)')
    .eq('project_id', id)

  if (error) {
    console.error('Error fetching project members:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten the nested structure and filter out current user
  const flattenedMembers = (members ?? [])
    .map((m: any) => ({
      id: m.profiles?.id,
      name: m.profiles?.name,
      email: m.profiles?.email,
    }))
    .filter((m: any) => m.id && m.id !== user.id)

  return NextResponse.json({ members: flattenedMembers })
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be project owner to add members
  const { data: project } = await supabase.from('projects').select('owner_id').eq('id', id).single()
  if (!project || project.owner_id !== user.id)
    return NextResponse.json({ error: 'Only project owners can add members' }, { status: 403 })

  const body = await request.json()
  const { user_id } = body
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  // Check if already a member
  const { data: existing } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', id)
    .eq('user_id', user_id)
    .single()

  if (existing) return NextResponse.json({ error: 'User is already a member' }, { status: 409 })

  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: id, user_id, role: 'member' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase.from('projects').select('owner_id').eq('id', id).single()
  if (!project || project.owner_id !== user.id)
    return NextResponse.json({ error: 'Only project owners can remove members' }, { status: 403 })

  const body = await request.json()
  const { user_id } = body
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', id)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
