import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Student = Tables<'students'>;
export type StudentInsert = TablesInsert<'students'>;
export type StudentUpdate = TablesUpdate<'students'>;

export const useStudents = (sectionId: string | null) => {
  return useQuery({
    queryKey: ['students', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('section_id', sectionId)
        .order('last_name')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!sectionId,
  });
};

export const useStudent = (studentId: string | null) => {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from('students')
        .select('*, sections(*)')
        .eq('id', studentId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (student: StudentInsert) => {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students', data.section_id] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: StudentUpdate }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students', data.section_id] });
      queryClient.invalidateQueries({ queryKey: ['student', data.id] });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};
