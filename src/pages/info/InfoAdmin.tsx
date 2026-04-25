import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, QrCode, FileText, Lock, Users, BarChart3, Bell, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  {
    icon: QrCode,
    color: 'text-primary',
    bg: 'bg-primary/15',
    title: 'ماسح QR عند البوابة',
    body: 'تسجل الإدارة دخول التلاميذ عبر QR أو Barcode، ويصنّف النظام الحالة تلقائياً حسب الأوقات المحددة.',
  },
  {
    icon: FileText,
    color: 'text-destructive',
    bg: 'bg-destructive/15',
    title: 'التقارير اليومية',
    body: 'تجمع التقارير حالات الغياب من المسح ومن قوائم الأساتذة، مع إمكانية الطباعة أو التصدير.',
  },
  {
    icon: Lock,
    color: 'text-warning',
    bg: 'bg-warning/15',
    title: 'الغيابات والتأخّرات والتحكّم في الدخول',
    body: 'تعرض المتأخرين والغائبين وتمنع دخولهم حتى تسمح الإدارة يدوياً، مع تمييز التغيب عن الحصة.',
  },
  {
    icon: Users,
    color: 'text-success',
    bg: 'bg-success/15',
    title: 'إدارة القوائم والأساتذة',
    body: 'تتيح الإدارة التحكم في التلاميذ والأقسام، طلبات الأساتذة، الأوقات، وتحميل القوائم.',
  },
  {
    icon: BarChart3,
    color: 'text-accent-foreground',
    bg: 'bg-accent',
    title: 'الإحصائيات والإشعارات الذكية',
    body: 'تساعد الإحصائيات والتنبيهات الإدارة على متابعة نسب الحضور وتدرج إشعارات الغياب.',
  },
  {
    icon: Archive,
    color: 'text-primary',
    bg: 'bg-primary/15',
    title: 'الأرشيف الكامل',
    body: 'يحفظ الأرشيف السجلات التاريخية للحضور والغياب لتسهيل البحث والمراجعة لاحقاً.',
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
                  <h3 className="text-xl font-bold text-foreground mb-2 leading-tight">{s.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">{s.body}</p>
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