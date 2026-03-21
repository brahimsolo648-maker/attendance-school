import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Calendar, Trash2, Eye, Hash, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSectionsByYear, getYears } from '@/hooks/useSections';
import { useStudents, useCreateStudent, useDeleteStudent } from '@/hooks/useStudents';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ManageLists = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  
  // Add student form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const years = getYears();
  const { data: sectionsByYear } = useSectionsByYear(selectedYear);
  const { data: students, isLoading: studentsLoading } = useStudents(selectedSectionId);
  const createStudent = useCreateStudent();
  const deleteStudent = useDeleteStudent();
  
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedSectionId('');
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setBirthDate(undefined);
  };
  
  const handleAddStudent = async () => {
    if (!firstName.trim() || !lastName.trim() || !birthDate || !selectedSectionId) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة (الاسم، اللقب، تاريخ الميلاد)',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await createStudent.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: format(birthDate, 'yyyy-MM-dd'),
        section_id: selectedSectionId,
      });
      
      toast({
        title: 'تم بنجاح',
        description: 'تمت إضافة التلميذ بنجاح',
      });
      
      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast({
        title: 'خطأ',
        description: error?.message || 'حدث خطأ أثناء إضافة التلميذ',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      await deleteStudent.mutateAsync(studentToDelete);
      toast({
        title: 'تم بنجاح',
        description: 'تم حذف التلميذ بنجاح',
      });
      setStudentToDelete(null);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف التلميذ',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">إدارة القوائم</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8">
        {/* Filters */}
        <div className="card-elevated p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">اختر السنة</label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">اختر القسم</label>
              <Select 
                value={selectedSectionId} 
                onValueChange={setSelectedSectionId}
                disabled={!selectedYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsByYear?.map((section) => (
                    <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Students Table */}
        {selectedSectionId && (
          <div className="card-elevated overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">قائمة التلاميذ</h2>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/section/${selectedSectionId}/cards`)}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  طباعة بطاقات القسم
                </Button>
                <span className="text-sm text-muted-foreground">
                  {students?.length || 0} تلميذ
                </span>
              </div>
            </div>
            
            {studentsLoading ? (
              <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
            ) : students && students.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-12">#</TableHead>
                      <TableHead className="text-right">رمز التلميذ</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">اللقب</TableHead>
                      <TableHead className="text-right">تاريخ الميلاد</TableHead>
                      <TableHead className="text-right w-32">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow key={student.id} className={student.is_banned ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                            {student.student_code || '-'}
                          </span>
                        </TableCell>
                        <TableCell>{student.first_name}</TableCell>
                        <TableCell>{student.last_name}</TableCell>
                        <TableCell>
                          {student.birth_date 
                            ? format(new Date(student.birth_date), 'dd/MM/yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/admin/student/${student.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setStudentToDelete(student.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                لا يوجد تلاميذ في هذا القسم
              </div>
            )}
          </div>
        )}
        
        {/* Floating Add Button */}
        {selectedSectionId && (
          <Button
            variant="gradient"
            size="lg"
            className="fixed bottom-6 left-6 rounded-full shadow-lg w-14 h-14 p-0"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}
      </main>
      
      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-right">إضافة تلميذ جديد</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                رقم التعريف المدرسي *
              </Label>
              <Input
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="أدخل رقم التعريف الفريد"
                className="input-styled font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">الاسم *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="أدخل الاسم"
                className="input-styled"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-foreground">اللقب *</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="أدخل اللقب"
                className="input-styled"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-foreground">تاريخ الميلاد *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right",
                      !birthDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    {birthDate ? format(birthDate, 'dd/MM/yyyy') : 'اختر التاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    captionLayout="dropdown-buttons"
                    fromYear={2000}
                    toYear={2015}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              إلغاء
            </Button>
            <Button 
              variant="gradient" 
              onClick={handleAddStudent}
              disabled={createStudent.isPending || !firstName || !lastName || !birthDate || !studentCode}
            >
              {createStudent.isPending ? 'جاري الإضافة...' : 'إضافة تلميذ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف هذا التلميذ؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStudent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageLists;
