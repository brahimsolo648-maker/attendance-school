-- Allow public delete for teacher_sections (needed for reject/delete operations)
CREATE POLICY "Public can delete teacher sections"
ON public.teacher_sections
FOR DELETE
TO public
USING (true);