-- Make signatures bucket public for reading (signatures are displayed in admin reports)
UPDATE storage.buckets SET public = true WHERE id = 'signatures';

-- Drop old restrictive INSERT policy
DROP POLICY IF EXISTS "Teachers can upload their own signature" ON storage.objects;

-- Create new INSERT policy that allows authenticated teachers to upload signatures
CREATE POLICY "Teachers can upload signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
);

-- Drop old SELECT policy and recreate (now public bucket handles reads)
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;

-- Allow anyone to view signatures (bucket is public)
CREATE POLICY "Public can view signatures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures');

-- Allow teachers to update their signatures
CREATE POLICY "Teachers can update signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'signatures');

-- Allow teachers to delete their old signatures
CREATE POLICY "Teachers can delete signatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'signatures');

-- Update notification thresholds
CREATE OR REPLACE FUNCTION public.check_and_create_notification(p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_absence_days INTEGER;
  v_notification_type TEXT;
  v_first_absence DATE;
  v_existing_notification UUID;
BEGIN
  v_absence_days := public.get_student_absence_days(p_student_id);
  
  SELECT MIN(ar.created_at::DATE)
  INTO v_first_absence
  FROM public.absence_records ar
  WHERE ar.student_id = p_student_id;
  
  -- New thresholds: second_notice (3), official_warning (10), dismissal (32)
  IF v_absence_days >= 32 THEN
    v_notification_type := 'dismissal';
  ELSIF v_absence_days >= 10 THEN
    v_notification_type := 'official_warning';
  ELSIF v_absence_days >= 3 THEN
    v_notification_type := 'second_notice';
  ELSE
    RETURN;
  END IF;
  
  SELECT id INTO v_existing_notification
  FROM public.system_notifications
  WHERE student_id = p_student_id 
    AND notification_type = v_notification_type
    AND is_resolved = false;
  
  IF v_existing_notification IS NULL THEN
    INSERT INTO public.system_notifications (
      notification_type, student_id, days_absent, first_absence_date, last_absence_date
    ) VALUES (
      v_notification_type, p_student_id, v_absence_days, v_first_absence, CURRENT_DATE
    );
  END IF;
END;
$function$;