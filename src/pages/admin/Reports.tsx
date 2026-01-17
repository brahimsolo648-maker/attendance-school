import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileDown, Printer, User, AlertCircle, Clock, BookOpen, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSections, getYears } from '@/hooks/useSections';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Color coding based on absence days
const getAbsenceColor = (days: number, isConflict: boolean): string => {
  if (isConflict) return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300';
  if (days > 32) return 'bg-red-200 dark:bg-red-900/40 border-red-400';
  if (days > 17) return 'bg-orange-200 dark:bg-orange-900/40 border-orange-400';
  if (days > 10) return 'bg-yellow-200 dark:bg-yellow-900/40 border-yellow-400';
  if (days >= 3) return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300';
  return 'bg-card border-border';
};

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<any | null>(null);
  
  const years = getYears();
  const { data: allSections = [] } = useSections();
  
  // Fetch all absence lists with teacher info
  const { data: absenceLists = [] } = useQuery({
    queryKey: ['absence-lists-with-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_lists')
        .select(`
          *,
          teachers(id, first_name, last_name, subject, signature_url),
          sections(id, name, full_name, year)
        `)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all absence records with student info
  const { data: absenceRecords = [] } = useQuery({
    queryKey: ['absence-records-with-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          *,
          students(id, first_name, last_name, section_id, is_banned),
          absence_lists(id, submitted_at)
        `);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch attendance records for conflict detection
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-records-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // Group and organize reports by year (ordered: أولى → ثانية → ثالثة)
  const reportsByYear = useMemo(() => {
    const grouped: Record<string, any[]> = {
      'أولى ثانوي': [],
      'ثانية ثانوي': [],
      'ثالثة ثانوي': []
    };

    absenceLists.forEach((list: any) => {
      if (!list.sections) return;
      
      const year = list.sections.year;
      const absentStudents = absenceRecords
        .filter((r: any) => r.absence_list_id === list.id)
        .map((r: any) => {
          if (!r.students) return null;
          
          const studentAbsences = absenceRecords.filter(
            (ar: any) => ar.students?.id === r.students.id
          );
          const uniqueDays = new Set(
            studentAbsences.map((ar: any) => 
              format(new Date(ar.created_at), 'yyyy-MM-dd')
            )
          );
          const absenceDays = uniqueDays.size;

          const listDate = format(new Date(list.submitted_at), 'yyyy-MM-dd');
          const hasQRAttendance = attendanceRecords.some(
            (ar: any) => ar.student_id === r.students.id && 
              ar.date === listDate && 
              ar.check_in_time
          );
          const attendanceTime = attendanceRecords.find(
            (ar: any) => ar.student_id === r.students.id && 
              ar.date === listDate && 
              ar.check_in_time
          )?.check_in_time;

          return {
            ...r.students,
            absenceDays,
            isConflict: hasQRAttendance,
            attendanceTime
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name, 'ar'));

      const reportData = {
        ...list,
        absentStudents
      };

      if (grouped[year]) {
        grouped[year].push(reportData);
      }
    });

    // Sort sections alphabetically within each year
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => {
        const sectionCompare = (a.sections?.name || '').localeCompare(b.sections?.name || '', 'ar');
        if (sectionCompare !== 0) return sectionCompare;
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });
    });

    return grouped;
  }, [absenceLists, absenceRecords, attendanceRecords]);

  const filteredReports = selectedYear 
    ? { [selectedYear]: reportsByYear[selectedYear] || [] }
    : reportsByYear;

  const handleYearChange = (year: string) => {
    setSelectedYear(year === 'all' ? '' : year);
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleExportPDF = async () => {
    toast({
      title: 'جاري التصدير',
      description: 'سيتم فتح نافذة الطباعة للحفظ كـ PDF',
    });
    
    // Create a print-optimized version
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'خطأ',
        description: 'يرجى السماح بالنوافذ المنبثقة',
        variant: 'destructive'
      });
      return;
    }
    
    const currentDate = format(new Date(), 'yyyy/MM/dd', { locale: ar });
    
    let content = '';
    Object.entries(filteredReports).forEach(([year, lists]) => {
      if (lists.length === 0) return;
      
      content += `
        <div class="year-section">
          <h2 class="year-title">${year}</h2>
      `;
      
      lists.forEach((list: any) => {
        if (list.absentStudents.length === 0) return;
        
        content += `
          <div class="list-section">
            <div class="list-header">
              <strong>${list.sections?.name}</strong> - ${list.subject || list.teachers?.subject}
              <span class="date">${format(new Date(list.submitted_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم الكامل</th>
                  <th>أيام الغياب</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        list.absentStudents.forEach((student: any, index: number) => {
          const colorClass = student.absenceDays > 32 ? 'red' :
                            student.absenceDays > 17 ? 'orange' :
                            student.absenceDays > 10 ? 'yellow' :
                            student.absenceDays >= 3 ? 'amber' : '';
          
          content += `
            <tr class="${colorClass}">
              <td>${index + 1}</td>
              <td>${student.last_name} ${student.first_name}</td>
              <td>${student.absenceDays} يوم</td>
              <td>${student.is_banned ? 'ممنوع' : student.isConflict ? 'تعارض' : 'عادي'}</td>
            </tr>
          `;
        });
        
        content += `
              </tbody>
            </table>
          </div>
        `;
      });
      
      content += '</div>';
    });
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تقارير الغياب - ${currentDate}</title>
          <style>
            @page { size: A4; margin: 1.5cm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              direction: rtl;
              padding: 20px;
              color: #1a1a1a;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #1a365d;
              padding-bottom: 15px;
            }
            .header h1 { font-size: 20px; color: #1a365d; margin-bottom: 5px; }
            .header p { font-size: 12px; color: #666; }
            .year-section { margin-bottom: 30px; }
            .year-title {
              font-size: 16px;
              background: #1a365d;
              color: white;
              padding: 10px 15px;
              border-radius: 8px 8px 0 0;
            }
            .list-section {
              border: 1px solid #ddd;
              margin-bottom: 15px;
              border-radius: 8px;
              overflow: hidden;
            }
            .list-header {
              background: #f5f5f5;
              padding: 10px 15px;
              font-size: 13px;
              display: flex;
              justify-content: space-between;
            }
            .date { color: #666; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 8px 12px; text-align: right; border-bottom: 1px solid #eee; }
            th { background: #f9f9f9; font-weight: 600; }
            tr.red { background: #fee2e2; }
            tr.orange { background: #ffedd5; }
            tr.yellow { background: #fef9c3; }
            tr.amber { background: #fef3c7; }
            @media print {
              .year-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ثانوية العربي عبد القادر</h1>
            <p>تقارير الغياب - ${currentDate}</p>
          </div>
          ${content}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleViewStudentDetails = (student: any, list: any) => {
    setSelectedStudentDetails({
      student,
      list,
      section: list.sections
    });
  };
  
  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav print:hidden">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">التقارير</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 ml-2" />
              حفظ PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8" ref={printRef}>
        {/* Filters */}
        <div className="card-elevated p-4 mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground">تصفية حسب السنة:</label>
            <Select value={selectedYear || 'all'} onValueChange={handleYearChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="جميع السنوات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع السنوات</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Color Legend */}
        <div className="glass-card p-4 mb-6 print:mb-4">
          <h3 className="font-medium text-foreground mb-3">دليل الألوان (حسب أيام الغياب)</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-white border-2 border-border"></div>
              <span>أقل من 3 أيام</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-amber-100 border-2 border-amber-300"></div>
              <span>3-10 أيام (إشعار أول)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-yellow-200 border-2 border-yellow-400"></div>
              <span>10-17 يوم (إشعار ثاني)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-orange-200 border-2 border-orange-400"></div>
              <span>17-32 يوم (إنذار)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-red-200 border-2 border-red-400"></div>
              <span>أكثر من 32 يوم (شطب)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-100 border-2 border-blue-300"></div>
              <span>تعارض (حضر QR + غائب)</span>
            </div>
          </div>
        </div>

        {/* Reports organized by Year */}
        {Object.entries(filteredReports).map(([year, lists]) => (
          lists.length > 0 && (
            <div key={year} className="mb-8">
              {/* Year Header */}
              <div className="bg-primary/10 p-4 rounded-t-xl border-b-2 border-primary">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  {year}
                  <Badge variant="secondary" className="mr-2">{lists.length} قائمة</Badge>
                </h2>
              </div>

              {/* Lists for this year */}
              <div className="space-y-4 p-4 bg-card rounded-b-xl border border-t-0 border-border">
                {lists.map((list: any) => (
                  <Card key={list.id} className="overflow-hidden">
                    {/* List Header with Teacher Info */}
                    <CardHeader className="bg-secondary/50 pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {list.sections?.name}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(list.submitted_at), 'HH:mm - yyyy/MM/dd', { locale: ar })}
                            </span>
                            <span className="flex items-center gap-1">
                              👨‍🏫 {list.teachers?.last_name} {list.teachers?.first_name}
                            </span>
                            <span className="flex items-center gap-1">
                              📚 {list.subject || list.teachers?.subject}
                            </span>
                          </div>
                        </div>
                        <Badge variant={list.absentStudents.length > 0 ? 'destructive' : 'secondary'}>
                          📋 {list.absentStudents.length} غائب
                        </Badge>
                      </div>
                    </CardHeader>

                    {/* Absent Students Table */}
                    <CardContent className="p-0">
                      {list.absentStudents.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right w-12">#</TableHead>
                              <TableHead className="text-right">الاسم الكامل</TableHead>
                              <TableHead className="text-right w-28">أيام الغياب</TableHead>
                              <TableHead className="text-right w-24">الحالة</TableHead>
                              <TableHead className="text-right w-20 print:hidden"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {list.absentStudents.map((student: any, index: number) => (
                              <TableRow 
                                key={student.id} 
                                className={`${getAbsenceColor(student.absenceDays, student.isConflict)} border-r-4`}
                              >
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                  {student.last_name} {student.first_name}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{student.absenceDays} يوم</Badge>
                                </TableCell>
                                <TableCell>
                                  {student.is_banned ? (
                                    <Badge variant="destructive">ممنوع</Badge>
                                  ) : student.isConflict ? (
                                    <Badge className="bg-blue-500 hover:bg-blue-600">
                                      <AlertCircle className="w-3 h-3 ml-1" />
                                      تعارض
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">عادي</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="print:hidden">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleViewStudentDetails(student, list)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="p-6 text-center text-muted-foreground">
                          ✓ لا يوجد غياب في هذه القائمة
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        ))}

        {/* Empty State */}
        {Object.values(filteredReports).every(lists => lists.length === 0) && (
          <div className="card-elevated p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-foreground mb-2">لا توجد قوائم غياب</p>
            <p className="text-muted-foreground">لم يتم إرسال أي قوائم غياب من المعلمين بعد</p>
          </div>
        )}
      </main>
      
      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudentDetails} onOpenChange={() => setSelectedStudentDetails(null)}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-right">تفاصيل التلميذ</DialogTitle>
          </DialogHeader>
          
          {selectedStudentDetails && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="font-bold text-lg">
                  {selectedStudentDetails.student.last_name} {selectedStudentDetails.student.first_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  القسم: {selectedStudentDetails.section?.full_name}
                </p>
              </div>

              {selectedStudentDetails.student.isConflict && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    ⚠️ هذا التلميذ سجل حضوره عبر QR ولكنه مسجل غائب
                  </p>
                  {selectedStudentDetails.student.attendanceTime && (
                    <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                      سجل حضوره الساعة: {format(new Date(selectedStudentDetails.student.attendanceTime), 'HH:mm')}
                    </p>
                  )}
                </div>
              )}

              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">إجمالي أيام الغياب:</span>
                  <Badge variant="destructive" className="text-lg px-3 py-1">
                    {selectedStudentDetails.student.absenceDays} يوم
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">تاريخ آخر غياب:</span>
                  <span className="font-medium">
                    {format(new Date(selectedStudentDetails.list.submitted_at), 'yyyy/MM/dd', { locale: ar })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
