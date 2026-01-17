import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogIn, LogOut, ClipboardList, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AdminMain = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-DZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-DZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/control-panel')}>
            <Settings className="w-4 h-4 ml-2" />
            لوحة التحكم
          </Button>

          <div className="text-center">
            <div className="text-lg font-bold text-primary tabular-nums">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(currentTime)}
            </div>
          </div>

          <Avatar className="w-9 h-9 border-2 border-accent">
            <AvatarImage src="" />
            <AvatarFallback className="bg-accent text-accent-foreground text-sm">إ</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8">
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="lg"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/admin/daily-attendance')}
            >
              <ClipboardList className="w-6 h-6 text-primary" />
              <span>قائمة الحضور اليومية</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/admin/statistics')}
            >
              <BarChart3 className="w-6 h-6 text-primary" />
              <span>الإحصائيات</span>
            </Button>
          </div>

          {/* QR Scan Buttons */}
          <div className="space-y-4">
            <Button
              variant="gradient"
              size="xl"
              className="w-full h-32 text-xl flex-col gap-3"
              onClick={() => navigate('/admin/qr-scanner?type=entry')}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <LogIn className="w-8 h-8" />
              </div>
              تسجيل الدخول - مسح QR
            </Button>

            <Button
              variant="gradient-accent"
              size="xl"
              className="w-full h-32 text-xl flex-col gap-3"
              onClick={() => navigate('/admin/qr-scanner?type=exit')}
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-foreground/20 flex items-center justify-center">
                <LogOut className="w-8 h-8" />
              </div>
              تسجيل الخروج - مسح QR
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMain;
