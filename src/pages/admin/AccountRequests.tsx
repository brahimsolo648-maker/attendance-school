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
  'الرياضيات',
  'الفيزياء',
  'العلوم الطبيعية',
  'اللغة العربية',
  'اللغة الفرنسية',
  'اللغة الإنجليزية',
  'التاريخ والجغرافيا',
  'الفلسفة',
  'العلوم الإسلامية',
  'الإعلام الآلي',
  'التربية البدنية',
];

const AccountRequests = () => {
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
  
  // Subject & Sections Assignment Modal
  const [assigningTeacher, setAssigningTeacher] = useState<TeacherWithSections | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Group sections by year
  const sectionsByYear = sections.reduce((acc, section) => {
    if (!acc[section.year]) {
      acc[section.year] = [];
    }
    acc[section.year].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);
  
  const handleApprove = async (teacherId: string) => {
    try {
      await approveTeacher.mutateAsync(teacherId);
      toast({
        title: 'تم بنجاح',
        description: 'تمت الموافقة على الحساب وتفعيله',
      });
    } catch (error: any) {
      console.error('Approve error:', error);
      toast({
        title: 'خطأ في الموافقة',
        description: error?.message || 'حدث خطأ أثناء الموافقة على الحساب',
        variant: 'destructive',
      });
    }
  };
  
  const handleReject = async () => {
    if (!teacherToReject) return;
    
    try {
      await rejectTeacher.mutateAsync(teacherToReject);
      toast({
        title: 'تم بنجاح',
        description: 'تم رفض الحساب وحذفه نهائياً',
      });
      setTeacherToReject(null);
    } catch (error: any) {
      console.error('Reject error:', error);
      toast({
        title: 'خطأ في الرفض',
        description: error?.message || 'حدث خطأ أثناء رفض الحساب',
        variant: 'destructive',
      });
      setTeacherToReject(null);
    }
  };
  
  const handleDelete = async () => {
    if (!teacherToDelete) return;
    
    try {
      await deleteTeacher.mutateAsync(teacherToDelete);
      toast({
        title: 'تم بنجاح',
        description: 'تم حذف حساب الأستاذ نهائياً',
      });
      setTeacherToDelete(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'خطأ في الحذف',
        description: error?.message || 'حدث خطأ أثناء حذف الحساب',
        variant: 'destructive',
      });
      setTeacherToDelete(null);
    }
  };
  
  const openAssignModal = (teacher: TeacherWithSections) => {
    setAssigningTeacher(teacher);
    setSelectedSubject(teacher.subject || '');
    setSelectedSectionIds(teacher.teacher_sections?.map(ts => ts.section_id) || []);
  };
  
  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };
  
  const handleAssignSubjectAndSections = async () => {
    if (!assigningTeacher) return;
    
    if (!selectedSubject) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المادة',
        variant: 'destructive'
      });
      return;
    }
    
    setIsAssigning(true);
    
    try {
      // Update teacher's subject
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({ subject: selectedSubject })
        .eq('id', assigningTeacher.id);
      
      if (teacherError) throw teacherError;
      
      // Delete existing sections for this teacher
      const { error: deleteError } = await supabase
        .from('teacher_sections')
        .delete()
        .eq('teacher_id', assigningTeacher.id);
      
      if (deleteError) throw deleteError;
      
      // Insert new sections
      if (selectedSectionIds.length > 0) {
        const teacherSections = selectedSectionIds.map(sectionId => ({
          teacher_id: assigningTeacher.id,
          section_id: sectionId,
        }));
        
        const { error: insertError } = await supabase
          .from('teacher_sections')
          .insert(teacherSections);
        
        if (insertError) throw insertError;
      }
      
      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث المادة والأقسام بنجاح',
      });
      
      setAssigningTeacher(null);
      refetchApproved();
      
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast({
        title: 'خطأ في الحفظ',
        description: error?.message || 'حدث خطأ أثناء حفظ البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
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
          <h1 className="text-lg font-bold text-foreground">طلبات الموافقة</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pending" className="relative">
              الحسابات المعلقة
              {pendingTeachers && pendingTeachers.length > 0 && (
                <Badge className="absolute -top-2 -left-2 bg-destructive text-xs">
                  {pendingTeachers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">الأساتذة المفعلين</TabsTrigger>
          </TabsList>
          
          {/* Pending Tab */}
          <TabsContent value="pending">
            <div className="glass-card overflow-hidden p-0">
              {pendingLoading ? (
                <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
              ) : pendingTeachers && pendingTeachers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم الكامل</TableHead>
                        <TableHead className="text-right">البريد</TableHead>
                        <TableHead className="text-right">تاريخ الطلب</TableHead>
                        <TableHead className="text-right w-32">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTeachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell className="font-medium">
                            {teacher.last_name} {teacher.first_name}
                          </TableCell>
                          <TableCell>{teacher.email}</TableCell>
                          <TableCell>
                            {format(new Date(teacher.created_at), 'PPP', { locale: ar })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-success hover:text-success hover:bg-success/10"
                                onClick={() => handleApprove(teacher.id)}
                                disabled={approveTeacher.isPending}
                              >
                                <Check className="w-5 h-5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setTeacherToReject(teacher.id)}
                              >
                                <X className="w-5 h-5" />
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
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد طلبات معلقة</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Approved Tab */}
          <TabsContent value="approved">
            <div className="glass-card overflow-hidden p-0">
              {approvedLoading ? (
                <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
              ) : approvedTeachers && approvedTeachers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم الكامل</TableHead>
                        <TableHead className="text-right">البريد</TableHead>
                        <TableHead className="text-right">المادة</TableHead>
                        <TableHead className="text-right">الأقسام</TableHead>
                        <TableHead className="text-right">تاريخ الموافقة</TableHead>
                        <TableHead className="text-right w-28">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedTeachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell className="font-medium">
                            {teacher.last_name} {teacher.first_name}
                          </TableCell>
                          <TableCell>{teacher.email}</TableCell>
                          <TableCell>
                            {teacher.subject === 'غير محدد' ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-400">
                                غير محدد
                              </Badge>
                            ) : (
                              teacher.subject
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {teacher.teacher_sections?.length > 0 ? (
                                <>
                                  {teacher.teacher_sections.slice(0, 2).map((ts: any) => (
                                    <Badge key={ts.section_id} variant="secondary" className="text-xs">
                                      {ts.sections?.full_name}
                                    </Badge>
                                  ))}
                                  {teacher.teacher_sections.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{teacher.teacher_sections.length - 2}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                                  لم تحدد بعد
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {teacher.approved_at 
                              ? format(new Date(teacher.approved_at), 'PPP', { locale: ar })
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => openAssignModal(teacher)}
                                title="تحديد المادة والأقسام"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setTeacherToDelete(teacher.id)}
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
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا يوجد أساتذة مفعلين</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Assign Subject & Sections Modal */}
      <Dialog open={!!assigningTeacher} onOpenChange={() => setAssigningTeacher(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              تحديد المادة والأقسام
            </DialogTitle>
          </DialogHeader>
          
          {assigningTeacher && (
            <div className="space-y-5">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="font-medium text-foreground">
                  {assigningTeacher.last_name} {assigningTeacher.first_name}
                </p>
                <p className="text-sm text-muted-foreground">{assigningTeacher.email}</p>
              </div>
              
              {/* Subject Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  المادة
                </label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="input-styled">
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {SUBJECTS.map((subj) => (
                      <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sections Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  الأقسام
                </label>
                <div className="space-y-4 max-h-48 overflow-y-auto p-3 bg-secondary/30 rounded-xl">
                  {Object.entries(sectionsByYear).map(([year, yearSections]) => (
                    <div key={year} className="space-y-2">
                      <p className="text-sm font-semibold text-primary">{year}</p>
                      <div className="flex flex-wrap gap-2">
                        {yearSections?.map((section) => (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => toggleSection(section.id)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                              selectedSectionIds.includes(section.id)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border text-foreground hover:border-primary'
                            }`}
                          >
                            {section.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSectionIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    تم اختيار {selectedSectionIds.length} قسم
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setAssigningTeacher(null)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleAssignSubjectAndSections}
              disabled={isAssigning}
            >
              {isAssigning ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
              ) : (
                'حفظ التحديثات'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!teacherToReject} onOpenChange={() => setTeacherToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الرفض</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل تريد رفض وحذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              نعم، ارفض واحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!teacherToDelete} onOpenChange={() => setTeacherToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
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

export default AccountRequests;
