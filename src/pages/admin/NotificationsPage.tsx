import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, AlertTriangle, Bell, FileText, XCircle, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

type AbsenceLevel = 'first' | 'second' | 'official' | 'removal';

interface NotificationsPageProps {
  embedded?: boolean;
}

const NotificationsPage = ({ embedded = false }: NotificationsPageProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AbsenceLevel>('first');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: studentsWithAbsences = [], isLoading } = useQuery({
    queryKey: ['students-absences-notifications-page'],
    queryFn: async () => {
      const { data: students } = await supabase.from('students').select('id, first_name, last_name, section_id');
      const { data: absences } = await supabase.from('absence_records').select('student_id, created_at').order('created_at', { ascending: true });
      const { data: sections } = await supabase.from('sections').select('id, full_name');
      const { data: attendanceRecords } = await supabase.from('attendance_records').select('student_id, date, check_in_time').order('date', { ascending: false });

      const absencesByStudent: Record<string, { count: number; firstDate: string | null; dates: Set<string> }> = {};
      (absences || []).forEach((record: any) => {
        const dateStr = format(new Date(record.created_at), 'yyyy-MM-dd');
        if (!absencesByStudent[record.student_id]) {
          absencesByStudent[record.student_id] = { count: 0, firstDate: null, dates: new Set() };
        }
        if (!absencesByStudent[record.student_id].dates.has(dateStr)) {
          absencesByStudent[record.student_id].dates.add(dateStr);
          absencesByStudent[record.student_id].count++;
          if (!absencesByStudent[record.student_id].firstDate) {
            absencesByStudent[record.student_id].firstDate = record.created_at;
          }
        }
      });

      const lastAttendanceByStudent: Record<string, string | null> = {};
      (attendanceRecords || []).forEach((record: any) => {
        if (record.check_in_time && !lastAttendanceByStudent[record.student_id]) {
          lastAttendanceByStudent[record.student_id] = record.check_in_time;
        }
      });

      return (students || []).map(student => ({
        ...student,
        absenceCount: absencesByStudent[student.id]?.count || 0,
        firstAbsenceDate: absencesByStudent[student.id]?.firstDate || null,
        lastAttendanceDate: lastAttendanceByStudent[student.id] || null,
        sectionName: sections?.find(s => s.id === student.section_id)?.full_name || ''
      })).filter(s => s.absenceCount >= 3);
    }
  });

  const getStudentsByLevel = (level: AbsenceLevel) => {
    let filtered;
    switch (level) {
      case 'first': filtered = studentsWithAbsences.filter(s => s.absenceCount >= 3 && s.absenceCount < 10); break;
      case 'second': filtered = studentsWithAbsences.filter(s => s.absenceCount >= 10 && s.absenceCount < 17); break;
      case 'official': filtered = studentsWithAbsences.filter(s => s.absenceCount >= 17 && s.absenceCount < 32); break;
      case 'removal': filtered = studentsWithAbsences.filter(s => s.absenceCount >= 32); break;
      default: filtered = [];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(s => s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || s.sectionName.toLowerCase().includes(q));
    }
    return filtered;
  };

  const getLevelConfig = (level: AbsenceLevel) => {
    switch (level) {
      case 'first': return { label: 'إشعار أول', color: 'bg-warning/20 text-warning', borderColor: 'border-warning/40', icon: <Bell className="w-4 h-4" />, description: '3-9 أيام' };
      case 'second': return { label: 'إشعار ثاني', color: 'bg-warning/30 text-warning', borderColor: 'border-warning/50', icon: <AlertTriangle className="w-4 h-4" />, description: '10-16 يوم' };
      case 'official': return { label: 'إعذار', color: 'bg-destructive/15 text-destructive', borderColor: 'border-destructive/30', icon: <FileText className="w-4 h-4" />, description: '17-31 يوم' };
      case 'removal': return { label: 'شطب', color: 'bg-destructive/25 text-destructive', borderColor: 'border-destructive/50', icon: <XCircle className="w-4 h-4" />, description: '32+ يوم' };
    }
  };

  const levels: AbsenceLevel[] = ['first', 'second', 'official', 'removal'];

  const content = (
    <div className={`${embedded ? 'content-container py-4' : 'content-container py-6'} space-y-4`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو القسم..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10 h-9 text-sm" dir="rtl" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as AbsenceLevel)}>
          <TabsList className="grid grid-cols-4 w-full h-auto gap-1 p-1">
            {levels.map(level => {
              const config = getLevelConfig(level);
              const count = getStudentsByLevel(level).length;
              return (
                <TabsTrigger key={level} value={level} className={`flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] ${activeTab === level ? config.color : ''}`}>
                  {config.icon}
                  <span className="font-medium">{config.label}</span>
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {levels.map(level => {
            const config = getLevelConfig(level);
            const students = getStudentsByLevel(level);
            return (
              <TabsContent key={level} value={level} className="mt-3">
                <div className={`p-2.5 rounded-lg mb-3 ${config.color} text-xs flex items-center gap-2`}>
                  {config.icon}
                  <span className="font-medium">{config.description}</span>
                  <span className="mr-auto opacity-75">{students.length} تلميذ</span>
                </div>

                {students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">لا يوجد تلاميذ في هذه الفئة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map(student => (
                      <div key={student.id} className={`p-3 rounded-xl border ${config.borderColor} transition-all hover:shadow-md bg-card`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm">{student.last_name} {student.first_name}</p>
                              <Badge variant="outline" className="text-[10px] font-bold">{config.label}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{student.sectionName}</p>
                            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span><span className="font-medium text-foreground">{student.absenceCount}</span> يوم غياب</span>
                              {student.lastAttendanceDate && (
                                <span>آخر حضور: {format(new Date(student.lastAttendanceDate), 'MM/dd')}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs" onClick={() => navigate(`/admin/student/${student.id}`)}>
                            <Eye className="w-3.5 h-3.5 ml-1" />تفاصيل
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="page-container min-h-screen">
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-4 h-4 ml-1" />العودة
          </Button>
          <h1 className="text-base font-bold text-foreground">الإشعارات</h1>
          <div className="w-16" />
        </div>
      </header>
      {content}
    </div>
  );
};

export default NotificationsPage;
