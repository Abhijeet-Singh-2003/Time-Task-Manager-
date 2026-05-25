import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', authError }, { status: 401 })
  }

  // Test 1: Get tasks with RLS applied (this is what's failing)
  const { data: tasksWithRLS, error: rlsError } = await supabase
    .from('tasks')
    .select('id, title, assignee_id, status')
    .eq('assignee_id', user.id)

  // Test 2: Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    currentUser: {
      id: user.id,
      email: user.email,
      profile: profile,
      profileError: profileError?.message,
    },
    tasksWithRLS: {
      count: tasksWithRLS?.length || 0,
      tasks: tasksWithRLS,
      error: rlsError?.message,
    },
  })
}
