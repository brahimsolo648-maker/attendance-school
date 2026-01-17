import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

// Admin email that should be auto-registered
const ADMIN_EMAIL = 'brahimsolo648@gmail.com';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, signUp, user, isAdmin, loading: authLoading } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin/main';
      navigate(from, { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = loginSchema.safeParse({ email, password });
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
      // First try to sign in
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        // If invalid credentials and this is the admin email, try to create the account
        if (signInError.message.includes('Invalid login credentials') && email === ADMIN_EMAIL) {
          // Try to sign up the admin account
          const { error: signUpError } = await signUp(email, password);
          
          if (signUpError) {
            // If user already exists, show credentials error
            if (signUpError.message.includes('User already registered')) {
              toast({
                title: 'خطأ في تسجيل الدخول',
                description: 'كلمة المرور غير صحيحة',
                variant: 'destructive'
              });
            } else {
              toast({
                title: 'خطأ في إنشاء الحساب',
                description: signUpError.message,
                variant: 'destructive'
              });
            }
            return;
          }
          
          // Sign up successful, now sign in
          const { error: retrySignInError } = await signIn(email, password);
          if (retrySignInError) {
            toast({
              title: 'خطأ',
              description: 'تم إنشاء الحساب لكن فشل تسجيل الدخول، حاول مرة أخرى',
              variant: 'destructive'
            });
            return;
          }
          
          toast({
            title: 'تم إنشاء حساب المسؤول',
            description: 'مرحباً بك في لوحة الإدارة',
          });
          return;
        }
        
        let errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'بيانات الدخول غير صحيحة';
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'البريد الإلكتروني غير مؤكد';
        } else if (signInError.message.includes('Too many requests')) {
          errorMessage = 'محاولات كثيرة، يرجى الانتظار';
        }
        
        toast({
          title: 'خطأ في تسجيل الدخول',
          description: errorMessage,
          variant: 'destructive'
        });
        return;
      }

      // Navigation will happen via useEffect when isAdmin is set
      toast({
        title: 'تم تسجيل الدخول',
        description: 'مرحباً بك في لوحة الإدارة',
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
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowRight className="w-5 h-5 ml-2" />
          العودة
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="glass-card w-full max-w-md p-6 sm:p-8 animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent shadow-md mb-4">
              <Shield className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">دخول الإدارة</h1>
            <p className="text-muted-foreground mt-2">الرجاء إدخال بيانات الدخول</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10 input-styled"
                  required
                />
              </div>
            </div>

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

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-admin"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label htmlFor="remember-admin" className="text-sm text-muted-foreground cursor-pointer">
                تذكر بيانات الدخول
              </label>
            </div>

            <Button 
              type="submit" 
              variant="gradient-accent" 
              size="lg" 
              className="w-full"
              disabled={isLoading || authLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
