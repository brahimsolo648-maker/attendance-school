import { useState } from 'react';
import { Eye, AlertTriangle, Bell, FileText, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type NotificationsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AbsenceLevel = 'first' | 'second' | 'official' | 'removal';

const NotificationsModal = ({ open, onOpenChange }: NotificationsModalProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AbsenceLevel>('first');

  const { data: studentsWithAbsences = [], isLoading } = useQuery({
    queryKey: ['students-absences-detailed'],
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
    },
    enabled: open
  });

  // 4 levels only (removed warning/إنذار)
  const getStudentsByLevel = (level: AbsenceLevel) => {
    switch (level) {
      case 'first': // إشعار أول: 3-9 أيام
        return studentsWithAbsences.filter(s => s.absenceCount >= 3 && s.absenceCount < 10);
      case 'second': // إشعار ثاني: 10-16 أيام
        return studentsWithAbsences.filter(s => s.absenceCount >= 10 && s.absenceCount < 17);
      case 'official': // إعذار: 17-24 أيام
        return studentsWithAbsences.filter(s => s.absenceCount >= 17 && s.absenceCount < 25);
      case 'removal': // شطب: 25+ أيام
        return studentsWithAbsences.filter(s => s.absenceCount >= 25);
      default:
        return [];
    }
  };

  const getLevelConfig = (level: AbsenceLevel) => {
    switch (level) {
      case 'first':
        return {
          label: 'إشعار أول',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
          borderColor: 'border-amber-300 dark:border-amber-700',
          icon: <Bell className="w-4 h-4" />,
          description: 'غياب 3-9 أيام'
        };
      case 'second':
        return {
          label: 'إشعار ثاني',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
          borderColor: 'border-yellow-400 dark:border-yellow-600',
          icon: <AlertTriangle className="w-4 h-4" />,
          description: 'غياب 10-16 يوم'
        };
      case 'official':
        return {
          label: 'إعذار',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
          borderColor: 'border-orange-400 dark:border-orange-600',
          icon: <FileText className="w-4 h-4" />,
          description: 'غياب 17-24 يوم'
        };
      case 'removal':
        return {
          label: 'شطب',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
          borderColor: 'border-red-400 dark:border-red-600',
          icon: <XCircle className="w-4 h-4" />,
          description: 'غياب 25+ يوم'
        };
    }
  };

  const handleViewDetails = (studentId: string) => {
    onOpenChange(false);
    navigate(`/admin/student/${studentId}`);
  };

  const levels: AbsenceLevel[] = ['first', 'second', 'official', 'removal'];

  const totalNotifications = studentsWithAbsences.length;
  const lastUpdate = new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              الإشعارات والتنبيهات
            </div>
            {totalNotifications > 0 && (
              <Badge variant="destructive">{totalNotifications}</Badge>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            آخر تحديث: {format(lastUpdate, 'PPp', { locale: ar })}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
                    className={`flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] ${activeTab === level ? config.color : ''}`}
                  >
                    {config.icon}
                    <span className="font-medium">{config.label}</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
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
                  <div className={`p-2 rounded-lg mb-3 ${config.color} text-xs flex items-center gap-2`}>
                    {config.icon}
                    <span>{config.description}</span>
                  </div>

                  <ScrollArea className="h-[380px]">
                    {students.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>لا يوجد تلاميذ في هذه الفئة</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pr-2">
                        {students.map(student => (
                          <div 
                            key={student.id}
                            className={`p-3 rounded-lg border-2 ${config.color} ${config.borderColor} transition-all hover:shadow-md`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-xs opacity-80 truncate">{student.sectionName}</p>
                                
                                <div className="mt-2 space-y-1 text-xs opacity-90">
                                  <p className="flex items-center gap-1">
                                    <span className="font-medium">عدد أيام الغياب:</span>
                                    <Badge variant="outline" className="text-xs">
                                      {student.absenceCount} يوم
                                    </Badge>
                                  </p>
                                  {student.firstAbsenceDate && (
                                    <p>
                                      <span className="font-medium">منذ:</span>{' '}
                                      {format(new Date(student.firstAbsenceDate), 'yyyy/MM/dd')}
                                    </p>
                                  )}
                                  {student.lastAttendanceDate && (
                                    <p>
                                      <span className="font-medium">آخر حضور:</span>{' '}
                                      {format(new Date(student.lastAttendanceDate), 'yyyy/MM/dd')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="shrink-0"
                                onClick={() => handleViewDetails(student.id)}
                              >
                                <Eye className="w-4 h-4 ml-1" />
                                تفاصيل
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsModal;
