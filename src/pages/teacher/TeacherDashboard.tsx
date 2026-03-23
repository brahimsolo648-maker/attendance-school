import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, CheckCircle, Loader2, FileText, Home, Send, Settings, Undo2, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    refetchInterval: 30000, // Refresh every 30s
  });

  const teacherSections = allSections?.filter(
    section => teacherSectionIds.includes(section.id)
  ) || [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
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
        console.error('Error uploading signature:', uploadError);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء رفع التوقيع، يرجى المحاولة مرة أخرى',
          variant: 'destructive',
        });
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      setSignatureDataUrl(publicUrl);
      setSavedSignature(publicUrl);
      
      await supabase
        .from('teachers')
        .update({ signature_url: publicUrl })
        .eq('id', teacherData.id);
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ التوقيع بنجاح وسيتم استخدامه تلقائياً في المرات القادمة',
      });
    } catch (error) {
      console.error('Error saving signature:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ التوقيع',
        variant: 'destructive',
      });
    }
  };

  const submitAbsenceListHandler = async () => {
    if (!selectedSectionId || !teacherData) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار القسم أولاً',
        variant: 'destructive',
      });
      return;
    }
    
    if (!signatureDataUrl) {
      toast({
        title: 'خطأ',
        description: 'يرجى رسم التوقيع وحفظه أولاً',
        variant: 'destructive',
      });
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
      
      toast({
        title: 'تم الإرسال بنجاح',
        description: `تم إرسال قائمة غياب ${sectionName} (${absentStudentIds.length} غائب)`,
      });
      
      setSelectedSectionId(null);
      setAbsentStudentIds([]);
      setStudentNotes([]);
      setSignatureDataUrl(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-lists'] });
    } catch (error: any) {
      console.error('Error submitting absence list:', error);
      
      let errorMessage = 'حدث خطأ أثناء إرسال القائمة';
      if (error?.message?.includes('row-level security')) {
        errorMessage = 'ليس لديك صلاحية لإرسال القوائم. يرجى التواصل مع الإدارة.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'خطأ في الإرسال',
        description: errorMessage,
        variant: 'destructive',
      });
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
    const diffMs = now.getTime() - submitted.getTime();
    return diffMs <= 60 * 60 * 1000; // 60 minutes
  };

  const getTimeRemaining = (submittedAt: string) => {
    const submitted = new Date(submittedAt);
    const deadline = new Date(submitted.getTime() + 60 * 60 * 1000);
    const now = new Date();
    const remainMs = deadline.getTime() - now.getTime();
    if (remainMs <= 0) return null;
    const mins = Math.floor(remainMs / 60000);
    return `${mins} دقيقة`;
  };

  const handleRevokeStudent = async (absenceRecordId: string, listId: string) => {
    try {
      const { error } = await supabase
        .from('absence_records')
        .delete()
        .eq('id', absenceRecordId);
      
      if (error) throw error;
      
      toast({ title: 'تم التراجع', description: 'تم إلغاء غياب التلميذ بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-lists'] });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في إلغاء الغياب', variant: 'destructive' });
    }
  };

  const handleRevokeList = async (listId: string) => {
    try {
      // Delete all absence records for this list first
      const { error: recordsError } = await supabase
        .from('absence_records')
        .delete()
        .eq('absence_list_id', listId);
      
      if (recordsError) throw recordsError;

      // Then delete the list itself
      const { error: listError } = await supabase
        .from('absence_lists')
        .delete()
        .eq('id', listId);
      
      if (listError) throw listError;
      
      toast({ title: 'تم التراجع', description: 'تم إلغاء القائمة بالكامل' });
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-lists'] });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في إلغاء القائمة', variant: 'destructive' });
    }
  };

  if (isLoadingTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!teacherData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 text-center max-w-md">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2 text-foreground">لم يتم العثور على بيانات الأستاذ</h2>
          <p className="text-muted-foreground mb-4">
            يبدو أن حسابك غير مرتبط بملف أستاذ. يرجى التواصل مع الإدارة.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const selectedSection = teacherSections.find(s => s.id === selectedSectionId);

  return (
    <div className="page-container min-h-screen pb-20">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          {/* Left - Logout */}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 ml-2" />
            خروج
          </Button>

          {/* Center - Teacher name with avatar */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">
              الأستاذ {teacherData.last_name} {teacherData.first_name}
            </h1>
            <Avatar className="w-9 h-9 border-2 border-primary">
              <AvatarImage src={teacherData.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {teacherData.first_name[0]}{teacherData.last_name[0]}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Tab Content */}
      <main className="content-container py-6">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">الأقسام التي أدرسها</h2>
                <p className="text-sm text-muted-foreground">المادة: {teacherData.subject}</p>
              </div>
            </div>

            {teacherSections.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لم تحدد الإدارة أقسامك بعد</h3>
                <p className="text-muted-foreground">سيتم تعيين الأقسام من قبل الإدارة قريباً</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {teacherSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => openSectionDialog(section.id)}
                    className="glass-card p-5 text-right hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 mr-4">
                        <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors block">
                          {section.full_name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          السنة: {section.year}
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
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">القوائم المرسلة اليوم</h2>
                <p className="text-sm text-muted-foreground">يمكنك التراجع خلال 60 دقيقة من الإرسال</p>
              </div>
            </div>

            {loadingSentLists ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sentLists.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد قوائم مرسلة اليوم</h3>
                <p className="text-muted-foreground">القوائم المرسلة ستظهر هنا حتى منتصف الليل</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentLists.map((list: any) => {
                  const canRevoke = isWithin60Min(list.submitted_at);
                  const remaining = getTimeRemaining(list.submitted_at);
                  const absentStudents = list.absence_records || [];

                  return (
                    <div key={list.id} className="glass-card p-4 space-y-3">
                      {/* List Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {canRevoke ? (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 dark:text-amber-400">
                              <Clock className="w-3 h-3 ml-1" />
                              متبقي {remaining}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              للقراءة فقط
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {(list as any).sections?.full_name || 'قسم'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(list.submitted_at), 'HH:mm', { locale: ar })} - {list.subject}
                          </p>
                        </div>
                      </div>

                      {/* Absent Students */}
                      {absentStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">لا يوجد غائبون (قائمة حضور كامل)</p>
                      ) : (
                        <div className="space-y-2">
                          {absentStudents.map((record: any) => (
                            <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                              <div>
                                {canRevoke && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive h-7 px-2"
                                    onClick={() => handleRevokeStudent(record.id, list.id)}
                                  >
                                    <Undo2 className="w-3.5 h-3.5 ml-1" />
                                    تراجع
                                  </Button>
                                )}
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                {record.students?.last_name} {record.students?.first_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Revoke entire list */}
                      {canRevoke && absentStudents.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevokeList(list.id)}
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          إلغاء القائمة بالكامل
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
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Settings className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
              </div>
            </div>

            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <span className="text-sm font-medium text-foreground">الوضع الليلي/النهاري</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/teacher/settings')}
              >
                تغيير معلومات الحساب
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">الإعدادات</span>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors relative ${
              activeTab === 'sent' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Send className="w-5 h-5" />
            <span className="text-[10px] font-medium">القوائم المرسلة</span>
            {sentLists.length > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
                {sentLists.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">الرئيسية</span>
          </button>
        </div>
      </nav>

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
                      className={`rounded-xl border transition-all ${
                        isAbsent
                          ? 'bg-destructive/10 border-destructive/30'
                          : 'bg-secondary/30 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isAbsent}
                            onCheckedChange={() => toggleAbsent(student.id)}
                            className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                          />
                          <span className="text-sm text-muted-foreground">غائب</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Gate status badge */}
                          {gateStatus === 'tardy' && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                              <Clock className="w-3 h-3 ml-0.5" />
                              متأخر
                            </Badge>
                          )}
                          {gateStatus === 'absent' && (
                            <Badge variant="destructive" className="text-[10px]">
                              غائب (بوابة)
                            </Badge>
                          )}
                          <span className="font-medium text-foreground">
                            {student.last_name} {student.first_name}
                          </span>
                        </div>
                      </div>
                      
                      {isAbsent && (
                        <div className="px-4 pb-4">
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

            {/* Signature Section */}
            {students && students.length > 0 && (
              <div className="pt-4 border-t border-border">
                <SignaturePad 
                  onSave={handleSignatureSave}
                  savedSignature={savedSignature}
                  width={400}
                  height={200}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          {students && students.length > 0 && (
            <div className="pt-4 border-t border-border">
              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={submitAbsenceListHandler}
                disabled={isSubmitting || !signatureDataUrl}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 ml-2" />
                    إرسال قائمة الغياب ({absentStudentIds.length} غائب)
                  </>
                )}
              </Button>
              {!signatureDataUrl && (
                <p className="text-xs text-destructive text-center mt-2">
                  يرجى رسم التوقيع وحفظه أولاً
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;
