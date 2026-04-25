import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, FileDown, Printer, ShieldCheck, Clock, UserX, Download, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoadingScreen from '@/components/LoadingScreen';
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

  // Fetch daily_student_status records for today
  const { data: dailyStatuses = [] } = useQuery({
    queryKey: ['absences-daily-status', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_student_status')
        .select('id, student_id, date, gate_status, teacher_status, is_truant, access_allowed, missed_sessions, reporting_teachers')
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

  // Fetch attendance records to know who checked in today
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

  useEffect(() => {
    if (!timeStatus.pastTardy || allStudents.length === 0) return;

    const persistAutoStatuses = async () => {
      const statusMap = new Map(dailyStatuses.map((s) => [s.student_id, s]));
      const checkedInIds = new Set(attendanceRecords.filter((r) => r.check_in_time).map((r) => r.student_id));
      const targetStatus = timeStatus.pastAbsent ? 'absent' : 'tardy';

      const rowsToPersist = allStudents
        .filter((student) => !checkedInIds.has(student.id))
        .filter((student) => {
          const existing = statusMap.get(student.id);
          return !existing || (!existing.access_allowed && existing.gate_status !== targetStatus);
        })
        .map((student) => ({
          student_id: student.id,
          date: today,
          gate_status: targetStatus,
          access_allowed: false,
        }));

      if (rowsToPersist.length === 0) return;

      const inserts = rowsToPersist.filter((row) => !statusMap.has(row.student_id));
      const updates = rowsToPersist.filter((row) => statusMap.has(row.student_id));

      const insertResult = inserts.length
        ? await supabase.from('daily_student_status').insert(inserts)
        : { error: null };

      const updateResults = await Promise.all(
        updates.map((row) => {
          const existing = statusMap.get(row.student_id);
          return supabase
            .from('daily_student_status')
            .update({ gate_status: row.gate_status, access_allowed: false })
            .eq('id', existing!.id);
        })
      );

      if (!insertResult.error && updateResults.every((result) => !result.error)) {
        queryClient.invalidateQueries({ queryKey: ['absences-daily-status'] });
      }
    };

    persistAutoStatuses();
  }, [timeStatus, allStudents, attendanceRecords, dailyStatuses, today, queryClient]);

  // Fetch teacher-reported absences for today
  const { data: teacherAbsences = [] } = useQuery({
    queryKey: ['teacher-absences-today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_records')
        .select('student_id, absence_list_id, absence_lists(teacher_id, subject, teachers(first_name, last_name))')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Build the combined list
  const displayList: DisplayStudent[] = useMemo(() => {
    const statusMap = new Map<string, typeof dailyStatuses[0]>();
    dailyStatuses.forEach(s => statusMap.set(s.student_id, s));

    const checkedInMap = new Map<string, typeof attendanceRecords[0]>();
    attendanceRecords.forEach(r => {
      if (r.check_in_time) checkedInMap.set(r.student_id, r);
    });

    // Build teacher absence info per student
    const teacherAbsenceMap = new Map<string, { teachers: string[], sessions: number }>();
    teacherAbsences.forEach((ta: any) => {
      const sid = ta.student_id;
      const existing = teacherAbsenceMap.get(sid) || { teachers: [], sessions: 0 };
      existing.sessions += 1;
      const teacher = ta.absence_lists?.teachers;
      if (teacher) {
        const name = `${teacher.first_name} ${teacher.last_name}`;
        if (!existing.teachers.includes(name)) existing.teachers.push(name);
      }
      teacherAbsenceMap.set(sid, existing);
    });

    const result: DisplayStudent[] = [];
    const addedStudentIds = new Set<string>();

    // 1) Students with daily_student_status that are NOT allowed (tardy/absent/truant)
    for (const status of dailyStatuses) {
      // Show students who are NOT access_allowed OR are truant
      if (!status.access_allowed || status.is_truant) {
        const student = allStudents.find(s => s.id === status.student_id);
        if (student) {
          const taInfo = teacherAbsenceMap.get(student.id);
          addedStudentIds.add(student.id);
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
            missed_sessions: taInfo?.sessions || status.missed_sessions || 0,
            reporting_teachers: taInfo?.teachers || status.reporting_teachers || [],
          });
        }
      }
    }

    // 2) Students reported absent by teachers but not yet in the list (truancy detection)
    for (const [studentId, taInfo] of teacherAbsenceMap.entries()) {
      if (addedStudentIds.has(studentId)) continue;
      const student = allStudents.find(s => s.id === studentId);
      if (!student) continue;
      
      const status = statusMap.get(studentId);
      const checkedIn = checkedInMap.has(studentId);
      const isTruant = checkedIn; // Scanned at gate but absent in class
      
      // If student already allowed and not truant, skip
      if (status && status.access_allowed && !isTruant) continue;

      addedStudentIds.add(studentId);
      result.push({
        id: status?.id || `teacher-${studentId}`,
        statusId: status?.id || null,
        student_id: studentId,
        first_name: student.first_name,
        last_name: student.last_name,
        section_name: (student as any).sections?.full_name || '-',
        gate_status: checkedIn ? 'present' : 'absent',
        teacher_status: 'absent',
        is_truant: isTruant,
        access_allowed: false,
        missed_sessions: taInfo.sessions,
        reporting_teachers: taInfo.teachers,
      });
    }

    // 3) Auto-detect: students who never scanned AND past tardy/absent cutoff
    if (timeStatus.pastTardy) {
      for (const student of allStudents) {
        if (addedStudentIds.has(student.id)) continue;
        if (checkedInMap.has(student.id)) continue;
        
        // Check if they already have a status with access_allowed=true
        const existingStatus = statusMap.get(student.id);
        if (existingStatus?.access_allowed) continue;

        addedStudentIds.add(student.id);
        result.push({
          id: existingStatus?.id || `auto-${student.id}`,
          statusId: existingStatus?.id || null,
          student_id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          section_name: (student as any).sections?.full_name || '-',
          gate_status: timeStatus.pastAbsent ? 'absent' : 'tardy',
          teacher_status: 'unknown',
          is_truant: false,
          access_allowed: false,
          missed_sessions: 0,
          reporting_teachers: [],
        });
      }
    }

    return result;
  }, [dailyStatuses, allStudents, attendanceRecords, teacherAbsences, timeStatus]);

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
        const { error } = await supabase
          .from('daily_student_status')
          .update({ access_allowed: true, gate_status: 'present', is_truant: false })
          .eq('id', student.statusId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_student_status')
          .insert({
            student_id: student.student_id,
            date: today,
            gate_status: 'present',
            access_allowed: true,
            is_truant: false,
          });
        if (error) throw error;
      }

      // Also update attendance_records to allow scanning
      const { data: existingAttendance } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', student.student_id)
        .eq('date', today)
        .maybeSingle();

      if (existingAttendance) {
        await supabase
          .from('attendance_records')
          .update({ gate_status: 'present', access_allowed: true })
          .eq('id', existingAttendance.id);
      }

      toast.success('تم السماح بالدخول');
      queryClient.invalidateQueries({ queryKey: ['absences-daily-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records-today'] });
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

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('يرجى السماح بالنوافذ المنبثقة'); return; }

    let rows = '';
    filtered.forEach((student, i) => {
      const name = `${student.last_name} ${student.first_name}`;
      const label = student.is_truant ? 'تغيب عن حصة' : student.gate_status === 'tardy' ? 'متأخر' : 'غائب';
      rows += `<tr><td>${i + 1}</td><td>${name}</td><td>${student.section_name}</td><td>${label}</td></tr>`;
    });

    printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>الغيابات والتأخرات - ${today}</title><style>@page{size:A4;margin:1.5cm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;padding:20px}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #1a365d;padding-bottom:10px}.header h1{font-size:20px;color:#1a365d}.header p{font-size:12px;color:#666;margin-top:5px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:15px}th,td{padding:8px 12px;text-align:right;border:1px solid #ddd}th{background:#f0f0f0;font-weight:600}</style></head><body><div class="header"><h1>الغيابات والتأخرات</h1><p>${today} - الإجمالي: ${filtered.length}</p></div><table><thead><tr><th>#</th><th>الاسم الكامل</th><th>القسم</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`);
    printWindow.document.close();
  };

  if (studentsLoading) return <LoadingScreen />;

  return (
    <div className="page-container min-h-screen" dir="rtl">
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
                <Button variant="outline" size="sm"><FileDown className="w-4 h-4 ml-1" />PDF</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF}><Download className="w-4 h-4 ml-2" />تنزيل PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 ml-1" />طباعة</Button>
          </div>
        </div>
      </header>

      <main className="content-container py-6 space-y-4">
        {settings && (
          <div className="text-xs text-muted-foreground text-center print:hidden">
            تأخر بعد: {settings.tardyCutoff} | غياب بعد: {settings.absentCutoff}
            {timeStatus.pastTardy && !timeStatus.pastAbsent && <span className="text-warning mr-2">• وقت التأخر</span>}
            {timeStatus.pastAbsent && <span className="text-destructive mr-2">• تجاوز وقت الغياب</span>}
          </div>
        )}

        <div className="relative print:hidden">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو القسم..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>

        <div className="grid grid-cols-3 gap-3 print:hidden">
          <div className="glass-card p-3 text-center">
            <UserX className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold text-foreground">{displayList.filter(s => s.gate_status === 'absent' && !s.is_truant).length}</p>
            <p className="text-[10px] text-muted-foreground">غائب</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{displayList.filter(s => s.gate_status === 'tardy').length}</p>
            <p className="text-[10px] text-muted-foreground">متأخر</p>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{displayList.filter(s => s.is_truant).length}</p>
            <p className="text-[10px] text-muted-foreground">تغيب عن حصة</p>
          </div>
        </div>

        <div ref={tableRef} className="glass-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-success mb-3 opacity-50" />
              <p className="text-muted-foreground">
                {!timeStatus.pastTardy ? 'لم يتجاوز وقت التأخر بعد - الغيابات ستظهر تلقائياً بعد تجاوز الوقت المحدد' : 'لا توجد غيابات أو تأخرات اليوم'}
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

                  <div className="shrink-0">{getStatusBadge(student)}</div>

                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 border-success text-success hover:bg-success hover:text-success-foreground active:scale-[0.98]"
                      onClick={() => allowEntry(student)}
                    >
                      <DoorOpen className="w-3.5 h-3.5" />
                      سماح
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
