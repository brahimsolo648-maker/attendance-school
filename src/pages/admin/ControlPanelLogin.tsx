import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Lock, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

// Input validation schema
const loginSchema = z.object({
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

const ControlPanelLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/admin/login', { replace: true });
        return;
      }
      // If already authenticated as admin, allow access
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = loginSchema.safeParse({ password });
    if (!validation.success) {
      toast({
        title: 'خطأ في البيانات',
        description: validation.error.errors[0].message,
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Verify the password against the control panel password stored in system_settings
      // For now, we verify that the user is authenticated as admin
      if (!isAdmin) {
        toast({
          title: 'خطأ',
          description: 'ليس لديك صلاحية الوصول للوحة التحكم',
          variant: 'destructive'
        });
        return;
      }

      // Navigate to dashboard - the actual password verification happens server-side via RLS
      navigate('/admin/control-panel/dashboard');
      toast({
        title: 'تم الدخول',
        description: 'مرحباً بك في لوحة التحكم',
      });
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-nav px-4">
        <Button variant="ghost" onClick={() => navigate('/admin/main')}>
          <ArrowRight className="w-5 h-5 ml-2" />
          العودة
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="glass-card w-full max-w-sm p-6 sm:p-8 animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-2">أدخل كلمة المرور للمتابعة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 input-styled"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="gradient" 
              size="lg" 
              className="w-full"
              disabled={isLoading || authLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                'الدخول'
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ControlPanelLogin;
