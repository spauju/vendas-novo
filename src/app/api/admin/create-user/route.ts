import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key - server-side only
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and has admin privileges
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Get the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('funcao')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.funcao !== 'administrador') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem criar usuários.' },
        { status: 403 }
      )
    }

    // Get user data from request body
    const body = await request.json()
    const { email, senha, full_name } = body

    if (!email || !senha || !full_name) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // Create user using Admin API
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    })

    if (createError) {
      console.error('Erro ao criar usuário:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    // Insert profile data
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name,
        email,
        funcao: 'usuario'
      }, {
        onConflict: 'id'
      })

    if (profileInsertError) {
      console.error('Erro ao criar perfil:', profileInsertError)
      // Try to delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: 'Erro ao criar perfil do usuário' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name
      }
    })

  } catch (error: any) {
    console.error('Erro na API de criação de usuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
