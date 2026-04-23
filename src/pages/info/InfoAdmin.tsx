import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, QrCode, FileText, Lock, Users, BarChart3, Bell, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  {
    icon: QrCode,
    color: 'text-primary',
    bg: 'bg-primary/15',
    title: 'ماسح QR عند البوابة',
    body: 'تتيح صفحة المسح للإدارة تشغيل كاميرا الجهاز لمسح رموز QR وBarcode الخاصة ببطاقات التلاميذ عند مدخل المؤسسة. يقوم النظام تلقائياً بتسجيل وقت الدخول وتصنيف الحالة (حاضر، متأخر، أو غائب) بناءً على الأوقات المحدّدة في الإعدادات. كما يمنع النظام دخول التلاميذ الممنوعين أو من تجاوزوا وقت الغياب دون إذن مسبق.',
  },
  {
    icon: FileText,
    color: 'text-destructive',
    bg: 'bg-destructive/15',
    title: 'التقارير اليومية',
    body: 'تعرض صفحة التقارير قائمة موحّدة بجميع حالات الغياب اليومية، سواء المسجّلة عن طريق المسح عند البوابة أو المرسلة من الأساتذة داخل الأقسام. يمكن للإدارة تصدير هذه التقارير كملفات PDF أو طباعتها مباشرة للأرشفة الورقية، مع تضمين: اسم التلميذ، القسم، السنة الدراسية، والتاريخ.',
  },
  {
    icon: Lock,
    color: 'text-warning',
    bg: 'bg-warning/15',
    title: 'الغيابات والتأخّرات والتحكّم في الدخول',
    body: 'توفّر هذه الصفحة رؤية مركزية لجميع التلاميذ المتأخرين والغائبين، مع إمكانية السماح بدخولهم يدوياً عبر زر "سماح". يكشف النظام تلقائياً حالات التغيّب عن الحصص (حاضر عند البوابة + غائب في القسم) ويميّزها بمؤشّر أحمر واضح. يبقى التلميذ في القائمة حتى يتم السماح له بالدخول من قبل الإدارة.',
  },
  {
    icon: Users,
    color: 'text-success',
    bg: 'bg-success/15',
    title: 'إدارة القوائم والأساتذة',
    body: 'تتيح لوحة التحكم إدارة كاملة لقوائم التلاميذ والأقسام، مع إمكانية إضافة أو تعديل أو حذف التلاميذ وعرض بطاقاتهم الذكية. كما تشمل نظام الموافقة على طلبات تسجيل الأساتذة الجدد، وإسناد الأقسام لكل أستاذ، وإعداد أوقات التأخر والغياب، وتحميل قوائم التلاميذ من ملفات Excel.',
  },
  {
    icon: BarChart3,
    color: 'text-accent-foreground',
    bg: 'bg-accent',
    title: 'الإحصائيات والإشعارات الذكية',
    body: 'يوفّر النظام إحصائيات تفصيلية عن نسب الحضور والغياب لكل قسم ولكل تلميذ على مدار الفترات الزمنية المختلفة. كما يُنبّه الإدارة تلقائياً عند تجاوز تلميذ لعدد أيام غياب معيّن عبر نظام إشعارات ذكي يتدرّج في مستويات التنبيه: إشعار أول، إشعار ثانٍ، إعذار، ثم شطب.',
  },
  {
    icon: Archive,
    color: 'text-primary',
    bg: 'bg-primary/15',
    title: 'الأرشيف الكامل',
    body: 'يحتفظ النظام بأرشيف كامل لجميع البيانات التاريخية للحضور والغياب، مع إمكانية البحث عن أي سجلّ بسهولة. هذا الأرشيف يضمن التتبّع الإداري الكامل ويوفّر مرجعاً موثوقاً لأي مراجعة لاحقة.',
  },
];

const InfoAdmin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <ArrowRight className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-foreground flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-background" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">صفحة الإدارة</h1>
              <p className="text-xs text-muted-foreground truncate">صلاحيات لوحة تحكم المسؤول</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="rounded-3xl bg-foreground text-background p-6 mb-6 shadow-md">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
            لوحة تحكّم الإدارة في SchoolOS
          </h2>
          <p className="text-background/85 text-base leading-relaxed">
            مركز التحكّم الكامل بالنظام: إدارة التلاميذ والأساتذة، مراقبة الحضور والغياب، إصدار
            التقارير، والتحكّم بصلاحيات الدخول إلى المؤسسة.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((s, i) => (
            <article
              key={s.title}
              className="rounded-2xl border-2 border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">{s.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 mb-4 text-center">
          <Button variant="outline" size="lg" onClick={() => navigate('/')} className="border-2">
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة إلى الصفحة الرئيسية
          </Button>
        </div>
      </main>
    </div>
  );
};

export default InfoAdmin;