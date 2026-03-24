import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, UserCheck, Bell, Settings, FileText, FolderOpen, Archive, Upload, UserX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingTeachersCount } from '@/hooks/useTeachers';
import AccountRequests from './AccountRequests';
import NotificationsPage from './NotificationsPage';
import AdminSettings from './AdminSettings';

type AdminTab = 'home' | 'requests' | 'notifications' | 'settings';

const ControlPanelDashboard = () => {
  const navigate = useNavigate();
  const { data: pendingCount } = usePendingTeachersCount();
  const [activeTab, setActiveTab] = useState<AdminTab>('home');

  const mainActions = [
    { icon: FileText, label: 'التقارير', description: 'عرض التقارير', path: '/admin/reports', color: 'text-primary' },
    { icon: UserX, label: 'الغيابات والتأخرات', description: 'مراقبة الغياب والتأخر', path: '/admin/absences', color: 'text-destructive' },
    { icon: FolderOpen, label: 'إدارة القوائم', description: 'إدارة الطلاب والأقسام', path: '/admin/manage-lists', color: 'text-accent-foreground' },
    { icon: Archive, label: 'الأرشيف', description: 'السجلات المؤرشفة', path: '/admin/archive', color: 'text-success' },
    { icon: Upload, label: 'تحميل قوائم', description: 'رفع قوائم جديدة', path: '/admin/upload-lists', color: 'text-primary' },
  ];

  return (
    <div className="page-container min-h-screen pb-16">
      {/* Tab Content */}
      {activeTab === 'home' && (
        <div className="animate-fade-in">
          {/* Minimal top bar */}
          <div className="content-container flex items-center justify-between pt-4 pb-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/main')}>
              <ArrowLeft className="w-4 h-4 ml-1" />
              واجهة المسح
            </Button>
            <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>
          </div>

          <main className="content-container py-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto">
              {mainActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="card-elevated p-3 sm:p-4 text-right hover:border-primary transition-all group"
                >
                  <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform mb-2 ${action.color}`}>
                    <action.icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {action.label}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {action.description}
                  </p>
                </button>
              ))}
            </div>
          </main>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="animate-fade-in">
          <AccountRequests embedded />
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="animate-fade-in">
          <NotificationsPage embedded />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="animate-fade-in">
          <AdminSettings />
        </div>
      )}

      {/* Bottom Navigation Bar - 4 tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">الإعدادات</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${activeTab === 'notifications' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] font-medium">الإشعارات</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors relative ${activeTab === 'requests' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] font-medium">الطلبات</span>
            {pendingCount && pendingCount > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">الرئيسية</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ControlPanelDashboard;
