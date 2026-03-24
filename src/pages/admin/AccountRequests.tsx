import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X, User, Mail, BookOpen, Calendar, Trash2, Edit, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTeachers, useApproveTeacher, useRejectTeacher, useDeleteTeacher, TeacherWithSections } from '@/hooks/useTeachers';
import { useSections } from '@/hooks/useSections';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const SUBJECTS = [
  'الرياضيات', 'الفيزياء', 'العلوم الطبيعية', 'اللغة العربية', 'اللغة الفرنسية',
  'اللغة الإنجليزية', 'التاريخ والجغرافيا', 'الفلسفة', 'العلوم الإسلامية', 'الإعلام الآلي', 'التربية البدنية',
];

interface AccountRequestsProps {
  embedded?: boolean;
}

const AccountRequests = ({ embedded = false }: AccountRequestsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: pendingTeachers, isLoading: pendingLoading } = useTeachers('pending');
  const { data: approvedTeachers, isLoading: approvedLoading, refetch: refetchApproved } = useTeachers('approved');
  const { data: sections = [] } = useSections();
  
  const approveTeacher = useApproveTeacher();
  const rejectTeacher = useRejectTeacher();
  const deleteTeacher = useDeleteTeacher();
  
  const [teacherToReject, setTeacherToReject] = useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [assigningTeacher, setAssigningTeacher] = useState<TeacherWithSections | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const sectionsByYear = sections.reduce((acc, section) => {
    if (!acc[section.year]) acc[section.year] = [];
    acc[section.year].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);
  
  const handleApprove = async (teacherId: string) => {
    try {
      await approveTeacher.mutateAsync(teacherId);
      toast({ title: 'تم بنجاح', description: 'تمت الموافقة على الحساب' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ', variant: 'destructive' });
    }
  };
  
  const handleReject = async () => {
    if (!teacherToReject) return;
    try {
      await rejectTeacher.mutateAsync(teacherToReject);
      toast({ title: 'تم بنجاح', description: 'تم رفض الحساب' });
      setTeacherToReject(null);
    } catch (error: any) {
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ', variant: 'destructive' });
      setTeacherToReject(null);
    }
  };
  
  const handleDelete = async () => {
    if (!teacherToDelete) return;
    try {
      await deleteTeacher.mutateAsync(teacherToDelete);
      toast({ title: 'تم بنجاح', description: 'تم حذف الحساب' });
      setTeacherToDelete(null);
    } catch (error: any) {
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ', variant: 'destructive' });
      setTeacherToDelete(null);
    }
  };
  
  const openAssignModal = (teacher: TeacherWithSections) => {
    setAssigningTeacher(teacher);
    setSelectedSubject(teacher.subject || '');
    setSelectedSectionIds(teacher.teacher_sections?.map(ts => ts.section_id) || []);
  };
  
  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev => prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]);
  };
  
  const handleAssignSubjectAndSections = async () => {
    if (!assigningTeacher || !selectedSubject) {
      toast({ title: 'خطأ', description: 'يرجى اختيار المادة', variant: 'destructive' });
      return;
    }
    setIsAssigning(true);
    try {
      await supabase.from('teachers').update({ subject: selectedSubject }).eq('id', assigningTeacher.id);
      await supabase.from('teacher_sections').delete().eq('teacher_id', assigningTeacher.id);
      if (selectedSectionIds.length > 0) {
        await supabase.from('teacher_sections').insert(selectedSectionIds.map(sectionId => ({ teacher_id: assigningTeacher.id, section_id: sectionId })));
      }
      toast({ title: 'تم الحفظ', description: 'تم تحديث المادة والأقسام' });
      setAssigningTeacher(null);
      refetchApproved();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setIsAssigning(false);
    }
  };

  const mainContent = (
    <>
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="pending" className="relative text-sm">
            المعلقة
            {pendingTeachers && pendingTeachers.length > 0 && (
              <Badge className="absolute -top-2 -left-2 bg-destructive text-[10px] h-4 w-4 p-0 flex items-center justify-center">{pendingTeachers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-sm">المفعلين</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <div className="glass-card overflow-hidden p-0">
            {pendingLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">جاري التحميل...</div>
            ) : pendingTeachers && pendingTeachers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xs">الاسم</TableHead>
                      <TableHead className="text-right text-xs">البريد</TableHead>
                      <TableHead className="text-right text-xs hidden sm:table-cell">التاريخ</TableHead>
                      <TableHead className="text-right text-xs w-24">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium text-sm">{teacher.last_name} {teacher.first_name}</TableCell>
                        <TableCell className="text-xs">{teacher.email}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell">{format(new Date(teacher.created_at), 'PP', { locale: ar })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-success hover:bg-success/10 h-7 w-7" onClick={() => handleApprove(teacher.id)} disabled={approveTeacher.isPending}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => setTeacherToReject(teacher.id)}>
                              <X className="w-4 h-4" />
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
                <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد طلبات معلقة</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="approved">
          <div className="glass-card overflow-hidden p-0">
            {approvedLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">جاري التحميل...</div>
            ) : approvedTeachers && approvedTeachers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xs">الاسم</TableHead>
                      <TableHead className="text-right text-xs hidden sm:table-cell">البريد</TableHead>
                      <TableHead className="text-right text-xs">المادة</TableHead>
                      <TableHead className="text-right text-xs hidden md:table-cell">الأقسام</TableHead>
                      <TableHead className="text-right text-xs w-20">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium text-sm">{teacher.last_name} {teacher.first_name}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell">{teacher.email}</TableCell>
                        <TableCell className="text-xs">
                          {teacher.subject === 'غير محدد' ? <Badge variant="outline" className="text-[10px] text-warning border-warning">غير محدد</Badge> : teacher.subject}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {teacher.teacher_sections?.length > 0 ? (
                              <>
                                {teacher.teacher_sections.slice(0, 2).map((ts: any) => (
                                  <Badge key={ts.section_id} variant="secondary" className="text-[10px]">{ts.sections?.full_name}</Badge>
                                ))}
                                {teacher.teacher_sections.length > 2 && <Badge variant="outline" className="text-[10px]">+{teacher.teacher_sections.length - 2}</Badge>}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-warning border-warning">لم تحدد</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 h-7 w-7" onClick={() => openAssignModal(teacher)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => setTeacherToDelete(teacher.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا يوجد أساتذة مفعلين</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Confirmation */}
      <AlertDialog open={!!teacherToReject} onOpenChange={() => setTeacherToReject(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الرفض</AlertDialogTitle>
            <AlertDialogDescription className="text-right">هل أنت متأكد من رفض هذا الحساب؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground">رفض</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!teacherToDelete} onOpenChange={() => setTeacherToDelete(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">هل أنت متأكد من حذف هذا الحساب نهائياً؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Modal */}
      <Dialog open={!!assigningTeacher} onOpenChange={() => setAssigningTeacher(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />تحديد المادة والأقسام
            </DialogTitle>
          </DialogHeader>
          {assigningTeacher && (
            <div className="space-y-4">
              <div className="p-2 bg-secondary/50 rounded-lg">
                <p className="font-medium text-sm text-foreground">{assigningTeacher.last_name} {assigningTeacher.first_name}</p>
                <p className="text-xs text-muted-foreground">{assigningTeacher.email}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-primary" />المادة</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="input-styled h-9 text-sm"><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {SUBJECTS.map((subj) => (<SelectItem key={subj} value={subj}>{subj}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" />الأقسام</label>
                <div className="max-h-48 overflow-y-auto space-y-3 border border-border rounded-lg p-3">
                  {Object.entries(sectionsByYear).map(([year, yearSections]) => (
                    <div key={year}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{year}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {yearSections.map((section) => (
                          <button key={section.id} onClick={() => toggleSection(section.id)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${selectedSectionIds.includes(section.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50'}`}>
                            {section.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSectionIds.length > 0 && (
                  <p className="text-[10px] text-primary font-medium">{selectedSectionIds.length} قسم محدد</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssigningTeacher(null)}>إلغاء</Button>
            <Button size="sm" onClick={handleAssignSubjectAndSections} disabled={isAssigning || !selectedSubject}>
              {isAssigning ? <><Loader2 className="w-3.5 h-3.5 ml-2 animate-spin" />جاري الحفظ...</> : <><Check className="w-3.5 h-3.5 ml-2" />حفظ</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return <div className="content-container py-4">{mainContent}</div>;
  }

  return (
    <div className="page-container min-h-screen">
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-4 h-4 ml-1" />العودة
          </Button>
          <h1 className="text-base font-bold text-foreground">طلبات الموافقة</h1>
          <div className="w-16" />
        </div>
      </header>
      <main className="content-container py-6">{mainContent}</main>
    </div>
  );
};

export default AccountRequests;
