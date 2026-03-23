
-- Add gate_status and access_allowed columns to attendance_records
ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS gate_status text DEFAULT 'absent' CHECK (gate_status IN ('present', 'tardy', 'absent')),
  ADD COLUMN IF NOT EXISTS access_allowed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_truant boolean DEFAULT false;

-- Create daily_attendance_status view-like table for reconciliation tracking
-- This tracks the combined gate + teacher status per student per day
CREATE TABLE IF NOT EXISTS public.daily_student_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  gate_status text NOT NULL DEFAULT 'absent' CHECK (gate_status IN ('present', 'tardy', 'absent')),
  teacher_status text NOT NULL DEFAULT 'present' CHECK (teacher_status IN ('present', 'absent')),
  is_truant boolean NOT NULL DEFAULT false,
  access_allowed boolean NOT NULL DEFAULT true,
  missed_sessions integer NOT NULL DEFAULT 0,
  reporting_teachers text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_student_status ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage daily status" ON public.daily_student_status
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view daily status" ON public.daily_student_status
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert daily status" ON public.daily_student_status
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_daily_student_status_updated_at
  BEFORE UPDATE ON public.daily_student_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default tardy/absent cutoff settings if not exists
INSERT INTO public.system_settings (setting_key, setting_value, value_type, description)
VALUES 
  ('tardy_cutoff_time', '08:15', 'string', 'وقت بداية التأخر'),
  ('absent_cutoff_time', '08:45', 'string', 'وقت بداية الغياب')
ON CONFLICT (setting_key) DO NOTHING;
