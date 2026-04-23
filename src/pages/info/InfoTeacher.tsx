import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, FileText, ScanLine, Bell, Settings2, GraduationCap, ClipboardCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  {
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/15',
    title: 'إدارة الأقسام والتلاميذ',
    body: 'بمجرّد تسجيل دخول الأستاذ، يعرض النظام تلقائياً جميع الأقسام التي أسندتها إليه الإدارة. عند الضغط على أي قسم تظهر قائمة كاملة بأسماء التلاميذ مع حالة كل تلميذ في الوقت الحقيقي: حاضر، متأخر، أو غائب. تُحدَّث هذه الحالات لحظياً بناءً على نتائج المسح عند بوابة المؤسسة، مما يمنح الأستاذ رؤية فورية ودقيقة لحضور تلاميذه.',
  },
  {
    icon: ClipboardCheck,
    color: 'text-destructive',
    bg: 'bg-destructive/15',
    title: 'تسجيل الغياب وإرسال القوائم',
    body: 'يمكن للأستاذ تحديد التلاميذ الغائبين يدوياً داخل القسم بضغطة واحدة على اسم كل تلميذ. بعد الانتهاء يقوم بإرسال قائمة الغياب اليومية إلى الإدارة فوراً، وتتضمّن القائمة: اسم الأستاذ، المادة، القسم، وأسماء التلاميذ الغائبين، مما يضمن توثيقاً رسمياً ودقيقاً لكل حصّة.',
  },
  {
    icon: ScanLine,
    color: 'text-warning',
    bg: 'bg-warning/15',
    title: 'التوقيع الإلكتروني للتأكيد',
    body: 'لضمان مصداقية البيانات يُطلب من الأستاذ التوقيع إلكترونياً قبل إرسال كل قائمة غياب. هذا التوقيع يعدّ تأكيداً رسمياً بأن الأستاذ هو من سجّل الغياب، ويُحفظ مع القائمة كمرجع إداري يمكن الرجوع إليه لاحقاً.',
  },
  {
    icon: Bell,
    color: 'text-success',
    bg: 'bg-success/15',
    title: 'متابعة حالات التلاميذ',
    body: 'يعرض النظام بجانب اسم كل تلميذ شارة ملوّنة دالّة على حالته: أخضر للحاضر، أصفر للمتأخر، وأحمر للغائب. تتحدّث الشارات في الوقت الحقيقي بناءً على بيانات البوابة، مما يساعد الأستاذ على مقارنة الحضور الفعلي في القسم مع بيانات النظام واكتشاف أي تناقض فوري.',
  },
  {
    icon: Calendar,
    color: 'text-primary',
    bg: 'bg-primary/15',
    title: 'سجل الحصص والقوائم السابقة',
    body: 'يحتفظ النظام بسجل كامل لجميع قوائم الغياب التي أرسلها الأستاذ، مع إمكانية مراجعتها واستعراضها في أي وقت. هذا السجل يساعد الأستاذ على متابعة سلوك تلاميذه عبر الزمن واستخراج الإحصائيات المتعلّقة بالحضور.',
  },
  {
    icon: Settings2,
    color: 'text-accent-foreground',
    bg: 'bg-accent',
    title: 'إعدادات الحساب الشخصي',
    body: 'يمكن للأستاذ الوصول إلى صفحة الإعدادات لتعديل صورته الشخصية، تغيير كلمة المرور، ومراجعة بياناته المسجّلة في النظام. كما تتيح الصفحة تسجيل الخروج الآمن من الحساب، مع ضمان حفظ جميع البيانات والقوائم المرسَلة سابقاً.',
  },
];

const InfoTeacher = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <ArrowRight className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">صفحة الأستاذ</h1>
              <p className="text-xs text-muted-foreground truncate">دليل شامل لمكونات الواجهة</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="rounded-3xl gradient-primary text-primary-foreground p-6 mb-6 shadow-md">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
            واجهة الأستاذ في SchoolOS
          </h2>
          <p className="text-primary-foreground/90 text-base leading-relaxed">
            منصّة مخصّصة للأساتذة لإدارة حضور تلاميذهم، تسجيل الغياب داخل القسم، وإرسال القوائم
            اليومية إلى الإدارة بكل سهولة وأمان.
          </p>
        </div>

        {/* Sections */}
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

export default InfoTeacher;