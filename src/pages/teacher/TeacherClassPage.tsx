import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, CheckCircle, Loader2, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import SignaturePad from '@/components/SignaturePad';
import { useStudents } from '@/hooks/useStudents';
import { useSections } from '@/hooks/useSections';
import { useSubmitAbsenceList } from '@/hooks/useAbsence';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TeacherData {
  id: string;
  first_name: string;
  last_name: string;
  subject: string;
  signature_url: string | null;
}

interface StudentNote {
  studentId: string;
  note: string;
}

const TeacherClassPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [absentStudentIds, setAbsentStudentIds] = useState<string[]>([]);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const { data: allSections } = useSections();
  const { data: students, isLoading: studentsLoading } = useStudents(sectionId || null);
  const submitAbsenceList = useSubmitAbsenceList();

  const section = allSections?.find(s => s.id === sectionId);

  // Fetch gate statuses
  const today = new Date().toISOString().split('T')[0];
  const { data: gateStatuses = [] } = useQuery({
    queryKey: ['gate-statuses', sectionId, today],
    queryFn: async () => {
      if (!sectionId) return [];
      const { data, error } = await supabase
        .from('daily_student_status')
        .select('student_id, gate_status')
        .eq('date', today)
        .in('gate_status', ['tardy', 'absent']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sectionId,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/teacher/auth', { replace: true });
          return;
        }
        setAuthUserId(session.user.id);

        const { data: teacher } = await supabase
          .from('teachers')
          .select('id, first_name, last_name, subject, signature_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (teacher) setTeacherData(teacher);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoadingTeacher(false);
      }
    };
    fetchData();
  }, [navigate]);

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
      if (existing) return prev.map(n => n.studentId === studentId ? { ...n, note } : n);
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
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
      
      if (uploadError) {
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء رفع التوقيع', variant: 'destructive' });
        return;
      }
      
      const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
      setSignatureDataUrl(urlData.publicUrl);
      await supabase.from('teachers').update({ signature_url: urlData.publicUrl }).eq('id', teacherData.id);
      toast({ title: 'تم الحفظ', description: 'تم حفظ التوقيع بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ التوقيع', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!sectionId || !teacherData) {
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
        sectionId,
        subject: teacherData.subject,
        signatureUrl: signatureDataUrl,
        absentStudentIds,
      });
      
      toast({ title: 'تم الإرسال بنجاح', description: `تم إرسال قائمة غياب ${section?.full_name || ''} (${absentStudentIds.length} غائب)` });
      navigate('/teacher/dashboard', { replace: true });
    } catch (error: any) {
      let errorMessage = 'حدث خطأ أثناء إرسال القائمة';
      if (error?.message?.includes('row-level security')) {
        errorMessage = 'ليس لديك صلاحية لإرسال القوائم.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({ title: 'خطأ في الإرسال', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingTeacher) return null;

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/teacher/dashboard')} className="text-base font-semibold active:scale-[0.95]">
            <ArrowRight className="w-6 h-6 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">{section?.full_name || 'القسم'}</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="content-container py-6 space-y-6">
        {/* Section Info */}
        <div className="glass-card p-5 border-2 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{section?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{section?.year} • {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar })}</p>
            </div>
          </div>
        </div>

        {/* Student Count */}
        {students && (
          <div className="flex items-center justify-between px-2">
            <Badge variant="outline" className="text-sm font-semibold px-3 py-1 border-2">
              الغائبون: {absentStudentIds.length} / {students.length}
            </Badge>
            <span className="text-sm font-semibold text-muted-foreground">قائمة التلاميذ</span>
          </div>
        )}

        {/* Students Table */}
        {studentsLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : students && students.length > 0 ? (
          <div className="glass-card p-0 overflow-hidden border-2 border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-border bg-secondary/30">
                  <TableHead className="text-right text-sm font-bold text-foreground w-12">غائب</TableHead>
                  <TableHead className="text-right text-sm font-bold text-foreground">الاسم الكامل</TableHead>
                  <TableHead className="text-right text-sm font-bold text-foreground hidden sm:table-cell">تاريخ الميلاد</TableHead>
                  <TableHead className="text-right text-sm font-bold text-foreground w-20">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const isAbsent = absentStudentIds.includes(student.id);
                  const gateInfo = gateStatuses.find(g => g.student_id === student.id);
                  const gateStatus = gateInfo?.gate_status;

                  return (
                    <>
                      <TableRow
                        key={student.id}
                        className={`border-b border-border transition-colors cursor-pointer active:scale-[0.99] ${isAbsent ? 'bg-destructive/5' : ''}`}
                        onClick={() => toggleAbsent(student.id)}
                      >
                        <TableCell className="p-3">
                          <Checkbox
                            checked={isAbsent}
                            onCheckedChange={() => toggleAbsent(student.id)}
                            className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="p-3 font-semibold text-sm text-foreground">
                          {student.last_name} {student.first_name}
                        </TableCell>
                        <TableCell className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                          {student.birth_date ? format(new Date(student.birth_date), 'yyyy/MM/dd') : '—'}
                        </TableCell>
                        <TableCell className="p-3">
                          {gateStatus === 'tardy' && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-xs font-semibold">
                              <Clock className="w-3 h-3 ml-0.5" />متأخر
                            </Badge>
                          )}
                          {gateStatus === 'absent' && (
                            <Badge variant="destructive" className="text-xs font-semibold">غائب</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {isAbsent && (
                        <TableRow key={`${student.id}-note`} className="border-b border-border bg-destructive/5">
                          <TableCell colSpan={4} className="p-3">
                            <Textarea
                              placeholder="ملاحظات (اختياري)"
                              value={getStudentNote(student.id)}
                              onChange={(e) => updateStudentNote(student.id, e.target.value)}
                              className="text-sm h-16 resize-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="glass-card p-10 text-center border-2 border-dashed border-border">
            <Users className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-base text-muted-foreground font-medium">لا يوجد تلاميذ في هذا القسم</p>
          </div>
        )}

        {/* Signature - No saved signature option */}
        {students && students.length > 0 && (
          <div className="glass-card p-5 border-2 border-border">
            <SignaturePad onSave={handleSignatureSave} width={400} height={200} />
          </div>
        )}

        {/* Submit Button */}
        {students && students.length > 0 && (
          <div className="pb-4">
            <Button variant="gradient" size="lg" className="w-full text-base font-bold active:scale-[0.98]" onClick={handleSubmit} disabled={isSubmitting || !signatureDataUrl}>
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري الإرسال...</>
              ) : (
                <><CheckCircle className="w-5 h-5 ml-2" />إرسال قائمة الغياب ({absentStudentIds.length} غائب)</>
              )}
            </Button>
            {!signatureDataUrl && <p className="text-sm text-destructive text-center mt-3 font-medium">يرجى رسم التوقيع وحفظه أولاً</p>}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherClassPage;
