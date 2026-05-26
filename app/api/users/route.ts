import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[API/users] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API/users] Fetching users for:', user.id)

    // Fetch all profiles - authenticated users should be able to see other users for task assignment
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('[API/users] Supabase error:', error.code, error.message)
      return NextResponse.json({ 
        error: `Failed to fetch users: ${error.message}`,
        code: error.code 
      }, { status: 500 })
    }

    if (!users) {
      console.warn('[API/users] No users returned from query')
      return NextResponse.json({ users: [] })
    }

    // Filter out the current user from the list so they can't assign to themselves
    const filteredUsers = users.filter(u => u.id !== user.id)
    
    console.log('[API/users] Returning', filteredUsers.length, 'users')
    return NextResponse.json({ users: filteredUsers })
  } catch (err) {
    console.error('[API/users] Unexpected error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}
