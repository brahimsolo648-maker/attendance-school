
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
  
  -- Thresholds: first_notice (3), second_notice (10), official_warning (17), dismissal (32)
  IF v_absence_days >= 32 THEN
    v_notification_type := 'dismissal';
  ELSIF v_absence_days >= 17 THEN
    v_notification_type := 'official_warning';
  ELSIF v_absence_days >= 10 THEN
    v_notification_type := 'second_notice';
  ELSIF v_absence_days >= 3 THEN
    v_notification_type := 'first_notice';
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
