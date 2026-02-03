-- =============================================
-- FIX CRITICAL SECURITY ISSUES
-- =============================================

-- 1. FIX STUDENTS TABLE - Remove public access policies
DROP POLICY IF EXISTS "Anyone can view students" ON public.students;
DROP POLICY IF EXISTS "Public can view students" ON public.students;

-- Create authenticated-only policy for students
CREATE POLICY "Authenticated users can view students" 
ON public.students 
FOR SELECT 
TO authenticated
USING (true);

-- 2. FIX TEACHERS TABLE - Remove public view policy
DROP POLICY IF EXISTS "Public can view all teachers" ON public.teachers;

-- Keep "Anyone can view approved teachers" but restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view approved teachers" ON public.teachers;
CREATE POLICY "Authenticated users can view approved teachers" 
ON public.teachers 
FOR SELECT 
TO authenticated
USING ((status = 'approved'::approval_status) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. FIX SECTIONS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view sections" ON public.sections;

-- Create authenticated-only policy for sections
CREATE POLICY "Authenticated users can view sections" 
ON public.sections 
FOR SELECT 
TO authenticated
USING (true);

-- 4. FIX ABSENCE_LISTS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view absence lists" ON public.absence_lists;

CREATE POLICY "Authenticated users can view absence lists" 
ON public.absence_lists 
FOR SELECT 
TO authenticated
USING (true);

-- 5. FIX ABSENCE_RECORDS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view absence records" ON public.absence_records;

CREATE POLICY "Authenticated users can view absence records" 
ON public.absence_records 
FOR SELECT 
TO authenticated
USING (true);

-- 6. FIX ATTENDANCE_RECORDS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view attendance records" ON public.attendance_records;

CREATE POLICY "Authenticated users can view attendance records" 
ON public.attendance_records 
FOR SELECT 
TO authenticated
USING (true);

-- 7. FIX IMPORT_HISTORY TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view import history" ON public.import_history;

CREATE POLICY "Authenticated users can view import history" 
ON public.import_history 
FOR SELECT 
TO authenticated
USING (true);

-- 8. FIX SYSTEM_NOTIFICATIONS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.system_notifications;

CREATE POLICY "Authenticated users can view notifications" 
ON public.system_notifications 
FOR SELECT 
TO authenticated
USING (true);

-- 9. FIX SYSTEM_SETTINGS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view settings" ON public.system_settings;

CREATE POLICY "Authenticated users can view settings" 
ON public.system_settings 
FOR SELECT 
TO authenticated
USING (true);

-- 10. FIX TEACHER_SECTIONS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view teacher sections" ON public.teacher_sections;

CREATE POLICY "Authenticated users can view teacher sections" 
ON public.teacher_sections 
FOR SELECT 
TO authenticated
USING (true);

-- 11. FIX SIGNATURES STORAGE BUCKET - Make private
UPDATE storage.buckets SET public = false WHERE id = 'signatures';

-- Update storage policy for signatures
DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;

CREATE POLICY "Authenticated users can view signatures" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'signatures');