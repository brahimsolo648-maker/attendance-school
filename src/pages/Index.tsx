import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, QrCode, BarChart3, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background - simplified for performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[80px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-secondary/15 blur-[60px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 max-w-md w-full animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center space-y-6">
          {/* App Icon - Using the new PWA icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg">
              <img 
                src="/icons/icon-512x512.png" 
                alt="الحضور" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* App Name */}
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold text-gradient tracking-tight mb-3">
              الحضور
            </h1>
            <p className="text-xl text-foreground/90 font-semibold">
              نظام إدارة الحضور الذكي
            </p>
          </div>
          
          <p className="text-muted-foreground text-lg">
            منصة متكاملة لإدارة حضور وغياب التلاميذ بتقنية المسح الذكي
          </p>
        </div>

        {/* Login Buttons */}
        <div className="w-full space-y-4">
          <Button
            variant="gradient"
            size="xl"
            className="w-full glass-card hover:shadow-glow transition-all duration-300 gap-3"
            onClick={() => navigate('/teacher/auth')}
          >
            <GraduationCap className="w-6 h-6" />
            <span>الدخول كأستاذ</span>
          </Button>

          <Button
            variant="outline"
            size="xl"
            className="w-full glass border-primary/40 hover:bg-primary/15 hover:border-primary/60 transition-all duration-300 gap-3"
            onClick={() => navigate('/admin/login')}
          >
            <Shield className="w-6 h-6" />
            <span>الدخول كإدارة</span>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-4 w-full mt-4">
          <div className="glass-card text-center py-5 px-3 group cursor-default hover:scale-[1.02] transition-transform duration-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors duration-200">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground/80">تقارير متقدمة</p>
          </div>
          
          <div className="glass-card text-center py-5 px-3 group cursor-default hover:scale-[1.02] transition-transform duration-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors duration-200">
              <QrCode className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground/80">مسح QR</p>
          </div>
          
          <div className="glass-card text-center py-5 px-3 group cursor-default hover:scale-[1.02] transition-transform duration-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-warning/20 flex items-center justify-center group-hover:bg-warning/30 transition-colors duration-200">
              <Bell className="w-6 h-6 text-warning" />
            </div>
            <p className="text-sm font-medium text-foreground/80">إشعارات فورية</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground/70">
            ثانوية العربي عبد القادر
          </p>
          <p className="text-xs text-muted-foreground/50">
            نظام حضور متكامل بتقنية QR
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
