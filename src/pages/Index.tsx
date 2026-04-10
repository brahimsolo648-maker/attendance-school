import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, BookOpen, Settings2, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import schoolIcon from '@/assets/schoolos-icon.png';

type ModalType = 'teacher' | 'admin' | 'system' | null;

const Index = () => {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState<ModalType>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[80px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-secondary/15 blur-[60px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center space-y-5">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-lg bg-card border-2 border-border p-2">
              <img src={schoolIcon} alt="SchoolOS" className="w-full h-full object-contain" />
            </div>
          </div>

          <div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
              School<span className="text-primary">OS</span>
            </h1>
            <p className="text-lg text-foreground/90 font-semibold">
              نظام إدارة الحضور الذكي
            </p>
          </div>

          <p className="text-muted-foreground text-base">
            منصة متكاملة لإدارة حضور وغياب التلاميذ بتقنية المسح الذكي
          </p>
        </div>

        {/* Login Buttons */}
        <div className="w-full space-y-4">
          <Button
            variant="gradient"
            size="xl"
            className="w-full glass-card hover:shadow-glow transition-all duration-300 gap-3 active:scale-[0.98]"
            onClick={() => navigate('/teacher/auth')}
          >
            <GraduationCap className="w-6 h-6" />
            <span>الدخول كأستاذ</span>
          </Button>

          <Button
            variant="outline"
            size="xl"
            className="w-full glass border-primary/40 hover:bg-primary/15 hover:border-primary/60 transition-all duration-300 gap-3 active:scale-[0.98]"
            onClick={() => navigate('/admin/login')}
          >
            <Shield className="w-6 h-6" />
            <span>الدخول كإدارة</span>
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-3 w-full mt-2">
          <button
            onClick={() => setOpenModal('teacher')}
            className="glass-card text-center py-4 px-2 group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 border-2 border-border"
          >
            <div className="w-11 h-11 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-semibold text-foreground/80 leading-tight">صفحة الأستاذ</p>
          </button>

          <button
            onClick={() => setOpenModal('admin')}
            className="glass-card text-center py-4 px-2 group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 border-2 border-border"
          >
            <div className="w-11 h-11 mx-auto mb-2 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
              <Settings2 className="w-5 h-5 text-accent-foreground" />
            </div>
            <p className="text-xs font-semibold text-foreground/80 leading-tight">صفحة الإدارة</p>
          </button>

          <button
            onClick={() => setOpenModal('system')}
            className="glass-card text-center py-4 px-2 group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 border-2 border-border"
          >
            <div className="w-11 h-11 mx-auto mb-2 rounded-xl bg-warning/20 flex items-center justify-center group-hover:bg-warning/30 transition-colors">
              <Workflow className="w-5 h-5 text-warning" />
            </div>
            <p className="text-xs font-semibold text-foreground/80 leading-tight">طريقة العمل</p>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground/70">ثانوية العربي عبد القادر</p>
          <p className="text-xs text-muted-foreground/50">SchoolOS v1.0</p>
        </div>
      </div>

      {/* Teacher Info Modal */}
      <Dialog open={openModal === 'teacher'} onOpenChange={(o) => !o && setOpenModal(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              معلومات صفحة الأستاذ
            </DialogTitle>
            <DialogDescription>مكونات وميزات واجهة الأستاذ</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/80">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>عرض الأقسام المسندة إلى الأستاذ مع قائمة التلاميذ لكل قسم</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>تسجيل غياب التلاميذ يدوياً من داخل القسم وإرسال قائمة الغياب</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>التوقيع الإلكتروني لتأكيد إرسال قائمة الحضور</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>عرض حالة كل تلميذ (حاضر، غائب، متأخر) في الوقت الحقيقي</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>إعدادات الحساب وتغيير الصورة الشخصية</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Info Modal */}
      <Dialog open={openModal === 'admin'} onOpenChange={(o) => !o && setOpenModal(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="w-5 h-5 text-accent-foreground" />
              معلومات صفحة الإدارة
            </DialogTitle>
            <DialogDescription>صلاحيات ومكونات لوحة تحكم الإدارة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/80">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground mt-2 shrink-0" />
              <p>مسح رموز QR عند البوابة لتسجيل دخول وخروج التلاميذ</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground mt-2 shrink-0" />
              <p>لوحة تحكم متكاملة: التقارير، الغيابات والتأخرات، إدارة القوائم</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground mt-2 shrink-0" />
              <p>الموافقة أو رفض طلبات تسجيل الأساتذة الجدد</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground mt-2 shrink-0" />
              <p>إدارة بطاقات التلاميذ مع رموز QR و Barcode</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground mt-2 shrink-0" />
              <p>تحديد أوقات التأخر والغياب وإعدادات النظام</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* System Workflow Modal */}
      <Dialog open={openModal === 'system'} onOpenChange={(o) => !o && setOpenModal(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Workflow className="w-5 h-5 text-warning" />
              طريقة عمل النظام
            </DialogTitle>
            <DialogDescription>تدفق عمل نظام SchoolOS</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground/80">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">1</span>
              <p>يحصل كل طالب على <strong>بطاقة تعريف ذكية</strong> تحتوي على رمز QR ورمز Barcode فريد</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">2</span>
              <p>يتم <strong>مسح رمز QR</strong> عند مدخل المؤسسة لتسجيل الدخول والخروج تلقائياً</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">3</span>
              <p>الأستاذ يقوم <strong>بتأكيد الحضور</strong> داخل القسم وإرسال قائمة الغياب اليومية</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">4</span>
              <p>النظام <strong>يجمع البيانات</strong> من البوابة والأقسام ويكشف حالات التغيب عن الحصص تلقائياً</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">5</span>
              <p>الإدارة تراقب <strong>التقارير والإحصائيات</strong> وتتحكم في صلاحيات الدخول والسماح</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
