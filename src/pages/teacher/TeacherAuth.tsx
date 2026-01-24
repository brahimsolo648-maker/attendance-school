import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').min(1, 'البريد الإلكتروني مطلوب'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

const registerSchema = z.object({
  firstName: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(50, 'الاسم طويل جداً'),
  lastName: z.string().min(2, 'اللقب يجب أن يكون حرفين على الأقل').max(50, 'اللقب طويل جداً'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(50, 'كلمة المرور طويلة جداً')
    .regex(/^[a-zA-Z0-9]+$/, 'كلمة المرور يجب أن تحتوي على أحرف وأرقام فقط'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

const TeacherAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  // Check if already authenticated as teacher
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if user has teacher role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'teacher')
            .maybeSingle();
          
          if (roleData) {
            // Already authenticated as teacher, redirect to dashboard
            navigate('/teacher/dashboard', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    // Validate input
    const validation = loginSchema.safeParse({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setLoginErrors(errors);
      return;
    }

    setIsLoading(true);
    
    try {
      const email = loginEmail.trim().toLowerCase();
      
      // Step 1: Check if teacher exists and get their status
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, status, user_id, first_name, last_name')
        .eq('email', email)
        .maybeSingle();

      if (teacherError) throw teacherError;

      if (!teacherData) {
        toast({
          title: 'خطأ',
          description: 'لا يوجد حساب بهذا البريد الإلكتروني',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Step 2: Check approval status
      if (teacherData.status === 'pending') {
        toast({
          title: 'حساب قيد المراجعة',
          description: 'حسابك لم تتم الموافقة عليه بعد، يرجى الانتظار حتى تتم الموافقة من قبل الإدارة',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (teacherData.status === 'rejected') {
        toast({
          title: 'تم رفض الحساب',
          description: 'تم رفض طلب التسجيل الخاص بك، يرجى التواصل مع الإدارة',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Step 3: Authenticate with Supabase Auth
      let authUserId: string | null = null;

      if (teacherData.user_id) {
        // Teacher has linked auth account - sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: loginPassword,
        });

        if (signInError) {
          toast({
            title: 'خطأ في تسجيل الدخول',
            description: signInError.message.includes('Invalid login credentials')
              ? 'كلمة المرور غير صحيحة'
              : signInError.message,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        authUserId = signInData.user?.id || null;
      } else {
        // Teacher approved but no auth account - create one
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: loginPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/teacher/dashboard`,
          },
        });

        if (signUpError) {
          // User might already exist - try to sign in
          if (signUpError.message.includes('User already registered')) {
            const { data: existingSignIn, error: existingSignInError } = await supabase.auth.signInWithPassword({
              email,
              password: loginPassword,
            });

            if (existingSignInError) {
              toast({
                title: 'خطأ',
                description: 'كلمة المرور غير صحيحة',
                variant: 'destructive',
              });
              setIsLoading(false);
              return;
            }

            authUserId = existingSignIn.user?.id || null;
          } else {
            toast({
              title: 'خطأ',
              description: signUpError.message,
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
        } else {
          authUserId = signUpData.user?.id || null;
        }
      }

      // Step 4: Ensure teacher record is linked and role exists
      if (authUserId) {
        // Link user_id to teacher record
        await supabase
          .from('teachers')
          .update({ user_id: authUserId })
          .eq('id', teacherData.id);

        // Ensure teacher role exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', authUserId)
          .eq('role', 'teacher')
          .maybeSingle();

        if (!existingRole) {
          await supabase
            .from('user_roles')
            .insert({ user_id: authUserId, role: 'teacher' });
        }
      }

      toast({
        title: 'تم تسجيل الدخول',
        description: `مرحباً ${teacherData.first_name} ${teacherData.last_name}`,
      });

      // Wait a moment for session to propagate, then redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = '/teacher/dashboard';
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'خطأ',
        description: error?.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});

    // Validate input
    const validation = registerSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: registerEmail.trim(),
      password: registerPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setRegisterErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const email = registerEmail.trim().toLowerCase();

      // Check if email already exists
      const { data: existingTeacher, error: checkError } = await supabase
        .from('teachers')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error('Database check error:', checkError);
        // Check if it's a network/connection error
        if (checkError.message?.includes('fetch') || checkError.message?.includes('network') || checkError.code === 'PGRST301') {
          toast({
            title: 'خطأ في الاتصال',
            description: 'تعذر الاتصال بقاعدة البيانات، يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'خطأ',
            description: 'حدث خطأ أثناء التحقق من البريد الإلكتروني',
            variant: 'destructive',
          });
        }
        setIsLoading(false);
        return;
      }

      if (existingTeacher) {
        if (existingTeacher.status === 'pending') {
          toast({
            title: 'طلب موجود',
            description: 'لديك طلب تسجيل قيد المراجعة بالفعل',
            variant: 'destructive',
          });
        } else if (existingTeacher.status === 'approved') {
          toast({
            title: 'حساب موجود',
            description: 'هذا البريد مسجل بالفعل، يرجى تسجيل الدخول',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'حساب مرفوض',
            description: 'تم رفض طلب سابق بهذا البريد، يرجى التواصل مع الإدارة',
            variant: 'destructive',
          });
        }
        setIsLoading(false);
        return;
      }

      // Insert teacher with pending status
      const { error: insertError } = await supabase
        .from('teachers')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email,
          subject: 'غير محدد',
          status: 'pending',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        if (insertError.code === '23505') {
          toast({
            title: 'خطأ',
            description: 'هذا البريد الإلكتروني مسجل بالفعل',
            variant: 'destructive',
          });
        } else if (insertError.message?.includes('fetch') || insertError.message?.includes('network')) {
          toast({
            title: 'خطأ في الاتصال',
            description: 'تعذر الاتصال بقاعدة البيانات، يرجى المحاولة مرة أخرى',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'خطأ في الحفظ',
            description: insertError.message || 'تعذر حفظ بيانات الحساب',
            variant: 'destructive',
          });
        }
        setIsLoading(false);
        return;
      }

      setRegistrationSuccess(true);
      
      // Reset form
      setFirstName('');
      setLastName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      console.error('Registration error:', error);
      // Handle network/fetch errors
      if (error?.message?.includes('fetch') || error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        toast({
          title: 'خطأ في الاتصال',
          description: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'خطأ',
          description: error?.message || 'حدث خطأ غير متوقع أثناء إنشاء الحساب',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="page-container min-h-screen flex flex-col">
        <header className="glass-nav px-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-8 text-center animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">تم إرسال طلبك بنجاح!</h2>
            <p className="text-muted-foreground mb-6">
              سيتم مراجعة طلبك من قبل الإدارة. ستتمكن من تسجيل الدخول بمجرد الموافقة على حسابك.
            </p>
            <div className="space-y-3">
              <Button 
                variant="gradient" 
                className="w-full"
                onClick={() => setRegistrationSuccess(false)}
              >
                العودة لتسجيل الدخول
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/')}
              >
                العودة للصفحة الرئيسية
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-md mb-4">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">واجهة الأستاذ</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">لدي حساب</TabsTrigger>
              <TabsTrigger value="register">حساب جديد</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pr-10 input-styled"
                      dir="ltr"
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-xs text-destructive">{loginErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pr-10 pl-10 input-styled"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-xs text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    تذكرني
                  </label>
                </div>

                <Button 
                  type="submit" 
                  variant="gradient" 
                  size="lg" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">الاسم *</label>
                    <Input
                      type="text"
                      placeholder="الاسم"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input-styled"
                      maxLength={50}
                    />
                    {registerErrors.firstName && (
                      <p className="text-xs text-destructive">{registerErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">اللقب *</label>
                    <Input
                      type="text"
                      placeholder="اللقب"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input-styled"
                      maxLength={50}
                    />
                    {registerErrors.lastName && (
                      <p className="text-xs text-destructive">{registerErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">البريد الإلكتروني *</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pr-10 input-styled"
                      dir="ltr"
                      maxLength={255}
                    />
                  </div>
                  {registerErrors.email && (
                    <p className="text-xs text-destructive">{registerErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="أحرف وأرقام فقط (6 على الأقل)"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pr-10 pl-10 input-styled"
                      dir="ltr"
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {registerErrors.password && (
                    <p className="text-xs text-destructive">{registerErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">تأكيد كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="أعد كتابة كلمة المرور"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10 pl-10 input-styled"
                      dir="ltr"
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {registerErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{registerErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="p-3 bg-secondary/20 rounded-lg text-sm text-muted-foreground border border-border">
                  <p className="text-center">
                    ⓘ سيتم تحديد المادة والأقسام من قبل الإدارة بعد الموافقة على حسابك
                  </p>
                </div>

                <Button 
                  type="submit" 
                  variant="gradient" 
                  size="lg" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    'إنشاء حساب'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TeacherAuth;
