import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Save, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSections } from '@/hooks/useSections';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

type ParsedStudent = {
  firstName: string;
  lastName: string;
  birthDate?: string;
  status: 'valid' | 'warning' | 'error';
  statusMessage?: string;
};

const BATCH_SIZE = 20; // Process students in batches to avoid memory issues

const UploadLists = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [parseProgress, setParseProgress] = useState(0);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [replaceMode, setReplaceMode] = useState<'replace' | 'add' | null>(null);

  const { data: sections = [] } = useSections();

  // Get unique years from sections
  const years = [...new Set(sections.map(s => s.year))];

  // Filter sections by selected year
  const filteredSections = sections.filter(s => s.year === selectedYear);

  // Get selected section info
  const selectedSectionInfo = sections.find(s => s.id === selectedSection);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateBirthDate = (dateStr: string | undefined): { isValid: boolean; formatted?: string } => {
    if (!dateStr) return { isValid: true };
    
    // Try different date formats
    const datePatterns = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let year, month, day;
        if (pattern.source.startsWith('^(\\d{4})')) {
          [, year, month, day] = match;
        } else {
          [, day, month, year] = match;
        }
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2015) {
          return { isValid: true, formatted: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
        }
      }
    }

    return { isValid: false };
  };

  const parseFileInBatches = async (file: File) => {
    setIsUploading(true);
    setParseProgress(0);
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        
        // Read workbook with memory optimization
        const workbook = XLSX.read(data, { 
          type: 'binary',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        
        setParseProgress(20);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        setParseProgress(40);

        // Process data in batches
        const students: ParsedStudent[] = [];
        const totalRows = jsonData.length - 1; // Exclude header
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length >= 2) {
            const firstName = String(row[0] || '').trim();
            const lastName = String(row[1] || '').trim();
            let birthDateRaw = row[2] ? String(row[2]).trim() : undefined;
            
            // Handle Excel date serial numbers
            if (birthDateRaw && !isNaN(Number(birthDateRaw))) {
              const excelDate = XLSX.SSF.parse_date_code(Number(birthDateRaw));
              if (excelDate) {
                birthDateRaw = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
              }
            }

            let status: 'valid' | 'warning' | 'error' = 'valid';
            let statusMessage = '';

            if (!firstName || !lastName) {
              status = 'error';
              statusMessage = 'الاسم أو اللقب مفقود';
            } else if (birthDateRaw) {
              const validation = validateBirthDate(birthDateRaw);
              if (!validation.isValid) {
                status = 'warning';
                statusMessage = 'تاريخ الميلاد غير صالح';
              } else {
                birthDateRaw = validation.formatted;
              }
            }

            if (firstName || lastName) {
              students.push({
                firstName,
                lastName,
                birthDate: birthDateRaw,
                status,
                statusMessage
              });
            }
          }

          // Update progress every batch
          if (i % BATCH_SIZE === 0) {
            setParseProgress(40 + Math.round((i / totalRows) * 50));
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        setParseProgress(95);

        if (students.length === 0) {
          toast.error('لم يتم العثور على بيانات صالحة في الملف');
          setIsUploading(false);
          return;
        }

        // Clear the workbook from memory
        (workbook as any).SheetNames = null;
        (workbook as any).Sheets = null;

        setParsedData(students);
        setFileName(file.name);
        setFileSize(formatFileSize(file.size));
        setParseProgress(100);
        
        const validCount = students.filter(s => s.status === 'valid').length;
        const warningCount = students.filter(s => s.status === 'warning').length;
        const errorCount = students.filter(s => s.status === 'error').length;

        toast.success(
          `تم تحليل ${students.length} سجل: ${validCount} صالح${warningCount > 0 ? `، ${warningCount} تحذير` : ''}${errorCount > 0 ? `، ${errorCount} خطأ` : ''}`
        );
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('حدث خطأ في قراءة الملف. تأكد من صحة الملف');
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      toast.error('فشل في قراءة الملف');
      setIsUploading(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFileInBatches(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        parseFileInBatches(file);
      } else {
        toast.error('نوع الملف غير مدعوم. استخدم xlsx, xls, أو csv');
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const checkExistingStudents = async () => {
    if (!selectedSection) return false;
    
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', selectedSection);
    
    return (count || 0) > 0;
  };

  const handlePreSave = async () => {
    if (!selectedSection || parsedData.length === 0) {
      toast.error('اختر القسم والملف أولاً');
      return;
    }

    const hasExisting = await checkExistingStudents();
    if (hasExisting) {
      setShowReplaceDialog(true);
    } else {
      handleSave('add');
    }
  };

  const handleSave = async (mode: 'replace' | 'add') => {
    setShowReplaceDialog(false);
    setReplaceMode(mode);
    setIsSaving(true);

    try {
      const validStudents = parsedData.filter(s => s.status !== 'error');

      if (validStudents.length === 0) {
        toast.error('لا توجد بيانات صالحة للحفظ');
        setIsSaving(false);
        return;
      }

      // Delete existing students if replacing
      if (mode === 'replace') {
        const { error: deleteError } = await supabase
          .from('students')
          .delete()
          .eq('section_id', selectedSection);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }
      }

      // Insert new students in batches
      let savedCount = 0;
      for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
        const batch = validStudents.slice(i, i + BATCH_SIZE).map(student => ({
          first_name: student.firstName,
          last_name: student.lastName,
          birth_date: student.birthDate || null,
          section_id: selectedSection
        }));

        const { error } = await supabase
          .from('students')
          .insert(batch);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        savedCount += batch.length;
      }

      // Play success sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (e) {}

      toast.success(
        `✓ تم حفظ ${savedCount} تلميذ في قسم ${selectedSectionInfo?.name}`,
        {
          description: 'يمكنك الآن استخدام القائمة في التسجيل والتقارير',
          duration: 5000
        }
      );

      // Reset form
      setParsedData([]);
      setFileName('');
      setFileSize('');
      setParseProgress(0);
      
    } catch (error) {
      console.error('Error saving students:', error);
      toast.error('حدث خطأ أثناء الحفظ. حاول مرة أخرى');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setParsedData([]);
    setFileName('');
    setFileSize('');
    setParseProgress(0);
  };

  const validCount = parsedData.filter(s => s.status === 'valid').length;
  const warningCount = parsedData.filter(s => s.status === 'warning').length;
  const errorCount = parsedData.filter(s => s.status === 'error').length;

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
          <h1 className="text-lg font-bold text-foreground">تحميل القوائم</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-6 space-y-6">
        {/* Section Selection */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              اختر القسم المستهدف
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">السنة الدراسية</label>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">القسم</label>
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
          </CardContent>
        </Card>

        {/* File Upload Area */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>رفع ملف القائمة</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                  <p className="text-lg font-medium">جاري تحليل الملف...</p>
                  <Progress value={parseProgress} className="w-64 mx-auto" />
                  <p className="text-sm text-muted-foreground">{parseProgress}%</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">اسحب وأفلت الملف هنا</p>
                  <p className="text-sm text-muted-foreground mb-4">أو</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <FileSpreadsheet className="w-4 h-4 ml-2" />
                        اختر ملف
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-4">
                    الملفات المدعومة: xlsx, xls, csv • الحد الأقصى: 20MB
                  </p>
                </>
              )}
            </div>

            {fileName && !isUploading && (
              <div className="mt-4 p-3 bg-secondary rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <span className="font-medium">{fileName}</span>
                  <Badge variant="secondary">{fileSize}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {parsedData.length > 0 && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-success/10 border-success/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-success">{validCount}</p>
                  <p className="text-sm text-muted-foreground">صالح</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
                  <p className="text-sm text-muted-foreground">تحذير</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{errorCount}</p>
                  <p className="text-sm text-muted-foreground">خطأ</p>
                </CardContent>
              </Card>
            </div>

            {/* Warning Alert */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>تنبيه مهم</AlertTitle>
              <AlertDescription>
                عند الحفظ يمكنك اختيار استبدال البيانات الحالية أو الإضافة إليها. سيتم إنشاء رموز QR فريدة لكل تلميذ تلقائياً.
              </AlertDescription>
            </Alert>

            {/* Data Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle>معاينة البيانات ({parsedData.length} تلميذ)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right w-12">#</TableHead>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">اللقب</TableHead>
                        <TableHead className="text-right">تاريخ الميلاد</TableHead>
                        <TableHead className="text-right w-24">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 100).map((student, index) => (
                        <TableRow 
                          key={index}
                          className={
                            student.status === 'error' 
                              ? 'bg-destructive/10' 
                              : student.status === 'warning' 
                                ? 'bg-yellow-500/10' 
                                : ''
                          }
                        >
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{student.firstName || '-'}</TableCell>
                          <TableCell>{student.lastName || '-'}</TableCell>
                          <TableCell>{student.birthDate || '-'}</TableCell>
                          <TableCell>
                            {student.status === 'valid' ? (
                              <Badge variant="secondary" className="bg-success/20 text-success">صالح</Badge>
                            ) : student.status === 'warning' ? (
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700" title={student.statusMessage}>
                                تحذير
                              </Badge>
                            ) : (
                              <Badge variant="destructive" title={student.statusMessage}>خطأ</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    عرض 100 من {parsedData.length} سجل
                  </p>
                )}
              </CardContent>
            </Card>

            {/* CRITICAL: Save Button */}
            <Button
              variant="default"
              size="lg"
              className="w-full h-16 text-lg bg-success hover:bg-success/90"
              onClick={handlePreSave}
              disabled={!selectedSection || isSaving || validCount === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-6 h-6 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6 ml-2" />
                  حفظ القائمة في النظام ({validCount} تلميذ)
                </>
              )}
            </Button>
          </>
        )}
      </main>

      {/* Replace/Add Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>يوجد تلاميذ في هذا القسم</DialogTitle>
            <DialogDescription>
              القسم المحدد يحتوي على بيانات تلاميذ. كيف تريد المتابعة؟
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="destructive"
              className="h-20 flex-col gap-2"
              onClick={() => handleSave('replace')}
            >
              <RefreshCw className="w-6 h-6" />
              <span>استبدال الكل</span>
              <span className="text-xs opacity-75">حذف القديم وإضافة الجديد</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => handleSave('add')}
            >
              <Upload className="w-6 h-6" />
              <span>إضافة فقط</span>
              <span className="text-xs opacity-75">الإبقاء على القديم</span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReplaceDialog(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UploadLists;
