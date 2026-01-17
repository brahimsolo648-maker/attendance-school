import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Section {
  id: string;
  year: string;
  name: string;
  full_name: string;
}

export const useSections = () => {
  return useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('year')
        .order('name');
      
      if (error) throw error;
      return data as Section[];
    },
  });
};

export const useSectionsByYear = (year: string | null) => {
  return useQuery({
    queryKey: ['sections', year],
    queryFn: async () => {
      if (!year) return [];
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('year', year)
        .order('name');
      
      if (error) throw error;
      return data as Section[];
    },
    enabled: !!year,
  });
};

export const getYears = () => ['أولى ثانوي', 'ثانية ثانوي', 'ثالثة ثانوي'];
