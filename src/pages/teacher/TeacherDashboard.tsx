import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Users, CheckCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import SignaturePad from '@/components/SignaturePad';
import { useStudents } from '@/hooks/useStudents';
import { useSections } from '@/hooks/useSections';
import { useSubmitAbsenceList } from '@/hooks/useAbsence';
import { supabase } from '@/integrations/supabase/client';

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

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
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
      // Reset signature for next submission - require fresh signature each time
      setSignatureDataUrl(null);
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
    // Reset signature for each new list
    setSignatureDataUrl(null);
  };

  const closeSectionDialog = () => {
    setSelectedSectionId(null);
    setAbsentStudentIds([]);
    setStudentNotes([]);
    setSignatureDataUrl(null);
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
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          {/* Left - Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
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

          {/* Right - Logout */}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 ml-2" />
            خروج
          </Button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="animate-slide-up border-b border-border bg-card/50">
          <div className="content-container py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">الوضع الليلي/النهاري</span>
              <ThemeToggle />
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

      {/* Main Content */}
      <main className="content-container py-8">
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">الأقسام التي أدرسها</h2>
              <p className="text-sm text-muted-foreground">المادة: {teacherData.subject}</p>
            </div>
          </div>

          {/* Sections Grid */}
          {teacherSections.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لم تحدد الإدارة أقسامك بعد</h3>
              <p className="text-muted-foreground">
                سيتم تعيين الأقسام من قبل الإدارة قريباً
              </p>
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
      </main>

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
            {/* Students List */}
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
                        <span className="font-medium text-foreground">
                          {student.last_name} {student.first_name}
                        </span>
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
