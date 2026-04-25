import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogIn, ClipboardList, BarChart3 } from 'lucide-react';
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

      {/* Main Content - Responsive: stacked on phone (30% layout weight),
          two-column on desktop (70% layout weight) */}
      <main className="content-container py-6 lg:py-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
          {/* QR Scan - Primary (entry) */}
          <Button
            variant="gradient"
            size="xl"
            className="w-full h-32 lg:h-56 lg:col-span-3 text-xl lg:text-3xl flex-col gap-3 active:scale-[0.98]"
            onClick={() => navigate('/admin/qr-scanner?type=entry')}
          >
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <LogIn className="w-8 h-8 lg:w-9 lg:h-9" />
            </div>
            تسجيل الدخول - مسح QR
          </Button>

          {/* Quick Actions */}
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-5 lg:py-7 flex-col gap-2 border-2 active:scale-[0.98]"
            onClick={() => navigate('/admin/daily-attendance')}
          >
            <ClipboardList className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            <span className="text-base lg:text-lg">قائمة الحضور اليومية</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-5 lg:py-7 flex-col gap-2 border-2 active:scale-[0.98]"
            onClick={() => navigate('/admin/statistics')}
          >
            <BarChart3 className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            <span className="text-base lg:text-lg">الإحصائيات</span>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AdminMain;
