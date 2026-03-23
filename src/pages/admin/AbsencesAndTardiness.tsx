import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, FileDown, Printer, ShieldCheck, ShieldX, AlertCircle, Clock, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

interface DailyStatus {
  id: string;
  student_id: string;
  date: string;
  gate_status: string;
  teacher_status: string;
  is_truant: boolean;
  access_allowed: boolean;
  missed_sessions: number;
  reporting_teachers: string[];
  students: {
    id: string;
    first_name: string;
    last_name: string;
    section_id: string;
    sections: {
      full_name: string;
    };
  };
}

const AbsencesAndTardiness = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const { data: dailyStatuses = [], isLoading } = useQuery({
    queryKey: ['daily-student-status', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_student_status')
        .select(`
          id, student_id, date, gate_status, teacher_status, is_truant, 
          access_allowed, missed_sessions, reporting_teachers,
          students(id, first_name, last_name, section_id, sections(full_name))
        `)
        .eq('date', today)
        .in('gate_status', ['tardy', 'absent']);

      if (error) throw error;
      return (data || []) as unknown as DailyStatus[];
    },
    refetchInterval: 15000,
  });

  // Also fetch students who are truant (present at gate but absent in class)
  const { data: truantStatuses = [] } = useQuery({
    queryKey: ['truant-students', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_student_status')
        .select(`
          id, student_id, date, gate_status, teacher_status, is_truant, 
          access_allowed, missed_sessions, reporting_teachers,
          students(id, first_name, last_name, section_id, sections(full_name))
        `)
        .eq('date', today)
        .eq('is_truant', true);

      if (error) throw error;
      return (data || []) as unknown as DailyStatus[];
    },
    refetchInterval: 15000,
  });

  // Merge and deduplicate
  const allStatuses = useMemo(() => {
    const map = new Map<string, DailyStatus>();
    [...dailyStatuses, ...truantStatuses].forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [dailyStatuses, truantStatuses]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allStatuses;
    const q = searchQuery.trim().toLowerCase();
    return allStatuses.filter(s => {
      const name = `${s.students?.first_name} ${s.students?.last_name}`.toLowerCase();
      const section = s.students?.sections?.full_name?.toLowerCase() || '';
      return name.includes(q) || section.includes(q);
    });
  }, [allStatuses, searchQuery]);

  const toggleAccess = async (statusId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('daily_student_status')
        .update({ 
          access_allowed: !currentValue,
          gate_status: !currentValue ? 'present' : 'absent'
        })
        .eq('id', statusId);

      if (error) throw error;
      toast.success(!currentValue ? 'تم السماح بالدخول' : 'تم رفض الدخول');
      queryClient.invalidateQueries({ queryKey: ['daily-student-status'] });
      queryClient.invalidateQueries({ queryKey: ['truant-students'] });
    } catch {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const getStatusBadge = (status: DailyStatus) => {
    if (status.is_truant) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <Badge variant="destructive" className="text-[10px]">تغيب عن الحصة</Badge>
        </div>
      );
    }
    if (status.gate_status === 'tardy') {
      return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">متأخر</Badge>;
    }
    if (status.gate_status === 'absent') {
      return <Badge variant="destructive" className="text-[10px]">غائب</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">حاضر</Badge>;
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.setFont('Helvetica');
      
      // Title
      pdf.setFontSize(16);
      pdf.text('قائمة الغيابات والتأخرات', 105, 20, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`التاريخ: ${today}`, 105, 28, { align: 'center' });

      let y = 40;
      const lineHeight = 8;

      // Headers
      pdf.setFontSize(9);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('الحالة', 20, y);
      pdf.text('الحصص', 50, y);
      pdf.text('القسم', 80, y);
      pdf.text('الاسم', 140, y);
      pdf.text('#', 190, y);
      
      y += lineHeight;
      pdf.line(15, y - 2, 195, y - 2);

      pdf.setFont('Helvetica', 'normal');
      filtered.forEach((status, i) => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        const name = `${status.students?.last_name} ${status.students?.first_name}`;
        const section = status.students?.sections?.full_name || '-';
        const gateLabel = status.is_truant ? 'تغيب' : status.gate_status === 'tardy' ? 'متأخر' : 'غائب';

        pdf.text(gateLabel, 20, y);
        pdf.text(String(status.missed_sessions), 55, y);
        pdf.text(section, 80, y);
        pdf.text(name, 140, y);
        pdf.text(String(i + 1), 190, y);
        y += lineHeight;
      });

      pdf.save(`غيابات-وتأخرات-${today}.pdf`);
      toast.success('تم تصدير PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء التصدير');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container min-h-screen" dir="rtl">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserX className="w-5 h-5 text-destructive" />
            الغيابات والتأخرات
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="content-container py-6 space-y-4">
        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو القسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileDown className="w-4 h-4 ml-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 ml-1" />
              طباعة
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center">
            <UserX className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold text-foreground">
              {allStatuses.filter(s => s.gate_status === 'absent' && !s.is_truant).length}
            </p>
            <p className="text-[10px] text-muted-foreground">غائب</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold text-foreground">
              {allStatuses.filter(s => s.gate_status === 'tardy').length}
            </p>
            <p className="text-[10px] text-muted-foreground">متأخر</p>
          </div>
          <div className="glass-card p-3 text-center">
            <AlertCircle className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold text-foreground">
              {allStatuses.filter(s => s.is_truant).length}
            </p>
            <p className="text-[10px] text-muted-foreground">تغيب عن حصة</p>
          </div>
        </div>

        {/* Data Table */}
        <div ref={tableRef} className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-success mb-3 opacity-50" />
              <p className="text-muted-foreground">لا توجد غيابات أو تأخرات اليوم</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((status, index) => (
                <div key={status.id} className={`p-3 flex items-center gap-3 transition-colors ${status.is_truant ? 'bg-destructive/5' : ''}`}>
                  {/* Index */}
                  <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{index + 1}</span>
                  
                  {/* Truant Red Dot */}
                  {status.is_truant && (
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse shrink-0" title="تغيب عن الحصة رغم دخوله البوابة" />
                  )}

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {status.students?.last_name} {status.students?.first_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{status.students?.sections?.full_name}</span>
                      {status.missed_sessions > 0 && (
                        <span className="text-[10px] text-muted-foreground">• {status.missed_sessions} حصة</span>
                      )}
                    </div>
                    {status.reporting_teachers && status.reporting_teachers.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        أساتذة: {status.reporting_teachers.join('، ')}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {getStatusBadge(status)}
                  </div>

                  {/* Access Toggle */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <Switch
                      checked={status.access_allowed}
                      onCheckedChange={() => toggleAccess(status.id, status.access_allowed)}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {status.access_allowed ? 'مسموح' : 'ممنوع'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AbsencesAndTardiness;
