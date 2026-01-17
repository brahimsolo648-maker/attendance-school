-- Clean up remaining permissive RLS policies

-- Fix students table - remove overly permissive policies
DROP POLICY IF EXISTS "Public can manage students" ON public.students;

-- Fix attendance_records - remove overly permissive policy
DROP POLICY IF EXISTS "Anyone can insert attendance records" ON public.attendance_records;

-- Fix absence_lists - remove duplicate permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert absence lists" ON public.absence_lists;
DROP POLICY IF EXISTS "Public can insert absence lists" ON public.absence_lists;

-- Fix absence_records - remove duplicate permissive policies  
DROP POLICY IF EXISTS "Public can insert absence records" ON public.absence_records;

-- Fix import_history - remove permissive policy
DROP POLICY IF EXISTS "Public can insert import history" ON public.import_history;

-- Fix system_notifications - remove permissive policy
DROP POLICY IF EXISTS "Public can insert notifications" ON public.system_notifications;

-- Fix audit_logs - restrict to service role only (via edge functions)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Audit logs should only be inserted by service role key (edge functions)
-- No client-side insert should be allowed