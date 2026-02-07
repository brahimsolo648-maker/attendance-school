import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileDown, Printer, User, AlertCircle, Clock, Eye, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Color coding based on absence days (4 levels)
// < 3: white (إشعار أول), 3-9: yellow (إشعار ثاني), 10-31: orange (إعذار), ≥32: red (شطب)
const getAbsenceColor = (days: number): string => {
  if (days >= 32) return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-l-red-500';
  if (days >= 10) return 'bg-orange-100 dark:bg-orange-900/30 border-l-4 border-l-orange-500';
  if (days >= 3) return 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-l-yellow-500';
  return '';
};

const getAbsenceLevel = (days: number): { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (days >= 32) return { label: 'شطب', variant: 'destructive' };
  if (days >= 10) return { label: 'إعذار', variant: 'default' };
  if (days >= 3) return { label: 'إشعار ثاني', variant: 'secondary' };
  return { label: 'إشعار أول', variant: 'outline' };
};

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch all absence records with student and section info
  const { data: absenceRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['all-absence-records-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          id,
          created_at,
          student_id,
          absence_list_id,
          students(id, first_name, last_name, section_id, is_banned),
          absence_lists(id, submitted_at, subject, teacher_id, signature_url, teachers(id, first_name, last_name, subject, signature_url))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch sections
  const { data: sections = [] } = useQuery({
    queryKey: ['sections-for-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, full_name, year');
      if (error) throw error;
      return data || [];
    }
  });

  // Process: aggregate per student
  const studentsReport = useMemo(() => {
    const studentMap: Record<string, {
      id: string;
      first_name: string;
      last_name: string;
      section_id: string;
      is_banned: boolean;
      absenceDates: Set<string>;
      absenceDatesList: string[];
    }> = {};

    absenceRecords.forEach((record: any) => {
      if (!record.students) return;
      const student = record.students;
      const dateStr = format(new Date(record.created_at), 'yyyy-MM-dd');

      if (!studentMap[student.id]) {
        studentMap[student.id] = {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          section_id: student.section_id,
          is_banned: student.is_banned,
          absenceDates: new Set(),
          absenceDatesList: [],
        };
      }

      if (!studentMap[student.id].absenceDates.has(dateStr)) {
        studentMap[student.id].absenceDates.add(dateStr);
        studentMap[student.id].absenceDatesList.push(dateStr);
      }
    });

    return Object.values(studentMap)
      .map(s => ({
        ...s,
        absenceDays: s.absenceDates.size,
        absenceDatesList: s.absenceDatesList.sort().reverse(),
        sectionName: sections.find(sec => sec.id === s.section_id)?.full_name || '',
        sectionYear: sections.find(sec => sec.id === s.section_id)?.year || '',
      }))
      .filter(s => s.absenceDays > 0)
      .sort((a, b) => b.absenceDays - a.absenceDays);
  }, [absenceRecords, sections]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast({
      title: 'جاري التصدير',
      description: 'سيتم فتح نافذة الطباعة للحفظ كـ PDF',
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'خطأ', description: 'يرجى السماح بالنوافذ المنبثقة', variant: 'destructive' });
      return;
    }

    const currentDate = format(new Date(), 'yyyy/MM/dd', { locale: ar });

    let rows = '';
    studentsReport.forEach((student, index) => {
      const colorClass = student.absenceDays >= 32 ? 'red' :
        student.absenceDays >= 10 ? 'orange' :
        student.absenceDays >= 3 ? 'yellow' : '';
      const level = getAbsenceLevel(student.absenceDays);

      rows += `
        <tr class="${colorClass}">
          <td>${index + 1}</td>
          <td>${student.last_name} ${student.first_name}</td>
          <td>${student.absenceDays} يوم</td>
          <td>${student.sectionName}</td>
          <td>${student.sectionYear}</td>
          <td>${level.label}</td>
        </tr>
      `;
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
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 15px; }
            .header h1 { font-size: 20px; color: #1a365d; margin-bottom: 5px; }
            .header p { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
            th, td { padding: 8px 12px; text-align: right; border: 1px solid #ddd; }
            th { background: #f0f0f0; font-weight: 600; }
            tr.red { background: #fee2e2; }
            tr.orange { background: #ffedd5; }
            tr.yellow { background: #fef9c3; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقارير الغياب</h1>
            <p>${currentDate} - إجمالي التلاميذ الغائبين: ${studentsReport.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم الكامل</th>
                <th>أيام الغياب</th>
                <th>القسم</th>
                <th>السنة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
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
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="content-container py-8" ref={printRef}>
        {/* Color Legend */}
        <div className="glass-card p-4 mb-6 print:mb-4">
          <h3 className="font-medium text-foreground mb-3">دليل الألوان</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-background border-2 border-border"></div>
              <span>أقل من 3 أيام (إشعار أول)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500"></div>
              <span>3-9 أيام (إشعار ثاني)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500"></div>
              <span>10-31 يوم (إعذار)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-red-100 dark:bg-red-900/30 border-2 border-red-500"></div>
              <span>32+ يوم (شطب)</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{studentsReport.length}</p>
            <p className="text-xs text-muted-foreground">إجمالي الغائبين</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{studentsReport.filter(s => s.absenceDays >= 3 && s.absenceDays < 10).length}</p>
            <p className="text-xs text-muted-foreground">إشعار ثاني</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{studentsReport.filter(s => s.absenceDays >= 10 && s.absenceDays < 32).length}</p>
            <p className="text-xs text-muted-foreground">إعذار</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{studentsReport.filter(s => s.absenceDays >= 32).length}</p>
            <p className="text-xs text-muted-foreground">شطب</p>
          </div>
        </div>

        {/* Main Table */}
        {loadingRecords ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : studentsReport.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-foreground mb-2">لا توجد سجلات غياب</p>
            <p className="text-muted-foreground">لم يتم تسجيل أي غياب بعد</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-12">#</TableHead>
                  <TableHead className="text-right">الاسم الكامل</TableHead>
                  <TableHead className="text-right w-28">أيام الغياب</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">تواريخ الغياب</TableHead>
                  <TableHead className="text-right w-36">القسم</TableHead>
                  <TableHead className="text-right w-24">الحالة</TableHead>
                  <TableHead className="text-right w-16 print:hidden"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsReport.map((student, index) => {
                  const level = getAbsenceLevel(student.absenceDays);
                  return (
                    <TableRow
                      key={student.id}
                      className={getAbsenceColor(student.absenceDays)}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {student.last_name} {student.first_name}
                        {student.is_banned && (
                          <Badge variant="destructive" className="mr-2 text-[10px]">ممنوع</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold">{student.absenceDays} يوم</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {student.absenceDatesList.slice(0, 5).map(date => (
                            <span key={date} className="text-xs bg-secondary/70 px-1.5 py-0.5 rounded">
                              {format(new Date(date), 'MM/dd')}
                            </span>
                          ))}
                          {student.absenceDatesList.length > 5 && (
                            <span className="text-xs text-muted-foreground">
                              +{student.absenceDatesList.length - 5}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{student.sectionName}</p>
                          <p className="text-xs text-muted-foreground">{student.sectionYear}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={level.variant}>{level.label}</Badge>
                      </TableCell>
                      <TableCell className="print:hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/student/${student.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
