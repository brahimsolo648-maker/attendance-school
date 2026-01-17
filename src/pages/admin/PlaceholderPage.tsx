import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pageTitles: Record<string, string> = {
  '/admin/daily-attendance': 'قائمة الحضور اليومية',
  '/admin/statistics': 'الإحصائيات',
  '/admin/qr-checkin': 'تسجيل الدخول - مسح QR',
  '/admin/qr-checkout': 'تسجيل الخروج - مسح QR',
  '/admin/reports': 'التقارير',
  '/admin/manage-lists': 'إدارة القوائم',
  '/admin/archive': 'الأرشيف',
  '/admin/upload-lists': 'تحميل قوائم',
  '/admin/notifications': 'الإشعارات',
  '/admin/account-requests': 'طلبات الموافقة على الحسابات',
};

const PlaceholderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'صفحة قيد الإنشاء';

  const goBack = () => {
    if (location.pathname.includes('control-panel')) {
      navigate('/admin/control-panel/dashboard');
    } else {
      navigate('/admin/main');
    }
  };

  return (
    <div className="page-container min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-effect border-b border-border">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={goBack}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-secondary mb-6">
            <Construction className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground">
            هذه الصفحة قيد الإنشاء وستكون متاحة في المراحل القادمة
          </p>
        </div>
      </main>
    </div>
  );
};

export default PlaceholderPage;
