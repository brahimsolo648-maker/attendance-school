-- Allow unauthenticated access to view all teachers (for development)
-- This will be replaced with proper admin auth later

-- Drop the restrictive policies temporarily
DROP POLICY IF EXISTS "Anyone can view approved teachers " ON public.teachers;

-- Create a more permissive policy for development
CREATE POLICY "Public can view all teachers"
ON public.teachers
FOR SELECT
USING (true);

-- Also ensure students can be viewed/modified without auth for now
DROP POLICY IF EXISTS "Anyone can view students " ON public.students;
CREATE POLICY "Public can view students"
ON public.students
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage students " ON public.students;
CREATE POLICY "Public can manage students"
ON public.students
FOR ALL
USING (true)
WITH CHECK (true);