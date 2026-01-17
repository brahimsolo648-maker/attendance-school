import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, User, Ban, Check, Trash2, CreditCard, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useStudent, useUpdateStudent, useDeleteStudent } from '@/hooks/useStudents';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Enums } from '@/integrations/supabase/types';
import StudentCardModal from '@/components/StudentCardModal';
const StudentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const { data: studentData, isLoading } = useStudent(id || null);
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<Enums<'ban_reason'> | ''>('');
  const [banCustomReason, setBanCustomReason] = useState('');
  const [banSubject, setBanSubject] = useState('');
  
  // Initialize ban state when data loads
  useState(() => {
    if (studentData) {
      setIsBanned(studentData.is_banned);
      setBanReason(studentData.ban_reason || '');
      setBanCustomReason(studentData.ban_custom_reason || '');
      setBanSubject(studentData.ban_subject || '');
    }
  });
  
  const handleBanToggle = async (checked: boolean) => {
    setIsBanned(checked);
    
    if (!checked && id) {
      // Remove ban
      try {
        await updateStudent.mutateAsync({
          id,
          updates: {
            is_banned: false,
            ban_reason: null,
            ban_custom_reason: null,
            ban_subject: null,
          },
        });
        toast({
          title: 'تم بنجاح',
          description: 'تم السماح للتلميذ بالدخول',
        });
      } catch (error) {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleSaveBan = async () => {
    if (!id || !banReason) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار سبب المنع',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await updateStudent.mutateAsync({
        id,
        updates: {
          is_banned: true,
          ban_reason: banReason as Enums<'ban_reason'>,
          ban_custom_reason: banReason === 'شيء آخر' ? banCustomReason : null,
          ban_subject: banSubject,
        },
      });
      toast({
        title: 'تم بنجاح',
        description: 'تم تفعيل المنع',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ',
        variant: 'destructive',
      });
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteStudent.mutateAsync(id);
      toast({
        title: 'تم بنجاح',
        description: 'تم حذف التلميذ',
      });
      navigate(-1);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الحذف',
        variant: 'destructive',
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="page-container min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }
  
  if (!studentData) {
    return (
      <div className="page-container min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">التلميذ غير موجود</div>
      </div>
    );
  }
  
  const student = studentData;
  const section = (studentData as any).sections;
  
  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">تفاصيل التلميذ</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8 space-y-6">
        {/* Student Info Card */}
        <div className="glass-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              {student.photo_url ? (
                <img 
                  src={student.photo_url} 
                  alt="صورة التلميذ" 
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">
                {student.last_name} {student.first_name}
              </h2>
              <p className="text-muted-foreground">{section?.full_name}</p>
              {student.birth_date && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(student.birth_date), 'PPP', { locale: ar })}
                </p>
              )}
              {student.is_banned && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <Ban className="w-4 h-4" />
                  ممنوع من الدخول
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="space-y-4">
          {/* Extract Card Button */}
          <button
            onClick={() => setShowCardModal(true)}
            className="glass-card p-4 w-full text-right hover:border-primary/50 transition-all flex items-center justify-between"
          >
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">استخراج البطاقة</span>
          </button>
          
          {/* Ban Toggle Card */}
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Switch
                checked={isBanned}
                onCheckedChange={handleBanToggle}
              />
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                <span className="font-medium text-foreground">
                  {isBanned ? 'ممنوع من الدخول' : 'مسموح بالدخول'}
                </span>
              </div>
            </div>
            
            {isBanned && (
              <div className="space-y-4 pt-4 border-t border-border animate-slide-up">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">سبب المنع</label>
                  <Select value={banReason} onValueChange={(v) => setBanReason(v as Enums<'ban_reason'>)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سبب المنع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="استدعاء">استدعاء</SelectItem>
                      <SelectItem value="تقرير">تقرير</SelectItem>
                      <SelectItem value="شيء آخر">شيء آخر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {banReason === 'شيء آخر' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">السبب المخصص</label>
                    <Input
                      value={banCustomReason}
                      onChange={(e) => setBanCustomReason(e.target.value)}
                      placeholder="اكتب السبب"
                      className="input-styled"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">موضوع المنع</label>
                  <Input
                    value={banSubject}
                    onChange={(e) => setBanSubject(e.target.value)}
                    placeholder="موضوع المنع"
                    className="input-styled"
                  />
                </div>
                
                <Button 
                  variant="gradient" 
                  className="w-full"
                  onClick={handleSaveBan}
                  disabled={updateStudent.isPending}
                >
                  <Check className="w-4 h-4 ml-2" />
                  حفظ وتفعيل المنع
                </Button>
              </div>
            )}
          </div>
          
          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="glass-card p-4 w-full text-right hover:border-destructive/50 transition-all flex items-center justify-between text-destructive"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">حذف التلميذ</span>
          </button>
        </div>
      </main>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Student Card Modal */}
      <StudentCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        student={student ? {
          ...student,
          section: section
        } : null}
      />
    </div>
  );
};

export default StudentDetails;
