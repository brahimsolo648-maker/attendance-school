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

interface DisplayStudent {
  id: string;
  statusId: string | null;
  student_id: string;
  first_name: string;
  last_name: string;
  section_name: string;
  gate_status: string;
  teacher_status: string;
  is_truant: boolean;
  access_allowed: boolean;
  missed_sessions: number;
  reporting_teachers: string[];
}

const AbsencesAndTardiness = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  // Fetch cutoff settings
  const { data: settings } = useQuery({
    queryKey: ['cutoff-settings-absences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['tardy_cutoff_time', 'absent_cutoff_time']);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.setting_key] = s.setting_value || ''; });
      return {
        tardyCutoff: map['tardy_cutoff_time'] || '08:15',
        absentCutoff: map['absent_cutoff_time'] || '08:45',
      };
    },
  });

  // Determine if we're past cutoff times
  const timeStatus = useMemo(() => {
    if (!settings) return { pastTardy: false, pastAbsent: false };
    const now = new Date();
    const [tardyH, tardyM] = settings.tardyCutoff.split(':').map(Number);
    const [absentH, absentM] = settings.absentCutoff.split(':').map(Number);
    const tardyTime = new Date(now); tardyTime.setHours(tardyH, tardyM, 0, 0);
    const absentTime = new Date(now); absentTime.setHours(absentH, absentM, 0, 0);
    return { pastTardy: now >= tardyTime, pastAbsent: now >= absentTime };
  }, [settings]);

  // Fetch daily_student_status records
  const { data: dailyStatuses = [] } = useQuery({
    queryKey: ['absences-daily-status', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_student_status')
        .select(`
          id, student_id, date, gate_status, teacher_status, is_truant, 
          access_allowed, missed_sessions, reporting_teachers
        `)
        .eq('date', today);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Fetch ALL students with their sections
  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['all-students-for-absences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, section_id, sections(full_name)')
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch attendance records to know who checked in
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-records-today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, check_in_time, gate_status')
        .eq('date', today);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Build the combined list
  const displayList: DisplayStudent[] = useMemo(() => {
    const statusMap = new Map<string, typeof dailyStatuses[0]>();
    dailyStatuses.forEach(s => statusMap.set(s.student_id, s));

    const checkedInSet = new Set(attendanceRecords.filter(r => r.check_in_time).map(r => r.student_id));

    const result: DisplayStudent[] = [];

    // 1) Students with daily_student_status records (tardy, absent, truant)
    for (const status of dailyStatuses) {
      if (status.gate_status === 'tardy' || status.gate_status === 'absent' || status.is_truant) {
        if (!status.access_allowed || status.is_truant) {
          const student = allStudents.find(s => s.id === status.student_id);
          if (student) {
            result.push({
              id: status.id,
              statusId: status.id,
              student_id: status.student_id,
              first_name: student.first_name,
              last_name: student.last_name,
              section_name: (student as any).sections?.full_name || '-',
              gate_status: status.gate_status,
              teacher_status: status.teacher_status,
              is_truant: status.is_truant,
              access_allowed: status.access_allowed,
              missed_sessions: status.missed_sessions || 0,
              reporting_teachers: status.reporting_teachers || [],
            });
          }
        }
      }
    }

    // 2) Students who never scanned AND we're past the absent cutoff
    if (timeStatus.pastAbsent) {
      const alreadyInList = new Set(result.map(r => r.student_id));
      for (const student of allStudents) {
        if (alreadyInList.has(student.id)) continue;
        if (checkedInSet.has(student.id)) continue;
        if (statusMap.has(student.id)) continue; // already has a status record

        result.push({
          id: `auto-${student.id}`,
          statusId: null,
          student_id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          section_name: (student as any).sections?.full_name || '-',
          gate_status: 'absent',
          teacher_status: 'present',
          is_truant: false,
          access_allowed: false,
          missed_sessions: 0,
          reporting_teachers: [],
        });
      }
    }

    return result;
  }, [dailyStatuses, allStudents, attendanceRecords, timeStatus]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return displayList;
    const q = searchQuery.trim().toLowerCase();
    return displayList.filter(s => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      return name.includes(q) || s.section_name.toLowerCase().includes(q);
    });
  }, [displayList, searchQuery]);

  const allowEntry = async (student: DisplayStudent) => {
    try {
      if (student.statusId) {
        // Update existing daily_student_status
        const { error } = await supabase
          .from('daily_student_status')
          .update({ access_allowed: true, gate_status: 'present' })
          .eq('id', student.statusId);
        if (error) throw error;
      } else {
        // Create a daily_student_status record with access_allowed = true
        const { error } = await supabase
          .from('daily_student_status')
          .insert({
            student_id: student.student_id,
            date: today,
            gate_status: 'present',
            access_allowed: true,
          });
        if (error) throw error;
      }

      // Update attendance_records too
      await supabase
        .from('attendance_records')
        .update({ gate_status: 'present', access_allowed: true })
        .eq('student_id', student.student_id)
        .eq('date', today);

      toast.success('تم السماح بالدخول');
      queryClient.invalidateQueries({ queryKey: ['absences-daily-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records-today'] });
      queryClient.invalidateQueries({ queryKey: ['absences-tardiness-page'] });
    } catch {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const getStatusBadge = (student: DisplayStudent) => {
    if (student.is_truant) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <Badge variant="destructive" className="text-[10px]">تغيب عن الحصة</Badge>
        </div>
      );
    }
    if (student.gate_status === 'tardy') {
      return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">متأخر</Badge>;
    }
    if (student.gate_status === 'absent') {
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
    filtered.forEach((student, i) => {
      const name = `${student.last_name} ${student.first_name}`;
      const label = student.is_truant ? 'تغيب عن حصة' : student.gate_status === 'tardy' ? 'متأخر' : 'غائب';
      rows += `<tr><td>${i + 1}</td><td>${name}</td><td>${student.section_name}</td><td>${label}</td></tr>`;
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

  const isLoading = studentsLoading;

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
        {/* Time info */}
        {settings && (
          <div className="text-xs text-muted-foreground text-center print:hidden">
            تأخر بعد: {settings.tardyCutoff} | غياب بعد: {settings.absentCutoff}
            {timeStatus.pastAbsent && <span className="text-destructive mr-2">• تجاوز وقت الغياب</span>}
          </div>
        )}

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
              {displayList.filter(s => s.gate_status === 'absent' && !s.is_truant).length}
            </p>
            <p className="text-[10px] text-muted-foreground">غائب</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold text-foreground">
              {displayList.filter(s => s.gate_status === 'tardy').length}
            </p>
            <p className="text-[10px] text-muted-foreground">متأخر</p>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">
              {displayList.filter(s => s.is_truant).length}
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
              <p className="text-muted-foreground">
                {!timeStatus.pastAbsent ? 'لم يتجاوز وقت الغياب بعد' : 'لا توجد غيابات أو تأخرات اليوم'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((student, index) => (
                <div key={student.id} className={`p-3 flex items-center gap-3 transition-colors ${student.is_truant ? 'bg-destructive/5' : ''}`}>
                  <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{index + 1}</span>

                  {student.is_truant && (
                    <span className="w-3 h-3 rounded-full bg-destructive animate-pulse shrink-0" title="تغيب عن الحصة رغم دخوله البوابة" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {student.last_name} {student.first_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{student.section_name}</span>
                      {student.missed_sessions > 0 && (
                        <span className="text-[10px] text-muted-foreground">• {student.missed_sessions} حصة</span>
                      )}
                    </div>
                    {student.reporting_teachers.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        أساتذة: {student.reporting_teachers.join('، ')}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {getStatusBadge(student)}
                  </div>

                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 border-success text-success hover:bg-success hover:text-success-foreground"
                      onClick={() => allowEntry(student)}
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
