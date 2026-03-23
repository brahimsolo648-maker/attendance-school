import { useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft, Bell, UserCheck, FileText, FolderOpen, Archive, Upload, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingTeachersCount } from '@/hooks/useTeachers';

const ControlPanelDashboard = () => {
  const navigate = useNavigate();
  const { data: pendingCount } = usePendingTeachersCount();

  const mainActions = [
    {
      icon: FileText,
      label: 'التقارير',
      description: 'عرض وإنشاء التقارير',
      path: '/admin/reports',
      color: 'text-primary'
    },
    {
      icon: UserX,
      label: 'الغيابات والتأخرات',
      description: 'مراقبة الغياب والتأخر والتغيب',
      path: '/admin/absences',
      color: 'text-destructive'
    },
    {
      icon: FolderOpen,
      label: 'عرض/إدارة القوائم',
      description: 'إدارة قوائم الطلاب والأقسام',
      path: '/admin/manage-lists',
      color: 'text-accent'
    },
    {
      icon: Archive,
      label: 'الأرشيف',
      description: 'عرض السجلات المؤرشفة',
      path: '/admin/archive',
      color: 'text-success'
    },
    {
      icon: Upload,
      label: 'تحميل قوائم',
      description: 'رفع قوائم جديدة',
      path: '/admin/upload-lists',
      color: 'text-primary'
    }
  ];

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-effect border-b border-border">
        <div className="content-container flex items-center justify-between h-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/control-panel/settings')}
          >
            <Settings className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/main')}
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              واجهة المسح
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/admin/notifications')}
            >
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-destructive">
                !
              </Badge>
            </Button>

            <Button
              variant="gradient-accent"
              size="sm"
              onClick={() => navigate('/admin/account-requests')}
              className="relative"
            >
              <UserCheck className="w-4 h-4 ml-2" />
              طلبات الموافقة
              {pendingCount && pendingCount > 0 && (
                <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs bg-destructive">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-2">إدارة النظام والبيانات</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {mainActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="card-elevated p-6 text-right hover:border-primary transition-all group animate-slide-up"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform ${action.color}`}>
                  <action.icon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {action.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {action.description}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ControlPanelDashboard;
