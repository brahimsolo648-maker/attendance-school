import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileDown, Printer, User, Search, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Fetch teacher-reported absences for today
  const { data: absenceRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['all-absence-records-report', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          id, created_at, student_id,
          students(id, first_name, last_name, section_id, is_banned)
        `)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch gate-based absences/tardies for today
  const { data: gateStatuses = [] } = useQuery({
    queryKey: ['gate-absences-report', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_student_status')
        .select(`
          id, student_id, gate_status, is_truant,
          students(id, first_name, last_name, section_id, is_banned)
        `)
        .eq('date', todayStr)
        .in('gate_status', ['tardy', 'absent']);
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Fetch sections
  const { data: sections = [] } = useQuery({
    queryKey: ['sections-for-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sections').select('id, name, full_name, year');
      if (error) throw error;
      return data || [];
    }
  });

  // Merge teacher absences + gate absences into unified list
  const studentsReport = useMemo(() => {
    const studentMap: Record<string, {
      id: string;
      first_name: string;
      last_name: string;
      section_id: string;
      is_banned: boolean;
      source: 'teacher' | 'gate' | 'both';
      gate_status?: string;
      is_truant?: boolean;
    }> = {};

    // Teacher-reported absences
    absenceRecords.forEach((record: any) => {
      if (!record.students) return;
      const s = record.students;
      if (!studentMap[s.id]) {
        studentMap[s.id] = {
          id: s.id, first_name: s.first_name, last_name: s.last_name,
          section_id: s.section_id, is_banned: s.is_banned, source: 'teacher',
        };
      }
    });

    // Gate absences
    gateStatuses.forEach((gs: any) => {
      if (!gs.students) return;
      const s = gs.students;
      if (studentMap[s.id]) {
        studentMap[s.id].source = 'both';
        studentMap[s.id].gate_status = gs.gate_status;
        studentMap[s.id].is_truant = gs.is_truant;
      } else {
        studentMap[s.id] = {
          id: s.id, first_name: s.first_name, last_name: s.last_name,
          section_id: s.section_id, is_banned: s.is_banned, source: 'gate',
          gate_status: gs.gate_status, is_truant: gs.is_truant,
        };
      }
    });

    return Object.values(studentMap).map(s => {
      const sec = sections.find(sec => sec.id === s.section_id);
      return {
        ...s,
        sectionName: sec?.name || '',
        sectionYear: sec?.year || '',
      };
    }).sort((a, b) => a.last_name.localeCompare(b.last_name, 'ar'));
  }, [absenceRecords, gateStatuses, sections]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return studentsReport;
    const q = searchQuery.trim().toLowerCase();
    return studentsReport.filter(s => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      return name.includes(q) || s.sectionName.toLowerCase().includes(q) || s.sectionYear.toLowerCase().includes(q);
    });
  }, [studentsReport, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const currentDate = format(new Date(), 'yyyy/MM/dd', { locale: ar });

    let rows = '';
    filtered.forEach((student, index) => {
      rows += `
        <tr>
          <td>${index + 1}</td>
          <td>${student.last_name} ${student.first_name}</td>
          <td>${student.sectionName}</td>
          <td>${student.sectionYear}</td>
        </tr>
      `;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'خطأ', description: 'يرجى السماح بالنوافذ المنبثقة', variant: 'destructive' });
      return;
    }

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
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقارير الغياب</h1>
            <p>${currentDate} - إجمالي الغائبين: ${filtered.length}</p>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>الاسم الكامل</th><th>القسم</th><th>السنة</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          <h1 className="text-lg font-bold text-foreground">التقارير اليومية</h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="w-4 h-4 ml-2" />
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
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="content-container py-6" ref={printRef}>
        {/* Search */}
        <div className="relative mb-4 print:hidden">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Summary */}
        <div className="glass-card p-4 mb-4 text-center">
          <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي الغائبين اليوم</p>
        </div>

        {/* Main Table */}
        {loadingRecords ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-foreground mb-2">لا توجد سجلات غياب</p>
            <p className="text-muted-foreground">لم يتم تسجيل أي غياب اليوم</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-12">#</TableHead>
                  <TableHead className="text-right">الاسم الكامل</TableHead>
                  <TableHead className="text-right w-28">القسم</TableHead>
                  <TableHead className="text-right w-28">السنة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {student.last_name} {student.first_name}
                      {student.is_banned && (
                        <Badge variant="destructive" className="mr-2 text-[10px]">ممنوع</Badge>
                      )}
                    </TableCell>
                    <TableCell>{student.sectionName}</TableCell>
                    <TableCell>{student.sectionYear}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
