import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, Loader2, FileText, Home, Send, Settings, Undo2, Clock, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import SignaturePad from '@/components/SignaturePad';
import { useStudents } from '@/hooks/useStudents';
import { useSections } from '@/hooks/useSections';
import { useSubmitAbsenceList } from '@/hooks/useAbsence';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TeacherData {
  id: string;
  first_name: string;
  last_name: string;
  subject: string;
  signature_url: string | null;
  avatar_url: string | null;
}

interface TeacherSection {
  section_id: string;
}

interface StudentNote {
  studentId: string;
  note: string;
}

type TabType = 'home' | 'sent' | 'settings';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [absentStudentIds, setAbsentStudentIds] = useState<string[]>([]);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [teacherSectionIds, setTeacherSectionIds] = useState<string[]>([]);
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: allSections } = useSections();
  const { data: students, isLoading: studentsLoading } = useStudents(selectedSectionId);
  const submitAbsenceList = useSubmitAbsenceList();

  // Check auth and fetch teacher data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          navigate('/teacher/auth', { replace: true });
          return;
        }

        setAuthUserId(session.user.id);

        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('id, first_name, last_name, subject, signature_url, avatar_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (teacherError) {
          console.error('Error fetching teacher:', teacherError);
          setIsLoadingTeacher(false);
          return;
        }

        if (teacher) {
          setTeacherData(teacher);
          setSavedSignature(teacher.signature_url);

          const { data: sections, error: sectionsError } = await supabase
            .from('teacher_sections')
            .select('section_id')
            .eq('teacher_id', teacher.id);

          if (!sectionsError && sections) {
            setTeacherSectionIds(sections.map((s: TeacherSection) => s.section_id));
          }
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setIsLoadingTeacher(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Fetch sent lists for today
  const { data: sentLists = [], isLoading: loadingSentLists } = useQuery({
    queryKey: ['teacher-sent-lists', teacherData?.id],
    queryFn: async () => {
      if (!teacherData?.id) return [];
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('absence_lists')
        .select(`
          id, submitted_at, subject, section_id,
          sections(full_name),
          absence_records(id, student_id, students(id, first_name, last_name))
        `)
        .eq('teacher_id', teacherData.id)
        .gte('submitted_at', todayStart.toISOString())
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherData?.id,
    refetchInterval: 30000,
  });

  // Fetch gate statuses for selected section students
  const today = new Date().toISOString().split('T')[0];
  const { data: gateStatuses = [] } = useQuery({
    queryKey: ['gate-statuses', selectedSectionId, today],
    queryFn: async () => {
      if (!selectedSectionId) return [];
      const { data, error } = await supabase
        .from('daily_student_status')
        .select('student_id, gate_status')
        .eq('date', today)
        .in('gate_status', ['tardy', 'absent']);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSectionId,
  });

  const teacherSections = allSections?.filter(
    section => teacherSectionIds.includes(section.id)
  ) || [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/teacher/auth', { replace: true });
  };

  const toggleAbsent = (studentId: string) => {
    setAbsentStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const updateStudentNote = (studentId: string, note: string) => {
    setStudentNotes(prev => {
      const existing = prev.find(n => n.studentId === studentId);
      if (existing) {
        return prev.map(n => n.studentId === studentId ? { ...n, note } : n);
      }
      return [...prev, { studentId, note }];
    });
  };

  const getStudentNote = (studentId: string) => {
    return studentNotes.find(n => n.studentId === studentId)?.note || '';
  };

  const handleSignatureSave = async (dataUrl: string) => {
    if (!teacherData || !authUserId) return;
    
    try {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `teacher_${teacherData.id}_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });
      
      if (uploadError) {
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء رفع التوقيع', variant: 'destructive' });
        return;
      }
      
      const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      setSignatureDataUrl(publicUrl);
      setSavedSignature(publicUrl);
      
      await supabase.from('teachers').update({ signature_url: publicUrl }).eq('id', teacherData.id);
      
      toast({ title: 'تم الحفظ', description: 'تم حفظ التوقيع بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ التوقيع', variant: 'destructive' });
    }
  };

  const submitAbsenceListHandler = async () => {
    if (!selectedSectionId || !teacherData) {
      toast({ title: 'خطأ', description: 'يرجى اختيار القسم أولاً', variant: 'destructive' });
      return;
    }
    if (!signatureDataUrl) {
      toast({ title: 'خطأ', description: 'يرجى رسم التوقيع وحفظه أولاً', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAbsenceList.mutateAsync({
        teacherId: teacherData.id,
        sectionId: selectedSectionId,
        subject: teacherData.subject,
        signatureUrl: signatureDataUrl,
        absentStudentIds,
      });
      
      const sectionName = teacherSections.find(s => s.id === selectedSectionId)?.full_name || '';
      toast({ title: 'تم الإرسال بنجاح', description: `تم إرسال قائمة غياب ${sectionName} (${absentStudentIds.length} غائب)` });
      
      setSelectedSectionId(null);
      setAbsentStudentIds([]);
      setStudentNotes([]);
      setSignatureDataUrl(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-lists'] });
    } catch (error: any) {
      let errorMessage = 'حدث خطأ أثناء إرسال القائمة';
      if (error?.message?.includes('row-level security')) {
        errorMessage = 'ليس لديك صلاحية لإرسال القوائم. يرجى التواصل مع الإدارة.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({ title: 'خطأ في الإرسال', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSectionDialog = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setAbsentStudentIds([]);
    setStudentNotes([]);
    setSignatureDataUrl(null);
  };

  const closeSectionDialog = () => {
    setSelectedSectionId(null);
    setAbsentStudentIds([]);
    setStudentNotes([]);
    setSignatureDataUrl(null);
  };

  // Revoke helpers
  const isWithin60Min = (submittedAt: string) => {
    const submitted = new Date(submittedAt);
    const now = new Date();
    return now.getTime() - submitted.getTime() <= 60 * 60 * 1000;
  };

  const getTimeRemaining = (submittedAt: string) => {
    const submitted = new Date(submittedAt);
    const deadline = new Date(submitted.getTime() + 60 * 60 * 1000);
    const remainMs = deadline.getTime() - new Date().getTime();
    if (remainMs <= 0) return null;
    return `${Math.floor(remainMs / 60000)} دقيقة`;
  };

  const handleRevokeStudent = async (absenceRecordId: string, listId: string) => {
    try {
      const { error } = await supabase.from('absence_records').delete().eq('id', absenceRecordId);
      if (error) throw error;
      toast({ title: 'تم التراجع', description: 'تم إلغاء غياب التلميذ بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-lists'] });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إلغاء الغياب', variant: 'destructive' });
    }
  };

  const handleRevokeList = async (listId: string) => {
    try {
      const { error: recordsError } = await supabase.from('absence_records').delete().eq('absence_list_id', listId);
      if (recordsError) throw recordsError;
      const { error: listError } = await supabase.from('absence_lists').delete().eq('id', listId);
      if (listError) throw listError;
      toast({ title: 'تم التراجع', description: 'تم إلغاء القائمة بالكامل' });
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-lists'] });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إلغاء القائمة', variant: 'destructive' });
    }
  };

  if (isLoadingTeacher) {
    return null; // No loading screen
  }

  if (!teacherData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2 text-foreground">لم يتم العثور على بيانات الأستاذ</h2>
          <p className="text-muted-foreground mb-4">يبدو أن حسابك غير مرتبط بملف أستاذ.</p>
          <Button variant="outline" onClick={() => navigate('/')}>العودة للصفحة الرئيسية</Button>
        </div>
      </div>
    );
  }

  const selectedSection = teacherSections.find(s => s.id === selectedSectionId);

  return (
    <div className="page-container min-h-screen pb-20">
      {/* Floating Profile Picture - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <Avatar className="w-10 h-10 border-2 border-primary shadow-lg">
          <AvatarImage src={teacherData.avatar_url || ''} className="object-cover" />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
            {teacherData.first_name[0]}{teacherData.last_name[0]}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Tab Content */}
      <main className="content-container pt-16 pb-6">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">أقسامي</h2>
                <p className="text-xs text-muted-foreground">المادة: {teacherData.subject}</p>
              </div>
            </div>

            {teacherSections.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-base font-semibold text-foreground mb-2">لم تحدد الإدارة أقسامك بعد</h3>
                <p className="text-sm text-muted-foreground">سيتم تعيين الأقسام من قبل الإدارة قريباً</p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2">
                {teacherSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => openSectionDialog(section.id)}
                    className="glass-card p-4 text-right hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors block truncate">
                          {section.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {section.year}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SENT LISTS TAB */}
        {activeTab === 'sent' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">القوائم المرسلة اليوم</h2>
                <p className="text-xs text-muted-foreground">يمكنك التراجع خلال 60 دقيقة</p>
              </div>
            </div>

            {loadingSentLists ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sentLists.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Send className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-base font-semibold text-foreground mb-2">لا توجد قوائم مرسلة اليوم</h3>
              </div>
            ) : (
              <div className="space-y-3">
                {sentLists.map((list: any) => {
                  const canRevoke = isWithin60Min(list.submitted_at);
                  const remaining = getTimeRemaining(list.submitted_at);
                  const absentStudents = list.absence_records || [];

                  return (
                    <div key={list.id} className="glass-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {canRevoke ? (
                            <Badge variant="outline" className="text-[10px] border-warning text-warning">
                              <Clock className="w-3 h-3 ml-1" />
                              {remaining}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">للقراءة فقط</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-foreground">{(list as any).sections?.full_name || 'قسم'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(list.submitted_at), 'HH:mm', { locale: ar })} - {list.subject}
                          </p>
                        </div>
                      </div>

                      {absentStudents.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">حضور كامل</p>
                      ) : (
                        <div className="space-y-1.5">
                          {absentStudents.map((record: any) => (
                            <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                              <div>
                                {canRevoke && (
                                  <Button variant="ghost" size="sm" className="text-destructive h-7 px-2 text-xs" onClick={() => handleRevokeStudent(record.id, list.id)}>
                                    <Undo2 className="w-3 h-3 ml-1" />تراجع
                                  </Button>
                                )}
                              </div>
                              <span className="text-xs font-medium text-foreground">{record.students?.last_name} {record.students?.first_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {canRevoke && absentStudents.length > 0 && (
                        <Button variant="outline" size="sm" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 text-xs" onClick={() => handleRevokeList(list.id)}>
                          <Trash2 className="w-3.5 h-3.5 ml-2" />إلغاء القائمة بالكامل
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                <Settings className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-lg font-bold text-foreground">الإعدادات</h2>
            </div>

            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <span className="text-sm font-medium text-foreground">الوضع الليلي/النهاري</span>
              </div>
              
              <Button variant="outline" className="w-full" onClick={() => navigate('/teacher/settings')}>
                تغيير معلومات الحساب
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar - Home on far right */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">الإعدادات</span>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors relative ${activeTab === 'sent' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Send className="w-5 h-5" />
            <span className="text-[10px] font-medium">المرسلة</span>
            {sentLists.length > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
                {sentLists.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">الرئيسية</span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من رغبتك في تسجيل الخروج؟ ستحتاج لإعادة تسجيل الدخول للوصول لحسابك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Absence List Dialog */}
      <Dialog open={!!selectedSectionId} onOpenChange={closeSectionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-card">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="text-right flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <span>قائمة قسم {selectedSection?.full_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {studentsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : students && students.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    الغائبون: {absentStudentIds.length} من {students.length}
                  </span>
                  <span className="text-sm text-muted-foreground">اسم التلميذ</span>
                </div>
                
                {students.map((student) => {
                  const isAbsent = absentStudentIds.includes(student.id);
                  const gateInfo = gateStatuses.find(g => g.student_id === student.id);
                  const gateStatus = gateInfo?.gate_status;
                  
                  return (
                    <div
                      key={student.id}
                      className={`rounded-xl border transition-all ${isAbsent ? 'bg-destructive/10 border-destructive/30' : 'bg-secondary/30 border-border'}`}
                    >
                      <div className="flex items-center justify-between p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isAbsent}
                            onCheckedChange={() => toggleAbsent(student.id)}
                            className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                          />
                          <span className="text-sm text-muted-foreground">غائب</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {gateStatus === 'tardy' && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px]">
                              <Clock className="w-3 h-3 ml-0.5" />متأخر
                            </Badge>
                          )}
                          {gateStatus === 'absent' && (
                            <Badge variant="destructive" className="text-[10px]">غائب (بوابة)</Badge>
                          )}
                          <span className="font-medium text-foreground text-sm">{student.last_name} {student.first_name}</span>
                        </div>
                      </div>
                      
                      {isAbsent && (
                        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                          <Textarea
                            placeholder="ملاحظات (اختياري)"
                            value={getStudentNote(student.id)}
                            onChange={(e) => updateStudentNote(student.id, e.target.value)}
                            className="text-sm h-16 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">لا يوجد تلاميذ في هذا القسم</p>
              </div>
            )}

            {students && students.length > 0 && (
              <div className="pt-4 border-t border-border">
                <SignaturePad onSave={handleSignatureSave} savedSignature={savedSignature} width={400} height={200} />
              </div>
            )}
          </div>

          {students && students.length > 0 && (
            <div className="pt-4 border-t border-border">
              <Button variant="gradient" size="lg" className="w-full" onClick={submitAbsenceListHandler} disabled={isSubmitting || !signatureDataUrl}>
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري الإرسال...</>
                ) : (
                  <><CheckCircle className="w-5 h-5 ml-2" />إرسال قائمة الغياب ({absentStudentIds.length} غائب)</>
                )}
              </Button>
              {!signatureDataUrl && <p className="text-xs text-destructive text-center mt-2">يرجى رسم التوقيع وحفظه أولاً</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;
