import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, FileDown, Printer, ShieldCheck, Clock, UserX, Download, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  // Fetch all students who are tardy, absent, or truant today
  const { data: allStatuses = [], isLoading } = useQuery({
    queryKey: ['absences-tardiness-page', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_student_status')
        .select(`
          id, student_id, date, gate_status, teacher_status, is_truant, 
          access_allowed, missed_sessions, reporting_teachers,
          students(id, first_name, last_name, section_id, sections(full_name))
        `)
        .eq('date', today)
        .or('gate_status.in.(tardy,absent),is_truant.eq.true');

      if (error) throw error;
      return (data || []) as unknown as DailyStatus[];
    },
    refetchInterval: 10000,
  });

  // Only show students who haven't been allowed entry yet
  const visibleStatuses = useMemo(() => {
    return allStatuses.filter(s => !s.access_allowed || s.is_truant);
  }, [allStatuses]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return visibleStatuses;
    const q = searchQuery.trim().toLowerCase();
    return visibleStatuses.filter(s => {
      const name = `${s.students?.first_name} ${s.students?.last_name}`.toLowerCase();
      const section = s.students?.sections?.full_name?.toLowerCase() || '';
      return name.includes(q) || section.includes(q);
    });
  }, [visibleStatuses, searchQuery]);

  const allowEntry = async (status: DailyStatus) => {
    try {
      // Update daily_student_status: allow access, mark as present at gate
      const { error } = await supabase
        .from('daily_student_status')
        .update({ access_allowed: true, gate_status: 'present' })
        .eq('id', status.id);

      if (error) throw error;

      // Update attendance_records too
      await supabase
        .from('attendance_records')
        .update({ gate_status: 'present', access_allowed: true })
        .eq('student_id', status.student_id)
        .eq('date', today);

      toast.success('تم السماح بالدخول');
      queryClient.invalidateQueries({ queryKey: ['absences-tardiness-page'] });
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
    return null;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة');
      return;
    }

    let rows = '';
    filtered.forEach((status, i) => {
      const name = `${status.students?.last_name} ${status.students?.first_name}`;
      const section = status.students?.sections?.full_name || '-';
      const label = status.is_truant ? 'تغيب عن حصة' : status.gate_status === 'tardy' ? 'متأخر' : 'غائب';
      rows += `<tr><td>${i + 1}</td><td>${name}</td><td>${section}</td><td>${label}</td></tr>`;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>قائمة الغيابات والتأخرات - ${today}</title>
          <style>
            @page { size: A4; margin: 1.5cm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
            .header h1 { font-size: 20px; color: #1a365d; }
            .header p { font-size: 12px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
            th, td { padding: 8px 12px; text-align: right; border: 1px solid #ddd; }
            th { background: #f0f0f0; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>الغيابات والتأخرات</h1>
            <p>${today} - الإجمالي: ${filtered.length}</p>
          </div>
          <table>
            <thead><tr><th>#</th><th>الاسم الكامل</th><th>القسم</th><th>الحالة</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="page-container min-h-screen" dir="rtl">
      {/* Header */}
      <header className="glass-nav print:hidden">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserX className="w-5 h-5 text-destructive" />
            الغيابات والتأخرات
          </h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="w-4 h-4 ml-1" />
                  PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 ml-2" />
                  تنزيل PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 ml-1" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="content-container py-6 space-y-4">
        {/* Search */}
        <div className="relative print:hidden">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          <div className="glass-card p-3 text-center">
            <UserX className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold text-foreground">
              {visibleStatuses.filter(s => s.gate_status === 'absent' && !s.is_truant).length}
            </p>
            <p className="text-[10px] text-muted-foreground">غائب</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold text-foreground">
              {visibleStatuses.filter(s => s.gate_status === 'tardy').length}
            </p>
            <p className="text-[10px] text-muted-foreground">متأخر</p>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">
              {visibleStatuses.filter(s => s.is_truant).length}
            </p>
            <p className="text-[10px] text-muted-foreground">تغيب عن حصة</p>
          </div>
        </div>

        {/* Data List */}
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
                  <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{index + 1}</span>

                  {status.is_truant && (
                    <span className="w-3 h-3 rounded-full bg-destructive animate-pulse shrink-0" title="تغيب عن الحصة رغم دخوله البوابة" />
                  )}

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

                  <div className="shrink-0">
                    {getStatusBadge(status)}
                  </div>

                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 border-success text-success hover:bg-success hover:text-success-foreground"
                      onClick={() => allowEntry(status)}
                    >
                      <DoorOpen className="w-3.5 h-3.5" />
                      سماح بالدخول
                    </Button>
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
