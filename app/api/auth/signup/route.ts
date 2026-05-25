import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabase = await createClient()

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
    }

    // Create profile in public.profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        email,
        role: 'member'
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail the signup if profile creation fails, but log it
    }

    return NextResponse.json(
      {
        message: authData.session ? 'Signup successful' : 'Please check your email to confirm your account',
        user: authData.user,
        session: authData.session
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'An error occurred during signup' }, { status: 500 })
  }
}
