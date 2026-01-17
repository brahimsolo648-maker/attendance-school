-- Fix overly permissive RLS policies
-- This migration tightens security by requiring proper authentication

-- =====================================================
-- FIX teacher_sections table policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can insert teacher sections" ON public.teacher_sections;
DROP POLICY IF EXISTS "Public can delete teacher sections" ON public.teacher_sections;

-- Only admins can manage teacher sections
CREATE POLICY "Admins can insert teacher sections"
ON public.teacher_sections FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete teacher sections"
ON public.teacher_sections FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- FIX absence_lists table policies
-- =====================================================
DROP POLICY IF EXISTS "Public can insert absence lists" ON public.absence_lists;

-- Only authenticated teachers or admins can insert absence lists
CREATE POLICY "Authenticated staff can insert absence lists"
ON public.absence_lists FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX absence_records table policies
-- =====================================================
DROP POLICY IF EXISTS "Public can insert absence records" ON public.absence_records;

-- Only authenticated teachers or admins can insert absence records
CREATE POLICY "Authenticated staff can insert absence records"
ON public.absence_records FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX attendance_records table policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can insert attendance records" ON public.attendance_records;

-- Only admins can insert attendance records (QR scanner is admin-only)
CREATE POLICY "Admins can insert attendance records"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- FIX system_notifications table policies
-- =====================================================
DROP POLICY IF EXISTS "Public can insert notifications" ON public.system_notifications;

-- Only admins can manage notifications
CREATE POLICY "Admins can insert notifications"
ON public.system_notifications FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- FIX import_history table policies
-- =====================================================
DROP POLICY IF EXISTS "Public can insert import history" ON public.import_history;

-- Only admins can insert import history
CREATE POLICY "Admins can insert import history"
ON public.import_history FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- FIX verification_codes table policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can insert verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can view their own codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can update their own codes" ON public.verification_codes;

-- Users can only manage their own verification codes
CREATE POLICY "Users can manage their own verification codes"
ON public.verification_codes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- FIX storage bucket for student-photos (make private)
-- =====================================================
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can view student photos" ON storage.objects;

-- Only authenticated staff can view student photos
CREATE POLICY "Authenticated staff can view student photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-photos' 
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- =====================================================
-- FIX avatars bucket policies
-- =====================================================
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;

-- Users can only update their own avatars (verify ownership)
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add delete policy for avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- FIX signatures bucket policies
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;

-- Only teachers can upload their own signature
CREATE POLICY "Teachers can upload their own signature"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND public.has_role(auth.uid(), 'teacher'::app_role)
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- Add function-level permissions for get_teacher_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_teacher_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to get their own teacher ID or admins to get any
  IF _user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NULL;
  END IF;
  
  RETURN (SELECT id FROM public.teachers WHERE user_id = _user_id LIMIT 1);
END;
$$;