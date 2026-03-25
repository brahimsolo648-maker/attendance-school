import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, Loader2, FileText, Home, Send, Settings, Undo2, Clock, Trash2, LogOut, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import { useSections } from '@/hooks/useSections';
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

type TabType = 'home' | 'sent' | 'settings';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [teacherSectionIds, setTeacherSectionIds] = useState<string[]>([]);
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: allSections } = useSections();

  // Check auth and fetch teacher data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          navigate('/teacher/auth', { replace: true });
          return;
        }

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

  const teacherSections = allSections?.filter(
    section => teacherSectionIds.includes(section.id)
  ) || [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/teacher/auth', { replace: true });
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

  const handleRevokeStudent = async (absenceRecordId: string) => {
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
    return null;
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

  return (
    <div className="page-container min-h-screen pb-24">
      {/* Floating Profile Picture - Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <Avatar className="w-14 h-14 border-[3px] border-primary shadow-lg ring-2 ring-primary/20">
          <AvatarImage src={teacherData.avatar_url || ''} className="object-cover" />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
            {teacherData.first_name[0]}{teacherData.last_name[0]}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Tab Content */}
      <main className="content-container pt-20 pb-6">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Header */}
            <div className="glass-card p-5 border-2 border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-md">
                  <BookOpen className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">مرحباً، {teacherData.first_name}</h2>
                  <p className="text-sm text-muted-foreground font-medium">المادة: {teacherData.subject}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar })}
                  </p>
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">أقسامي</h2>
                <p className="text-sm text-muted-foreground">{teacherSections.length} قسم مسند</p>
              </div>
            </div>

            {teacherSections.length === 0 ? (
              <div className="glass-card p-10 text-center border-2 border-dashed border-border">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="text-lg font-bold text-foreground mb-2">لم تحدد الإدارة أقسامك بعد</h3>
                <p className="text-sm text-muted-foreground">سيتم تعيين الأقسام من قبل الإدارة قريباً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherSections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => navigate(`/teacher/class/${section.id}`)}
                    className="w-full glass-card p-5 text-right hover:border-primary/40 transition-all group active:scale-[0.98] border-2 border-border"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0 border border-primary/20">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors block truncate">
                          {section.full_name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {section.year}
                        </span>
                      </div>
                      <div className="text-muted-foreground group-hover:text-primary transition-colors">
                        <FileText className="w-5 h-5" />
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
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center border-2 border-primary/20">
                <Send className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">القوائم المرسلة اليوم</h2>
                <p className="text-sm text-muted-foreground">يمكنك التراجع خلال 60 دقيقة</p>
              </div>
            </div>

            {loadingSentLists ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sentLists.length === 0 ? (
              <div className="glass-card p-10 text-center border-2 border-dashed border-border">
                <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="text-lg font-bold text-foreground mb-2">لا توجد قوائم مرسلة اليوم</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {sentLists.map((list: any) => {
                  const canRevoke = isWithin60Min(list.submitted_at);
                  const remaining = getTimeRemaining(list.submitted_at);
                  const absentStudents = list.absence_records || [];

                  return (
                    <div key={list.id} className="glass-card p-5 space-y-4 border-2 border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {canRevoke ? (
                            <Badge variant="outline" className="text-xs border-warning text-warning font-semibold px-3 py-1">
                              <Clock className="w-3.5 h-3.5 ml-1" />
                              {remaining}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs font-semibold">للقراءة فقط</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base text-foreground">{(list as any).sections?.full_name || 'قسم'}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(list.submitted_at), 'HH:mm', { locale: ar })} - {list.subject}
                          </p>
                        </div>
                      </div>

                      {absentStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3 font-medium">حضور كامل ✓</p>
                      ) : (
                        <div className="space-y-2">
                          {absentStudents.map((record: any) => (
                            <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border-2 border-destructive/15">
                              <div>
                                {canRevoke && (
                                  <Button variant="ghost" size="sm" className="text-destructive h-8 px-3 text-sm font-semibold active:scale-[0.95]" onClick={() => handleRevokeStudent(record.id)}>
                                    <Undo2 className="w-4 h-4 ml-1" />تراجع
                                  </Button>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-foreground">{record.students?.last_name} {record.students?.first_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {canRevoke && absentStudents.length > 0 && (
                        <Button variant="outline" size="sm" className="w-full border-2 border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-semibold active:scale-[0.98]" onClick={() => handleRevokeList(list.id)}>
                          <Trash2 className="w-4 h-4 ml-2" />إلغاء القائمة بالكامل
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
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border-2 border-border">
                <Settings className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
            </div>

            <div className="glass-card p-6 space-y-5 border-2 border-border">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <span className="text-base font-semibold text-foreground">الوضع الليلي/النهاري</span>
              </div>
              
              <Button variant="outline" className="w-full text-base font-semibold border-2 active:scale-[0.98]" size="lg" onClick={() => navigate('/teacher/settings')}>
                تغيير معلومات الحساب
              </Button>

              <Button
                variant="destructive"
                className="w-full text-base font-semibold active:scale-[0.98]"
                size="lg"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="w-5 h-5 ml-2" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar - Elevated & Prominent */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-primary/20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'var(--glass-blur-strong)' }}>
        <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all active:scale-[0.92] ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-bold">الإعدادات</span>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all relative active:scale-[0.92] ${activeTab === 'sent' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          >
            <Send className="w-6 h-6" />
            <span className="text-xs font-bold">المرسلة</span>
            {sentLists.length > 0 && (
              <span className="absolute -top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                {sentLists.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all active:scale-[0.92] ${activeTab === 'home' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-bold">الرئيسية</span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="bg-card border-2 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-lg">تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-base">
              هل أنت متأكد من رغبتك في تسجيل الخروج؟ ستحتاج لإعادة تسجيل الدخول للوصول لحسابك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel className="text-base font-semibold">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-base font-semibold">
              <LogOut className="w-5 h-5 ml-2" />
              تسجيل الخروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherDashboard;
