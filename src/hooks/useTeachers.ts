import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type Teacher = Tables<'teachers'>;
export type TeacherInsert = TablesInsert<'teachers'>;
export type TeacherUpdate = TablesUpdate<'teachers'>;

export interface TeacherWithSections extends Teacher {
  teacher_sections: {
    section_id: string;
    sections: {
      id: string;
      full_name: string;
    };
  }[];
}

export const useTeachers = (status?: Enums<'approval_status'>) => {
  return useQuery({
    queryKey: ['teachers', status],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select(`
          *,
          teacher_sections(
            section_id,
            sections(id, full_name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TeacherWithSections[];
    },
  });
};

export const usePendingTeachersCount = () => {
  return useQuery({
    queryKey: ['teachers', 'pending', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
  });
};

export const useApproveTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-teachers', {
        body: { action: 'approve', teacherId }
      });
      
      if (error) {
        console.error('Error calling manage-teachers function:', error);
        throw new Error('فشل في الموافقة على الحساب: ' + error.message);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'فشل في الموافقة على الحساب');
      }
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error) => {
      console.error('Approve mutation error:', error);
    },
  });
};

export const useRejectTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-teachers', {
        body: { action: 'reject', teacherId }
      });
      
      if (error) {
        console.error('Error calling manage-teachers function:', error);
        throw new Error('فشل في رفض الحساب: ' + error.message);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'فشل في رفض الحساب');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error) => {
      console.error('Reject mutation error:', error);
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-teachers', {
        body: { action: 'delete', teacherId }
      });
      
      if (error) {
        console.error('Error calling manage-teachers function:', error);
        throw new Error('فشل في حذف الحساب: ' + error.message);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'فشل في حذف الحساب');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
    },
  });
};

export const useRegisterTeacher = () => {
  return useMutation({
    mutationFn: async ({ 
      teacher, 
      sectionIds 
    }: { 
      teacher: TeacherInsert; 
      sectionIds: string[] 
    }) => {
      // First insert the teacher
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .insert(teacher)
        .select()
        .single();
      
      if (teacherError) throw teacherError;
      
      // Then insert the teacher sections
      if (sectionIds.length > 0) {
        const teacherSections = sectionIds.map(sectionId => ({
          teacher_id: teacherData.id,
          section_id: sectionId,
        }));
        
        const { error: sectionsError } = await supabase
          .from('teacher_sections')
          .insert(teacherSections);
        
        if (sectionsError) throw sectionsError;
      }
      
      return teacherData;
    },
  });
};
