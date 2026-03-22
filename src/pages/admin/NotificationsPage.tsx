import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, AlertTriangle, Bell, FileText, XCircle, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

type AbsenceLevel = 'first' | 'second' | 'official' | 'removal';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AbsenceLevel>('first');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: studentsWithAbsences = [], isLoading } = useQuery({
    queryKey: ['students-absences-notifications-page'],
    queryFn: async () => {
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name, section_id');
      
      const { data: absences } = await supabase
        .from('absence_records')
        .select('student_id, created_at')
        .order('created_at', { ascending: true });

      const { data: sections } = await supabase
        .from('sections')
        .select('id, full_name');

      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('student_id, date, check_in_time')
        .order('date', { ascending: false });

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
      filtered = filtered.filter(s => 
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.sectionName.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  };

  const getLevelConfig = (level: AbsenceLevel) => {
    switch (level) {
      case 'first':
        return {
          label: 'إشعار أول',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
          borderColor: 'border-yellow-400 dark:border-yellow-600',
          icon: <Bell className="w-4 h-4" />,
          description: 'غياب 3-9 أيام'
        };
      case 'second':
        return {
          label: 'إشعار ثاني',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
          borderColor: 'border-amber-400 dark:border-amber-600',
          icon: <AlertTriangle className="w-4 h-4" />,
          description: 'غياب 10-16 يوم'
        };
      case 'official':
        return {
          label: 'إعذار',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
          borderColor: 'border-orange-400 dark:border-orange-600',
          icon: <FileText className="w-4 h-4" />,
          description: 'غياب 17-31 يوم'
        };
      case 'removal':
        return {
          label: 'شطب',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
          borderColor: 'border-red-400 dark:border-red-600',
          icon: <XCircle className="w-4 h-4" />,
          description: 'غياب 32+ يوم'
        };
    }
  };

  const levels: AbsenceLevel[] = ['first', 'second', 'official', 'removal'];
  const totalNotifications = studentsWithAbsences.length;

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h1 className="text-lg font-bold text-foreground">الإشعارات والتنبيهات</h1>
            {totalNotifications > 0 && (
              <Badge variant="destructive">{totalNotifications}</Badge>
            )}
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="content-container py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
            dir="rtl"
          />
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
                  <TabsTrigger 
                    key={level} 
                    value={level}
                    className={`flex flex-col items-center gap-0.5 py-2.5 px-1 text-[11px] ${activeTab === level ? config.color : ''}`}
                  >
                    {config.icon}
                    <span className="font-medium">{config.label}</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {levels.map(level => {
              const config = getLevelConfig(level);
              const students = getStudentsByLevel(level);
              
              return (
                <TabsContent key={level} value={level} className="mt-4">
                  <div className={`p-3 rounded-lg mb-4 ${config.color} text-sm flex items-center gap-2`}>
                    {config.icon}
                    <span className="font-medium">{config.description}</span>
                    <span className="mr-auto text-xs opacity-75">{students.length} تلميذ</span>
                  </div>

                  {students.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">لا يوجد تلاميذ في هذه الفئة</p>
                      {searchQuery && <p className="text-sm mt-1">جرب تغيير كلمات البحث</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {students.map(student => (
                        <div 
                          key={student.id}
                          className={`p-4 rounded-xl border-2 ${config.color} ${config.borderColor} transition-all hover:shadow-md`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-base">
                                  {student.last_name} {student.first_name}
                                </p>
                                <Badge variant="outline" className="text-xs font-bold">
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="text-sm opacity-80 mt-0.5">{student.sectionName}</p>
                              
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs opacity-90">
                                <div>
                                  <span className="font-medium">أيام الغياب: </span>
                                  <Badge variant="outline" className="text-xs">
                                    {student.absenceCount} يوم
                                  </Badge>
                                </div>
                                {student.firstAbsenceDate && (
                                  <div>
                                    <span className="font-medium">منذ: </span>
                                    {format(new Date(student.firstAbsenceDate), 'yyyy/MM/dd')}
                                  </div>
                                )}
                                {student.lastAttendanceDate && (
                                  <div className="col-span-2">
                                    <span className="font-medium">آخر حضور: </span>
                                    {format(new Date(student.lastAttendanceDate), 'yyyy/MM/dd')}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="shrink-0"
                              onClick={() => navigate(`/admin/student/${student.id}`)}
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              تفاصيل
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
      </main>
    </div>
  );
};

export default NotificationsPage;
