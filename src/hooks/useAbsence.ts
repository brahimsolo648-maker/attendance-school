import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type AbsenceList = Tables<'absence_lists'>;
export type AbsenceRecord = Tables<'absence_records'>;

export interface AbsenceListWithDetails extends AbsenceList {
  teachers: {
    first_name: string;
    last_name: string;
    signature_url: string | null;
  };
}

export const useAbsenceRecords = (studentId: string | null) => {
  return useQuery({
    queryKey: ['absence-records', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          *,
          absence_lists(
            *,
            teachers(first_name, last_name, signature_url)
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
};

export const useStudentAbsenceDays = (studentId: string | null) => {
  return useQuery({
    queryKey: ['absence-days', studentId],
    queryFn: async () => {
      if (!studentId) return 0;
      
      // Get all absence records for this student
      const { data, error } = await supabase
        .from('absence_records')
        .select('created_at')
        .eq('student_id', studentId);
      
      if (error) throw error;
      
      // Count unique days
      const uniqueDays = new Set(
        data?.map(r => new Date(r.created_at).toDateString())
      );
      
      return uniqueDays.size;
    },
    enabled: !!studentId,
  });
};

export const useSubmitAbsenceList = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      teacherId,
      sectionId,
      subject,
      signatureUrl,
      absentStudentIds,
    }: {
      teacherId: string;
      sectionId: string;
      subject: string;
      signatureUrl?: string;
      absentStudentIds: string[];
    }) => {
      // Create the absence list
      const { data: absenceList, error: listError } = await supabase
        .from('absence_lists')
        .insert({
          teacher_id: teacherId,
          section_id: sectionId,
          subject,
          signature_url: signatureUrl,
        })
        .select()
        .single();
      
      if (listError) throw listError;
      
      // Create absence records for each absent student
      if (absentStudentIds.length > 0) {
        const absenceRecords = absentStudentIds.map(studentId => ({
          absence_list_id: absenceList.id,
          student_id: studentId,
        }));
        
        const { error: recordsError } = await supabase
          .from('absence_records')
          .insert(absenceRecords);
        
        if (recordsError) throw recordsError;
      }
      
      return absenceList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-records'] });
      queryClient.invalidateQueries({ queryKey: ['absence-days'] });
    },
  });
};

// Get students with their absence days for a section
export const useStudentsWithAbsence = (sectionId: string | null) => {
  return useQuery({
    queryKey: ['students-absence', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      
      // Get all students in the section
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('section_id', sectionId)
        .order('last_name')
        .order('first_name');
      
      if (studentsError) throw studentsError;
      
      // Get all absence records for these students
      const studentIds = students?.map(s => s.id) || [];
      
      if (studentIds.length === 0) return [];
      
      const { data: absenceRecords, error: absenceError } = await supabase
        .from('absence_records')
        .select('student_id, created_at')
        .in('student_id', studentIds);
      
      if (absenceError) throw absenceError;
      
      // Get attendance records (QR check-in)
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('student_id, date')
        .in('student_id', studentIds);
      
      if (attendanceError) throw attendanceError;
      
      // Calculate absence days for each student
      const absenceDaysByStudent: Record<string, Set<string>> = {};
      absenceRecords?.forEach(record => {
        if (!absenceDaysByStudent[record.student_id]) {
          absenceDaysByStudent[record.student_id] = new Set();
        }
        absenceDaysByStudent[record.student_id].add(
          new Date(record.created_at).toDateString()
        );
      });
      
      // Check if student was marked absent but attended (QR)
      const attendedDaysByStudent: Record<string, Set<string>> = {};
      attendanceRecords?.forEach(record => {
        if (!attendedDaysByStudent[record.student_id]) {
          attendedDaysByStudent[record.student_id] = new Set();
        }
        attendedDaysByStudent[record.student_id].add(
          new Date(record.date).toDateString()
        );
      });
      
      return students?.map(student => {
        const absenceDays = absenceDaysByStudent[student.id]?.size || 0;
        const attendedDays = attendedDaysByStudent[student.id] || new Set();
        
        // Check if marked absent today but has QR attendance
        const markedAbsentToday = absenceDaysByStudent[student.id]?.has(
          new Date().toDateString()
        );
        const hasQRToday = attendedDays.has(new Date().toDateString());
        const isConflict = markedAbsentToday && hasQRToday;
        
        return {
          ...student,
          absenceDays,
          isConflict,
        };
      }) || [];
    },
    enabled: !!sectionId,
  });
};

// Get absence details for a conflicting student
export const useConflictDetails = (studentId: string | null, date?: Date) => {
  return useQuery({
    queryKey: ['conflict-details', studentId, date?.toISOString()],
    queryFn: async () => {
      if (!studentId) return null;
      
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          *,
          absence_lists(
            subject,
            submitted_at,
            teachers(first_name, last_name, signature_url)
          )
        `)
        .eq('student_id', studentId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
};
