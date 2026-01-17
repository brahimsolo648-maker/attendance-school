-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

-- Create enum for teacher approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for ban reason
CREATE TYPE public.ban_reason AS ENUM ('استدعاء', 'تقرير', 'شيء آخر');

-- Create sections table (الأقسام)
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year TEXT NOT NULL, -- أولى ثانوي، ثانية ثانوي، ثالثة ثانوي
  name TEXT NOT NULL, -- اسم القسم
  full_name TEXT NOT NULL, -- الاسم الكامل مثل "أولى ثانوي - علوم1"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(year, name)
);

-- Create teachers table (الأساتذة)
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  avatar_url TEXT,
  signature_url TEXT,
  status approval_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create teacher_sections junction table
CREATE TABLE public.teacher_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(teacher_id, section_id)
);

-- Create students table (التلاميذ)
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  photo_url TEXT,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  is_banned BOOLEAN DEFAULT false NOT NULL,
  ban_reason ban_reason,
  ban_custom_reason TEXT,
  ban_subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create absence_lists table (قوائم الغياب)
CREATE TABLE public.absence_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  signature_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create absence_records table (سجلات الغياب الفردية)
CREATE TABLE public.absence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  absence_list_id UUID REFERENCES public.absence_lists(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(absence_list_id, student_id)
);

-- Create attendance_records table (سجلات الحضور QR - للمرحلة الثالثة)
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get teacher ID from user ID
CREATE OR REPLACE FUNCTION public.get_teacher_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.teachers WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for sections (everyone can read)
CREATE POLICY "Anyone can view sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teachers
CREATE POLICY "Anyone can view approved teachers" ON public.teachers FOR SELECT USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own teacher profile" ON public.teachers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert teacher registration" ON public.teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update teachers" ON public.teachers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update their own profile" ON public.teachers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can delete teachers" ON public.teachers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teacher_sections
CREATE POLICY "Anyone can view teacher sections" ON public.teacher_sections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teacher sections" ON public.teacher_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage teacher sections" ON public.teacher_sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for students
CREATE POLICY "Anyone can view students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admins can manage students" ON public.students FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for absence_lists
CREATE POLICY "Anyone can view absence lists" ON public.absence_lists FOR SELECT USING (true);
CREATE POLICY "Teachers can insert their own absence lists" ON public.absence_lists FOR INSERT WITH CHECK (teacher_id = public.get_teacher_id(auth.uid()));
CREATE POLICY "Admins can manage absence lists" ON public.absence_lists FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for absence_records
CREATE POLICY "Anyone can view absence records" ON public.absence_records FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert absence records" ON public.absence_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage absence records" ON public.absence_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance_records
CREATE POLICY "Anyone can view attendance records" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attendance records" ON public.attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage attendance records" ON public.attendance_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default sections data
INSERT INTO public.sections (year, name, full_name) VALUES
-- أولى ثانوي
('أولى ثانوي', 'آداب1', 'أولى ثانوي - آداب1'),
('أولى ثانوي', 'آداب2', 'أولى ثانوي - آداب2'),
('أولى ثانوي', 'آداب3', 'أولى ثانوي - آداب3'),
('أولى ثانوي', 'علوم1', 'أولى ثانوي - علوم1'),
('أولى ثانوي', 'علوم2', 'أولى ثانوي - علوم2'),
('أولى ثانوي', 'علوم3', 'أولى ثانوي - علوم3'),
('أولى ثانوي', 'علوم4', 'أولى ثانوي - علوم4'),
('أولى ثانوي', 'علوم5', 'أولى ثانوي - علوم5'),
-- ثانية ثانوي
('ثانية ثانوي', 'علوم تجريبية1', 'ثانية ثانوي - علوم تجريبية1'),
('ثانية ثانوي', 'علوم تجريبية2', 'ثانية ثانوي - علوم تجريبية2'),
('ثانية ثانوي', 'علوم تجريبية3', 'ثانية ثانوي - علوم تجريبية3'),
('ثانية ثانوي', 'تقني رياضي', 'ثانية ثانوي - تقني رياضي'),
('ثانية ثانوي', 'رياضيات', 'ثانية ثانوي - رياضيات'),
('ثانية ثانوي', 'تسيير واقتصاد', 'ثانية ثانوي - تسيير واقتصاد'),
('ثانية ثانوي', 'آداب وفلسفة1', 'ثانية ثانوي - آداب وفلسفة1'),
('ثانية ثانوي', 'آداب وفلسفة2', 'ثانية ثانوي - آداب وفلسفة2'),
('ثانية ثانوي', 'لغات أجنبية1', 'ثانية ثانوي - لغات أجنبية1'),
-- ثالثة ثانوي
('ثالثة ثانوي', 'علوم تجريبية1', 'ثالثة ثانوي - علوم تجريبية1'),
('ثالثة ثانوي', 'علوم تجريبية2', 'ثالثة ثانوي - علوم تجريبية2'),
('ثالثة ثانوي', 'علوم تجريبية3', 'ثالثة ثانوي - علوم تجريبية3'),
('ثالثة ثانوي', 'تقني رياضي', 'ثالثة ثانوي - تقني رياضي'),
('ثالثة ثانوي', 'رياضيات', 'ثالثة ثانوي - رياضيات'),
('ثالثة ثانوي', 'تسيير واقتصاد', 'ثالثة ثانوي - تسيير واقتصاد'),
('ثالثة ثانوي', 'آداب وفلسفة1', 'ثالثة ثانوي - آداب وفلسفة1'),
('ثالثة ثانوي', 'آداب وفلسفة2', 'ثالثة ثانوي - آداب وفلسفة2'),
('ثالثة ثانوي', 'آداب وفلسفة3', 'ثالثة ثانوي - آداب وفلسفة3'),
('ثالثة ثانوي', 'لغات أجنبية1', 'ثالثة ثانوي - لغات أجنبية1'),
('ثالثة ثانوي', 'لغات أجنبية2', 'ثالثة ثانوي - لغات أجنبية2');

-- Create storage bucket for avatars and signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Storage policies for signatures bucket
CREATE POLICY "Anyone can view signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Authenticated users can upload signatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.uid() IS NOT NULL);

-- Storage policies for student-photos bucket
CREATE POLICY "Anyone can view student photos" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');
CREATE POLICY "Admins can manage student photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos');
CREATE POLICY "Admins can update student photos" ON storage.objects FOR UPDATE USING (bucket_id = 'student-photos');
CREATE POLICY "Admins can delete student photos" ON storage.objects FOR DELETE USING (bucket_id = 'student-photos');