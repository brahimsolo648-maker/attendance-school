import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'غير مصرح: يجب تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to verify authentication
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found')
      return new Response(
        JSON.stringify({ success: false, error: 'غير مصرح: جلسة غير صالحة' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has admin role using the has_role function
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError?.message || 'User is not admin')
      return new Response(
        JSON.stringify({ success: false, error: 'غير مصرح: صلاحية المدير مطلوبة' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${user.id} authenticated successfully`)

    // Now create admin client with service role key to perform privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { action, teacherId } = await req.json()
    
    console.log(`Processing action: ${action} for teacher: ${teacherId} by admin: ${user.id}`)

    if (!teacherId) {
      throw new Error('معرف الأستاذ مطلوب')
    }

    // Validate teacherId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(teacherId)) {
      throw new Error('معرف الأستاذ غير صالح')
    }

    // Validate action
    const validActions = ['approve', 'reject', 'delete']
    if (!validActions.includes(action)) {
      throw new Error('الإجراء غير صالح')
    }

    if (action === 'approve') {
      // Update teacher status to approved
      const { data, error } = await supabaseAdmin
        .from('teachers')
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString() 
        })
        .eq('id', teacherId)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) {
        console.error('Error approving teacher:', error)
        throw new Error('فشل في الموافقة على الحساب: ' + error.message)
      }

      if (!data) {
        throw new Error('لم يتم العثور على الحساب أو تمت الموافقة عليه مسبقاً')
      }

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        user_type: 'admin',
        action_type: 'approve_teacher',
        table_name: 'teachers',
        record_id: teacherId,
        new_data: { status: 'approved' }
      })

      console.log('Teacher approved successfully:', data.id)
      
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'reject') {
      // First delete related teacher_sections
      const { error: sectionsError } = await supabaseAdmin
        .from('teacher_sections')
        .delete()
        .eq('teacher_id', teacherId)

      if (sectionsError) {
        console.error('Error deleting teacher sections:', sectionsError)
        throw new Error('فشل في حذف أقسام الأستاذ')
      }

      // Then delete the teacher (only if pending)
      const { error } = await supabaseAdmin
        .from('teachers')
        .delete()
        .eq('id', teacherId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error rejecting teacher:', error)
        throw new Error('فشل في رفض الحساب: ' + error.message)
      }

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        user_type: 'admin',
        action_type: 'reject_teacher',
        table_name: 'teachers',
        record_id: teacherId
      })

      console.log('Teacher rejected successfully:', teacherId)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      // First delete related teacher_sections
      const { error: sectionsError } = await supabaseAdmin
        .from('teacher_sections')
        .delete()
        .eq('teacher_id', teacherId)

      if (sectionsError) {
        console.error('Error deleting teacher sections:', sectionsError)
        throw new Error('فشل في حذف أقسام الأستاذ')
      }

      // Then delete the teacher (any status)
      const { error } = await supabaseAdmin
        .from('teachers')
        .delete()
        .eq('id', teacherId)

      if (error) {
        console.error('Error deleting teacher:', error)
        throw new Error('فشل في حذف الحساب: ' + error.message)
      }

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        user_type: 'admin',
        action_type: 'delete_teacher',
        table_name: 'teachers',
        record_id: teacherId
      })

      console.log('Teacher deleted successfully:', teacherId)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('إجراء غير صالح')

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف'
    console.error('Error in manage-teachers function:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
