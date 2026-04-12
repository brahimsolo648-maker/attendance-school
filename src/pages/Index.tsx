import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, BookOpen, Settings2, Workflow, QrCode, FileText, Users, ScanLine, Bell, Lock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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

      {/* Teacher Info Sheet */}
      <Sheet open={openModal === 'teacher'} onOpenChange={(o) => !o && setOpenModal(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl" dir="rtl">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              معلومات صفحة الأستاذ
            </SheetTitle>
            <SheetDescription>دليل شامل لجميع مكونات وميزات واجهة الأستاذ في نظام SchoolOS</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-120px)] mt-4 pr-1">
            <div className="space-y-6 pb-8">
              {/* Section 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Users className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">إدارة الأقسام والتلاميذ</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  عند تسجيل الدخول، يعرض النظام تلقائياً جميع الأقسام المسندة إلى الأستاذ من قِبل الإدارة. بالضغط على أي قسم، تظهر قائمة كاملة بأسماء التلاميذ مع حالة كل تلميذ في الوقت الحقيقي (حاضر، غائب، أو متأخر). تُحدّث الحالات تلقائياً بناءً على بيانات المسح عند البوابة، مما يمنح الأستاذ رؤية فورية ودقيقة لحضور تلاميذه.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5 text-destructive" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">تسجيل الغياب وإرسال القوائم</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  يمكن للأستاذ تحديد التلاميذ الغائبين يدوياً من داخل القسم بالضغط على اسم كل تلميذ غائب. بعد الانتهاء، يقوم بإرسال قائمة الغياب اليومية إلى الإدارة بضغطة واحدة. تتضمن القائمة المرسلة: اسم الأستاذ، المادة، القسم، وقائمة التلاميذ الغائبين، مما يضمن توثيقاً رسمياً ودقيقاً لكل حصة.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                    <ScanLine className="w-4.5 h-4.5 text-warning" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">التوقيع الإلكتروني للتأكيد</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  لضمان مصداقية البيانات، يُطلب من الأستاذ التوقيع إلكترونياً قبل إرسال كل قائمة غياب. هذا التوقيع يُعتبر بمثابة تأكيد رسمي بأن الأستاذ هو من قام بتسجيل الغياب، ويتم حفظه مع القائمة كمرجع إداري. يمكن للأستاذ إعادة التوقيع أو مسحه قبل الإرسال النهائي.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                    <Bell className="w-4.5 h-4.5 text-success" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">متابعة حالات التلاميذ</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  يعرض النظام بجانب اسم كل تلميذ شارة (Badge) ملونة تدل على حالته: أخضر للحاضر، أصفر للمتأخر، وأحمر للغائب. هذه الشارات تُحدّث في الوقت الحقيقي بناءً على بيانات المسح عند البوابة، مما يساعد الأستاذ على مقارنة الحضور الفعلي في القسم مع بيانات النظام واكتشاف أي تناقض فوري.
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                    <Settings2 className="w-4.5 h-4.5 text-accent-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">إعدادات الحساب الشخصي</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  يمكن للأستاذ الوصول إلى صفحة الإعدادات لتعديل صورته الشخصية، وتغيير كلمة المرور، ومراجعة بياناته المسجلة في النظام. تتيح هذه الصفحة أيضاً تسجيل الخروج الآمن من الحساب، مع ضمان حفظ جميع البيانات والقوائم المرسلة سابقاً.
                </p>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Admin Info Sheet */}
      <Sheet open={openModal === 'admin'} onOpenChange={(o) => !o && setOpenModal(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl" dir="rtl">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-accent-foreground" />
              </div>
              معلومات صفحة الإدارة
            </SheetTitle>
            <SheetDescription>دليل شامل لصلاحيات ومكونات لوحة تحكم الإدارة في نظام SchoolOS</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-120px)] mt-4 pr-1">
            <div className="space-y-6 pb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <QrCode className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">ماسح QR عند البوابة</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  تتيح صفحة المسح للإدارة تشغيل كاميرا الجهاز لمسح رموز QR وBarcode الخاصة ببطاقات التلاميذ عند مدخل المؤسسة. يقوم النظام تلقائياً بتسجيل وقت الدخول وتصنيف الحالة (حاضر، متأخر، أو غائب) بناءً على الأوقات المحددة في الإعدادات. كما يمنع النظام دخول التلاميذ الممنوعين أو من تجاوزوا وقت الغياب دون إذن مسبق من الإدارة.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5 text-destructive" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">التقارير اليومية</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  تعرض صفحة التقارير قائمة موحدة بجميع حالات الغياب اليومية، سواء المسجلة عن طريق المسح عند البوابة أو المرسلة من الأساتذة داخل الأقسام. يمكن للإدارة تصدير هذه التقارير كملفات PDF أو طباعتها مباشرة للأرشفة الورقية. تتضمن كل سجل: اسم التلميذ، القسم، السنة الدراسية، وتاريخ الغياب.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                    <Lock className="w-4.5 h-4.5 text-warning" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">الغيابات والتأخرات والتحكم</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  توفر هذه الصفحة رؤية مركزية لجميع التلاميذ المتأخرين والغائبين مع إمكانية السماح بدخولهم يدوياً. يكشف النظام تلقائياً حالات التغيب عن الحصص (عندما يكون التلميذ حاضراً عند البوابة لكنه غائب في القسم) ويميزها بمؤشر أحمر واضح. يبقى التلميذ في القائمة حتى يتم السماح له بالدخول من قبل الإدارة.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                    <Users className="w-4.5 h-4.5 text-success" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">إدارة القوائم والأساتذة</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  تتيح لوحة التحكم إدارة كاملة لقوائم التلاميذ والأقسام، مع إمكانية إضافة أو تعديل أو حذف التلاميذ وعرض بطاقاتهم الذكية. كما تشمل نظام الموافقة على طلبات تسجيل الأساتذة الجدد، وإسناد الأقسام لكل أستاذ، وإعداد أوقات التأخر والغياب، وتحميل قوائم التلاميذ من ملفات Excel.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4.5 h-4.5 text-accent-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">الإحصائيات والإشعارات</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-12">
                  يوفر النظام إحصائيات تفصيلية عن نسب الحضور والغياب لكل قسم ولكل تلميذ على مدار الفترات الزمنية المختلفة. كما يُنبّه الإدارة تلقائياً عند تجاوز تلميذ لعدد أيام غياب معين عبر نظام إشعارات ذكي يتدرج في مستويات التنبيه (إشعار أول، إشعار ثاني، إعذار، شطب).
                </p>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* System Workflow Sheet */}
      <Sheet open={openModal === 'system'} onOpenChange={(o) => !o && setOpenModal(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl" dir="rtl">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-warning" />
              </div>
              طريقة عمل نظام SchoolOS
            </SheetTitle>
            <SheetDescription>شرح تفصيلي لتدفق العمل الكامل من لحظة دخول التلميذ حتى إصدار التقارير</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-120px)] mt-4 pr-1">
            <div className="space-y-6 pb-8">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-bold text-foreground text-base">إعداد بطاقات التعريف الذكية</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-14">
                  تبدأ العملية بإنشاء بطاقة تعريف ذكية لكل تلميذ عبر لوحة تحكم الإدارة. تحتوي كل بطاقة على رمز QR فريد ورمز Barcode من نوع EAN-13، إضافة إلى معلومات التلميذ الأساسية (الاسم، القسم، السنة الدراسية). يمكن طباعة البطاقات بشكل فردي أو جماعي حسب القسم، ويتم تصديرها بجودة عالية مناسبة للطباعة الاحترافية.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-bold text-foreground text-base">المسح عند بوابة المؤسسة</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-14">
                  عند وصول التلميذ إلى المؤسسة، يقوم بتمرير بطاقته أمام جهاز المسح (كاميرا أو ماسح ضوئي) عند البوابة. يقرأ النظام الرمز ويتحقق من هوية التلميذ فوراً. بناءً على الوقت الحالي مقارنةً بالأوقات المحددة في إعدادات النظام، يتم تصنيف التلميذ تلقائياً: <strong>حاضر</strong> إذا وصل قبل وقت التأخر، <strong>متأخر</strong> إذا وصل بين وقت التأخر ووقت الغياب، أو يُرفض دخوله إذا تجاوز وقت الغياب.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-bold text-foreground text-base">تأكيد الحضور داخل القسم</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-14">
                  يقوم الأستاذ بفتح قائمة القسم من تطبيقه، حيث يرى جميع التلاميذ مع حالاتهم المحدّثة تلقائياً من بيانات البوابة. يحدد الأستاذ التلاميذ الغائبين فعلياً في الحصة، ثم يوقّع إلكترونياً ويرسل القائمة. هذه الخطوة ضرورية لأنها تكشف التناقضات: تلميذ مسح بطاقته عند البوابة (حاضر) لكنه لم يحضر الحصة (تغيّب عنها)، وهو ما يُعرف بـ"التغيب عن الحصة".
                </p>
              </div>

              {/* Step 4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-bold text-foreground text-base">المعالجة الآلية وكشف التناقضات</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-14">
                  يقوم نظام SchoolOS بمقارنة بيانات البوابة مع بيانات الأساتذة في الوقت الحقيقي. عند اكتشاف تناقض (حاضر في البوابة + غائب في القسم)، يُضاف التلميذ تلقائياً إلى قائمة الغيابات مع مؤشر أحمر واضح يُنبّه الإدارة. كما يتم تسجيل جميع التلاميذ الذين لم يمسحوا رموزهم بعد تجاوز وقت الغياب كغائبين تلقائياً، دون الحاجة لتدخل يدوي.
                </p>
              </div>

              {/* Step 5 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">5</span>
                  </div>
                  <h3 className="font-bold text-foreground text-base">التحكم الإداري والتقارير</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pr-14">
                  تملك الإدارة صلاحية كاملة للتحكم في الوضع: السماح بدخول تلميذ متأخر أو غائب عبر زر "سماح"، مراجعة التقارير اليومية وتصديرها كـ PDF أو طباعتها، ومتابعة الإحصائيات العامة. يحتفظ النظام بأرشيف كامل لجميع البيانات التاريخية، ويُصدر إشعارات تلقائية عند تجاوز تلميذ لعتبات غياب محددة (3 أيام، 7 أيام، إلخ).
                </p>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;
