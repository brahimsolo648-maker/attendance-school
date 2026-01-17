import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Download, Users, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useSections } from '@/hooks/useSections';
import { useStudents } from '@/hooks/useStudents';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const DailyAttendance = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const { data: sections = [] } = useSections();
  const { data: students = [] } = useStudents(selectedSection || undefined);

  // Get unique years from sections
  const years = [...new Set(sections.map(s => s.year))];

  // Filter sections by selected year
  const filteredSections = sections.filter(s => s.year === selectedYear);

  // Get attendance records for selected date and section
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', selectedDate, selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', dateStr);
      return data || [];
    },
    enabled: !!selectedSection
  });

  // Get attendance status for a student
  const getAttendanceStatus = (studentId: string) => {
    const record = attendanceRecords.find((r: any) => r.student_id === studentId);
    const student = students.find(s => s.id === studentId);

    if (student?.is_banned) {
      return { status: 'banned', label: 'ممنوع من الدخول', color: 'bg-warning text-warning-foreground' };
    }

    if (!record) {
      return { status: 'absent', label: 'غائب', color: 'bg-destructive text-destructive-foreground' };
    }

    if (record.check_in_time) {
      const time = new Date(record.check_in_time).toLocaleTimeString('ar-DZ', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return { 
        status: 'present', 
        label: `حاضر - ${time}`, 
        color: 'bg-success text-success-foreground' 
      };
    }

    return { status: 'absent', label: 'غائب', color: 'bg-destructive text-destructive-foreground' };
  };

  // Calculate statistics
  const presentCount = students.filter(s => {
    const status = getAttendanceStatus(s.id);
    return status.status === 'present';
  }).length;

  const absentCount = students.filter(s => {
    const status = getAttendanceStatus(s.id);
    return status.status === 'absent';
  }).length;

  const bannedCount = students.filter(s => s.is_banned).length;

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/main')}
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">قائمة الحضور اليومية</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-6 space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 ml-2" />
                {format(selectedDate, 'PPP', { locale: ar })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ar}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedYear} onValueChange={(val) => {
            setSelectedYear(val);
            setSelectedSection('');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="اختر السنة" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedYear}>
            <SelectTrigger>
              <SelectValue placeholder="اختر القسم" />
            </SelectTrigger>
            <SelectContent>
              {filteredSections.map(section => (
                <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        {selectedSection && students.length > 0 ? (
          <div className="glass-table overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">الاسم الكامل</TableHead>
                  <TableHead className="text-right">تاريخ الميلاد</TableHead>
                  <TableHead className="text-right">حالة الحضور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const status = getAttendanceStatus(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{student.first_name} {student.last_name}</TableCell>
                      <TableCell>
                        {student.birth_date ? format(new Date(student.birth_date), 'yyyy/MM/dd') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : selectedSection ? (
          <div className="text-center py-12 text-muted-foreground">
            لا يوجد تلاميذ في هذا القسم
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            اختر السنة والقسم لعرض قائمة الحضور
          </div>
        )}

        {/* Statistics */}
        {selectedSection && students.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4 text-center bg-success/10 border-success/30">
              <Users className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold text-success">{presentCount}</p>
              <p className="text-sm text-muted-foreground">حاضر</p>
            </div>
            <div className="glass-card p-4 text-center bg-destructive/10 border-destructive/30">
              <UserX className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{absentCount}</p>
              <p className="text-sm text-muted-foreground">غائب</p>
            </div>
            <div className="glass-card p-4 text-center bg-warning/10 border-warning/30">
              <UserX className="w-8 h-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold text-warning">{bannedCount}</p>
              <p className="text-sm text-muted-foreground">ممنوع</p>
            </div>
          </div>
        )}

        {/* Export Button */}
        {selectedSection && students.length > 0 && (
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF لهذا اليوم
          </Button>
        )}
      </main>
    </div>
  );
};

export default DailyAttendance;
