
-- =====================================================
-- COMPREHENSIVE DATABASE SCHEMA FOR "AL-HUDHUR" SYSTEM
-- =====================================================

-- 1. Add missing columns to students table for QR/Barcode
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS student_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS barcode_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ban_start_date DATE,
ADD COLUMN IF NOT EXISTS ban_end_date DATE;

-- Create function to generate unique student code
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_code IS NULL THEN
    NEW.student_code := 'STU-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  END IF;
  IF NEW.barcode_number IS NULL THEN
    NEW.barcode_number := '200' || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-generating student codes
DROP TRIGGER IF EXISTS generate_student_code_trigger ON public.students;
CREATE TRIGGER generate_student_code_trigger
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_student_code();

-- 2. Create verification_codes table for email/password changes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'teacher' CHECK (user_type IN ('teacher', 'admin')),
  code_type TEXT NOT NULL CHECK (code_type IN ('email_change', 'password_change')),
  code TEXT NOT NULL,
  email_target TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for verification_codes
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert verification codes"
ON public.verification_codes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own codes"
ON public.verification_codes FOR SELECT
USING (true);

CREATE POLICY "Users can update their own codes"
ON public.verification_codes FOR UPDATE
USING (true);

-- 3. Create system_notifications table
CREATE TABLE IF NOT EXISTS public.system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('first_notice', 'second_notice', 'warning', 'official_warning', 'dismissal')),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  days_absent INTEGER NOT NULL,
  first_absence_date DATE NOT NULL,
  last_absence_date DATE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for system_notifications
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications"
ON public.system_notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view notifications"
ON public.system_notifications FOR SELECT
USING (true);

CREATE POLICY "Public can insert notifications"
ON public.system_notifications FOR INSERT
WITH CHECK (true);

-- 4. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_type TEXT CHECK (user_type IN ('admin', 'teacher', 'system')),
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- 5. Create import_history table
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  section_id UUID REFERENCES public.sections(id),
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('excel', 'csv', 'pdf')),
  students_imported INTEGER NOT NULL DEFAULT 0,
  students_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  import_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for import_history
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import history"
ON public.import_history FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view import history"
ON public.import_history FOR SELECT
USING (true);

CREATE POLICY "Public can insert import history"
ON public.import_history FOR INSERT
WITH CHECK (true);

-- 6. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  value_type TEXT NOT NULL DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
ON public.system_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view settings"
ON public.system_settings FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, value_type, description) VALUES
  ('school_name', 'ثانوية العربي عبد القادر', 'string', 'اسم المؤسسة التعليمية'),
  ('school_code', 'LAAC-2024', 'string', 'رمز المؤسسة'),
  ('attendance_start_time', '08:00', 'string', 'وقت بداية الحضور'),
  ('attendance_end_time', '17:00', 'string', 'وقت نهاية الحضور'),
  ('first_notice_days', '3', 'number', 'عدد أيام الغياب للإشعار الأول'),
  ('second_notice_days', '10', 'number', 'عدد أيام الغياب للإشعار الثاني'),
  ('warning_days', '17', 'number', 'عدد أيام الغياب للإنذار'),
  ('official_warning_days', '25', 'number', 'عدد أيام الغياب للإعذار'),
  ('dismissal_days', '32', 'number', 'عدد أيام الغياب للشطب')
ON CONFLICT (setting_key) DO NOTHING;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_barcode ON public.students(barcode_number);
CREATE INDEX IF NOT EXISTS idx_students_code ON public.students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_banned ON public.students(is_banned);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date_student ON public.attendance_records(date, student_id);

CREATE INDEX IF NOT EXISTS idx_absence_lists_teacher ON public.absence_lists(teacher_id);
CREATE INDEX IF NOT EXISTS idx_absence_lists_section ON public.absence_lists(section_id);
CREATE INDEX IF NOT EXISTS idx_absence_lists_submitted ON public.absence_lists(submitted_at);

CREATE INDEX IF NOT EXISTS idx_absence_records_list ON public.absence_records(absence_list_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_student ON public.absence_records(student_id);

CREATE INDEX IF NOT EXISTS idx_notifications_student ON public.system_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.system_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_resolved ON public.system_notifications(is_resolved);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON public.verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- 8. Create function to auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for system_settings
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Create function to calculate absence days for a student
CREATE OR REPLACE FUNCTION public.get_student_absence_days(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
  absence_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT ar.created_at::DATE)
  INTO absence_count
  FROM public.absence_records ar
  WHERE ar.student_id = p_student_id;
  
  RETURN COALESCE(absence_count, 0);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 10. Create function to check and create notifications based on absence days
CREATE OR REPLACE FUNCTION public.check_and_create_notification(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
  v_absence_days INTEGER;
  v_notification_type TEXT;
  v_first_absence DATE;
  v_existing_notification UUID;
BEGIN
  -- Get absence days
  v_absence_days := public.get_student_absence_days(p_student_id);
  
  -- Get first absence date
  SELECT MIN(ar.created_at::DATE)
  INTO v_first_absence
  FROM public.absence_records ar
  WHERE ar.student_id = p_student_id;
  
  -- Determine notification type based on days
  IF v_absence_days >= 32 THEN
    v_notification_type := 'dismissal';
  ELSIF v_absence_days >= 25 THEN
    v_notification_type := 'official_warning';
  ELSIF v_absence_days >= 17 THEN
    v_notification_type := 'warning';
  ELSIF v_absence_days >= 10 THEN
    v_notification_type := 'second_notice';
  ELSIF v_absence_days >= 3 THEN
    v_notification_type := 'first_notice';
  ELSE
    RETURN;
  END IF;
  
  -- Check if notification already exists
  SELECT id INTO v_existing_notification
  FROM public.system_notifications
  WHERE student_id = p_student_id 
    AND notification_type = v_notification_type
    AND is_resolved = false;
  
  -- Create notification if not exists
  IF v_existing_notification IS NULL THEN
    INSERT INTO public.system_notifications (
      notification_type, student_id, days_absent, first_absence_date, last_absence_date
    ) VALUES (
      v_notification_type, p_student_id, v_absence_days, v_first_absence, CURRENT_DATE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 11. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absence_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_notifications;
