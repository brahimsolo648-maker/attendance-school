import { useNavigate } from 'react-router-dom';
import { ArrowRight, Workflow, IdCard, ScanLine, ClipboardCheck, AlertTriangle, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
  {
    n: 1,
    icon: IdCard,
    color: 'text-primary',
    bg: 'bg-primary/15',
    title: 'إعداد بطاقات التعريف الذكية',
    body: 'تبدأ الدورة بإنشاء بطاقة تعريف ذكية لكل تلميذ من لوحة تحكم الإدارة. تحتوي كل بطاقة على رمز QR فريد ورمز Barcode من نوع EAN-13، إضافةً إلى بيانات التلميذ الأساسية (الاسم، القسم، السنة الدراسية). يمكن طباعة البطاقات بشكل فردي أو جماعي حسب القسم بجودة عالية مناسبة للطباعة الاحترافية.',
  },
  {
    n: 2,
    icon: ScanLine,
    color: 'text-warning',
    bg: 'bg-warning/15',
    title: 'المسح عند بوابة المؤسسة',
    body: 'عند وصول التلميذ إلى المؤسسة يقوم بتمرير بطاقته أمام جهاز المسح (كاميرا أو ماسح ضوئي). يقرأ النظام الرمز ويتحقّق من هوية التلميذ فوراً. بناءً على الوقت الحالي مقارنةً بالأوقات المحدّدة في الإعدادات يصنّف النظام التلميذ تلقائياً: حاضر إذا وصل قبل وقت التأخر، متأخر إذا وصل بين وقت التأخر ووقت الغياب، أو يُرفض دخوله إذا تجاوز وقت الغياب.',
  },
  {
    n: 3,
    icon: ClipboardCheck,
    color: 'text-success',
    bg: 'bg-success/15',
    title: 'تأكيد الحضور داخل القسم',
    body: 'يفتح الأستاذ قائمة القسم من تطبيقه، حيث يرى جميع التلاميذ مع حالاتهم المحدّثة تلقائياً من بيانات البوابة. يحدّد الأستاذ التلاميذ الغائبين فعلياً عن الحصة، ثم يوقّع إلكترونياً ويرسل القائمة. هذه الخطوة ضرورية لأنها تكشف التناقضات: تلميذ مسح بطاقته (حاضر) لكنه لم يحضر الحصة، وهو ما يُعرف بـ"التغيب عن الحصة".',
  },
  {
    n: 4,
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/15',
    title: 'المعالجة الآلية وكشف التناقضات',
    body: 'يقارن نظام SchoolOS بيانات البوابة مع بيانات الأساتذة في الوقت الحقيقي. عند اكتشاف تناقض (حاضر في البوابة + غائب في القسم) يُضاف التلميذ تلقائياً إلى قائمة الغيابات مع مؤشّر أحمر يُنبّه الإدارة. كما تسجَّل تلقائياً جميع حالات التلاميذ الذين لم يمسحوا رموزهم بعد تجاوز وقت الغياب كغائبين، دون الحاجة لتدخّل يدوي.',
  },
  {
    n: 5,
    icon: FileBarChart,
    color: 'text-accent-foreground',
    bg: 'bg-accent',
    title: 'التحكّم الإداري وإصدار التقارير',
    body: 'تملك الإدارة صلاحية كاملة للتحكّم في الوضع: السماح بدخول تلميذ متأخر أو غائب عبر زر "سماح"، مراجعة التقارير اليومية وتصديرها كـ PDF أو طباعتها، ومتابعة الإحصائيات العامة. يحتفظ النظام بأرشيف كامل لجميع البيانات التاريخية، ويُصدر إشعارات تلقائية عند تجاوز تلميذ لعتبات غياب محدّدة.',
  },
];

const InfoSystem = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <ArrowRight className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-warning flex items-center justify-center shrink-0">
              <Workflow className="w-6 h-6 text-warning-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">طريقة عمل النظام</h1>
              <p className="text-xs text-muted-foreground truncate">تدفق العمل الكامل خطوة بخطوة</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="rounded-3xl bg-gradient-to-br from-warning to-destructive text-warning-foreground p-6 mb-6 shadow-md">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
            دورة عمل SchoolOS المتكاملة
          </h2>
          <p className="text-warning-foreground/90 text-base leading-relaxed">
            خمس خطوات مترابطة تضمن متابعةً دقيقةً لحضور التلاميذ من لحظة دخولهم المؤسسة حتى إصدار
            التقارير الرسمية وأرشفتها.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((s, i) => (
            <article
              key={s.n}
              className="rounded-2xl border-2 border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in relative"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <span className="w-7 h-7 rounded-full bg-foreground text-background text-sm font-bold flex items-center justify-center">
                    {s.n}
                  </span>
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

export default InfoSystem;