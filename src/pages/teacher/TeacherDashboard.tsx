import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Users, CheckCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import SignaturePad from '@/components/SignaturePad';
import { useStudents } from '@/hooks/useStudents';
import { useSections } from '@/hooks/useSections';
import { useSubmitAbsenceList } from '@/hooks/useAbsence';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [absentStudentIds, setAbsentStudentIds] = useState<string[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [teacherSectionIds, setTeacherSectionIds] = useState<string[]>([]);
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);

  const { data: allSections } = useSections();
  const { data: students, isLoading: studentsLoading } = useStudents(selectedSectionId);
  const submitAbsenceList = useSubmitAbsenceList();

  // Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user) {
        setIsLoadingTeacher(false);
        return;
      }

      try {
        // Get teacher by user_id
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('id, first_name, last_name, subject, signature_url, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teacherError) {
          console.error('Error fetching teacher:', teacherError);
          setIsLoadingTeacher(false);
          return;
        }

        if (teacher) {
          setTeacherData(teacher);
          setSavedSignature(teacher.signature_url);
          setSignatureDataUrl(teacher.signature_url);

          // Get teacher sections
          const { data: sections, error: sectionsError } = await supabase
            .from('teacher_sections')
            .select('section_id')
            .eq('teacher_id', teacher.id);

          if (!sectionsError && sections) {
            setTeacherSectionIds(sections.map((s: TeacherSection) => s.section_id));
          }
        }
      } catch (error) {
        console.error('Error in fetchTeacherData:', error);
      } finally {
        setIsLoadingTeacher(false);
      }
    };

    fetchTeacherData();
  }, [user]);

  // Filter sections that this teacher is assigned to
  const teacherSections = allSections?.filter(
    section => teacherSectionIds.includes(section.id)
  ) || [];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleAbsent = (studentId: string) => {
    setAbsentStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSignatureSave = async (dataUrl: string) => {
    if (!teacherData) return;
    
    try {
      // Convert base64 to blob
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `${teacherData.id}_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });
      
      if (uploadError) {
        console.error('Error uploading signature:', uploadError);
        // Use local data URL as fallback
        setSignatureDataUrl(dataUrl);
        setSavedSignature(dataUrl);
        toast({
          title: 'تنبيه',
          description: 'تم حفظ التوقيع محلياً',
        });
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      setSignatureDataUrl(publicUrl);
      setSavedSignature(publicUrl);
      
      // Update teacher's signature in database
      await supabase
        .from('teachers')
        .update({ signature_url: publicUrl })
        .eq('id', teacherData.id);
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ التوقيع بنجاح وسيتم استخدامه تلقائياً',
      });
    } catch (error) {
      console.error('Error saving signature:', error);
      // Use local data URL as fallback
      setSignatureDataUrl(dataUrl);
      setSavedSignature(dataUrl);
      toast({
        title: 'تنبيه',
        description: 'تم حفظ التوقيع محلياً',
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
          <h2 className="text-xl font-bold mb-2">لم يتم العثور على بيانات الأستاذ</h2>
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

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>

          <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 ml-2" />
              خروج
            </Button>
            <Avatar className="w-9 h-9 border-2 border-primary">
              <AvatarImage src={teacherData.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {teacherData.first_name[0]}
              </AvatarFallback>
            </Avatar>
          </div>
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
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">الأقسام التي أدرسها</h2>
          </div>

          {teacherSections.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لم يتم تعيين أقسام لك بعد</p>
              <p className="text-sm mt-2">سيتم تعيين الأقسام من قبل الإدارة</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {teacherSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    setAbsentStudentIds([]);
                  }}
                  className="glass-card p-5 text-right hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                      {section.full_name}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Student List Dialog */}
      <Dialog open={!!selectedSectionId} onOpenChange={() => setSelectedSectionId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setSelectedSectionId(null)}>
                <X className="w-5 h-5" />
              </Button>
              <span>
                قائمة تلاميذ {teacherSections.find(s => s.id === selectedSectionId)?.full_name}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4">
            {/* Students List */}
            {studentsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : students && students.length > 0 ? (
              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      absentStudentIds.includes(student.id)
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-secondary/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={absentStudentIds.includes(student.id)}
                        onCheckedChange={() => toggleAbsent(student.id)}
                        className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                      />
                      <span className="text-sm text-muted-foreground">غائب</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {student.last_name} {student.first_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                لا يوجد تلاميذ في هذا القسم
              </div>
            )}

            {/* Signature Section */}
            {students && students.length > 0 && (
              <div className="pt-4 border-t border-border">
                <SignaturePad 
                  onSave={handleSignatureSave}
                  savedSignature={savedSignature}
                  width={380}
                  height={150}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          {students && students.length > 0 && (
            <div className="pt-4 border-t border-border mt-4">
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