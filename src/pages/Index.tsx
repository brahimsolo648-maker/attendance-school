import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, GraduationCap, Shield, Workflow, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoginChooserDialog from '@/components/LoginChooserDialog';
import schoolIcon from '@/assets/schoolos-icon.png';

const Index = () => {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  const cards = [
    {
      title: 'صفحة الأستاذ',
      subtitle: 'دليل واجهة الأساتذة',
      icon: GraduationCap,
      gradient: 'from-primary to-primary/70',
      ring: 'ring-primary/30',
      onClick: () => navigate('/info/teacher'),
    },
    {
      title: 'صفحة الإدارة',
      subtitle: 'صلاحيات لوحة التحكم',
      icon: Shield,
      gradient: 'from-foreground to-foreground/70',
      ring: 'ring-foreground/30',
      onClick: () => navigate('/info/admin'),
    },
    {
      title: 'طريقة العمل',
      subtitle: 'تدفق نظام SchoolOS',
      icon: Workflow,
      gradient: 'from-warning to-destructive',
      ring: 'ring-warning/30',
      onClick: () => navigate('/info/system'),
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden" dir="rtl">
      {/* Soft background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[420px] h-[420px] rounded-full bg-primary/10 blur-[80px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[360px] h-[360px] rounded-full bg-warning/10 blur-[80px]" />
      </div>

      {/* Top Bar */}
      <header className="relative z-20 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
        <Button
          variant="default"
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md gap-2 active:scale-[0.97]"
          onClick={() => setLoginOpen(true)}
        >
          <LogIn className="w-5 h-5" />
          تسجيل الدخول
        </Button>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-foreground leading-tight">SchoolOS</p>
            <p className="text-[10px] text-muted-foreground leading-tight">v1.0</p>
          </div>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-card border-2 border-border">
            <img src={schoolIcon} alt="SchoolOS" className="w-full h-full object-cover scale-110" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-6 max-w-5xl mx-auto w-full">
        {/* Brand */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl overflow-hidden bg-card border-2 border-border shadow-md mb-3">
            <img src={schoolIcon} alt="SchoolOS" className="w-full h-full object-cover scale-110" />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
          >
            School<span className="text-primary">OS</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5">
            نظام إدارة الحضور الذكي
          </p>
        </div>

        {/* Three big gradient cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 animate-fade-in" style={{ animationDelay: '120ms' }}>
          {cards.map((c) => (
            <button
              key={c.title}
              onClick={c.onClick}
              className={`group relative overflow-hidden rounded-3xl border-2 border-border bg-card text-right p-5 sm:p-6 shadow-sm hover:shadow-lg active:scale-[0.98] transition-all duration-300 ring-2 ring-transparent hover:${c.ring}`}
            >
              {/* Gradient strip */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${c.gradient} transition-opacity duration-300`} />

              <div className="relative flex sm:flex-col items-center sm:items-start gap-4 sm:gap-5">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <c.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-1">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                    {c.subtitle}
                  </p>
                </div>

                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground sm:hidden shrink-0" />
              </div>

              <div className="hidden sm:flex items-center gap-1 mt-4 text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                <span>اكتشف المزيد</span>
                <ChevronLeft className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 space-y-0.5">
          <p className="text-xs text-muted-foreground/70">ثانوية العربي عبد القادر</p>
          <p className="text-[10px] text-muted-foreground/50">SchoolOS · جميع الحقوق محفوظة</p>
        </div>
      </main>

      <LoginChooserDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default Index;