import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useSections } from '@/hooks/useSections';
import { useStudents } from '@/hooks/useStudents';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Archive = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const { data: sections = [] } = useSections();
  const { data: students = [] } = useStudents(selectedSection || undefined);

  // Get unique years from sections
  const years = [...new Set(sections.map(s => s.year))];

  // Filter sections by selected year
  const filteredSections = sections.filter(s => s.year === selectedYear);

  // Get all dates that have attendance data
  const { data: datesWithData = [] } = useQuery({
    queryKey: ['attendance-dates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('date');
      const uniqueDates = [...new Set((data || []).map((r: any) => r.date))];
      return uniqueDates;
    }
  });

  // Get attendance records for selected date and section
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['archive-attendance', selectedDate, selectedSection],
    queryFn: async () => {
      if (!selectedSection || !selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', dateStr);
      return data || [];
    },
    enabled: !!selectedSection && !!selectedDate
  });

  // Get absence lists for selected date
  const { data: absenceLists = [] } = useQuery({
    queryKey: ['archive-absences', selectedDate, selectedSection],
    queryFn: async () => {
      if (!selectedSection || !selectedDate) return [];
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data } = await supabase
        .from('absence_lists')
        .select('*, absence_records(*)')
        .eq('section_id', selectedSection)
        .gte('submitted_at', startOfDay.toISOString())
        .lte('submitted_at', endOfDay.toISOString());
      return data || [];
    },
    enabled: !!selectedSection && !!selectedDate
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

  // Check if date has data
  const hasDataOnDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return datesWithData.includes(dateStr);
  };

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/control-panel/dashboard')}
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">الأرشيف</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Sidebar */}
          <Card className="lg:col-span-1 glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                اختر التاريخ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ar}
                className="pointer-events-auto"
                modifiers={{
                  hasData: (date) => hasDataOnDate(date)
                }}
                modifiersStyles={{
                  hasData: { 
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    fontWeight: 'bold'
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-4 text-center">
                التواريخ المميزة تحتوي على بيانات
              </p>
            </CardContent>
          </Card>

          {/* Data View */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Selected Date Display */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    بيانات يوم {format(selectedDate, 'PPP', { locale: ar })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSection && students.length > 0 ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">#</TableHead>
                            <TableHead className="text-right">الاسم الكامل</TableHead>
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
                                  <Badge className={status.color}>
                                    {status.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Absence Lists for the day */}
                      {absenceLists.length > 0 && (
                        <div className="pt-4 border-t">
                          <h4 className="font-semibold mb-2">قوائم الغياب المرسلة</h4>
                          {absenceLists.map((list: any) => (
                            <div key={list.id} className="p-3 bg-secondary rounded-lg mb-2">
                              <p className="text-sm">المادة: {list.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(list.submitted_at), 'HH:mm', { locale: ar })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : selectedSection ? (
                    <p className="text-center text-muted-foreground py-8">
                      لا يوجد تلاميذ في هذا القسم
                    </p>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      اختر السنة والقسم لعرض البيانات
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedDate && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  اختر تاريخاً من التقويم لعرض البيانات
                </CardContent>
              </Card>
            )}

            {/* Export Buttons */}
            {selectedDate && selectedSection && students.length > 0 && (
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 ml-2" />
                  عرض تقرير ذلك اليوم
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 ml-2" />
                  تصدير الأرشيف
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Archive;
