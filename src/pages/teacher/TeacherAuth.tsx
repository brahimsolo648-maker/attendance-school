import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

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
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

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
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'teacher')
            .maybeSingle();
          
          if (roleData) {
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
      
      // Step 1: Try to sign in directly first (most common case)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (!signInError && signInData.user) {
        // Successfully signed in - check teacher role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', signInData.user.id)
          .eq('role', 'teacher')
          .maybeSingle();

        if (roleData) {
          toast({
            title: 'تم تسجيل الدخول',
            description: 'مرحباً بك',
          });
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = '/teacher/dashboard';
          return;
        }

        // Has auth but no teacher role - check if teacher record exists
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, status, first_name, last_name')
          .eq('email', email)
          .maybeSingle();

        if (teacherData) {
          if (teacherData.status === 'pending') {
            await supabase.auth.signOut();
            toast({ title: 'حساب قيد المراجعة', description: 'حسابك لم تتم الموافقة عليه بعد', variant: 'destructive' });
            setIsLoading(false);
            return;
          }
          if (teacherData.status === 'rejected') {
            await supabase.auth.signOut();
            toast({ title: 'تم رفض الحساب', description: 'تم رفض طلب التسجيل الخاص بك', variant: 'destructive' });
            setIsLoading(false);
            return;
          }
          // Approved - link and assign role
          await supabase.from('teachers').update({ user_id: signInData.user.id }).eq('id', teacherData.id);
          const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', signInData.user.id).eq('role', 'teacher').maybeSingle();
          if (!existingRole) {
            await supabase.from('user_roles').insert({ user_id: signInData.user.id, role: 'teacher' });
          }
          toast({ title: 'تم تسجيل الدخول', description: `مرحباً ${teacherData.first_name} ${teacherData.last_name}` });
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = '/teacher/dashboard';
          return;
        }

        // No teacher record at all
        await supabase.auth.signOut();
        toast({ title: 'خطأ', description: 'لا يوجد حساب أستاذ مرتبط بهذا البريد', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Sign in failed - could be wrong password or no auth account
      if (signInError) {
        // Check if teacher record exists
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, status, user_id, first_name, last_name')
          .eq('email', email)
          .maybeSingle();

        if (!teacherData) {
          toast({ title: 'خطأ', description: 'لا يوجد حساب بهذا البريد الإلكتروني', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        if (teacherData.status === 'pending') {
          toast({ title: 'حساب قيد المراجعة', description: 'حسابك لم تتم الموافقة عليه بعد', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        if (teacherData.status === 'rejected') {
          toast({ title: 'تم رفض الحساب', description: 'تم رفض طلب التسجيل الخاص بك', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        // Teacher is approved but sign-in failed
        if (teacherData.user_id) {
          // Has linked account - password is wrong
          toast({ title: 'خطأ في تسجيل الدخول', description: 'كلمة المرور غير صحيحة', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        // No linked auth account - create one
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: loginPassword,
          options: { emailRedirectTo: `${window.location.origin}/teacher/dashboard` },
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            toast({ title: 'خطأ', description: 'كلمة المرور غير صحيحة', variant: 'destructive' });
          } else {
            toast({ title: 'خطأ', description: signUpError.message, variant: 'destructive' });
          }
          setIsLoading(false);
          return;
        }

        if (signUpData.user) {
          await supabase.from('teachers').update({ user_id: signUpData.user.id }).eq('id', teacherData.id);
          const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', signUpData.user.id).eq('role', 'teacher').maybeSingle();
          if (!existingRole) {
            await supabase.from('user_roles').insert({ user_id: signUpData.user.id, role: 'teacher' });
          }
          toast({ title: 'تم تسجيل الدخول', description: `مرحباً ${teacherData.first_name} ${teacherData.last_name}` });
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = '/teacher/dashboard';
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});

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

      const { data: existingTeacher, error: checkError } = await supabase
        .from('teachers')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء التحقق من البريد الإلكتروني', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (existingTeacher) {
        if (existingTeacher.status === 'pending') {
          toast({ title: 'طلب موجود', description: 'لديك طلب تسجيل قيد المراجعة بالفعل', variant: 'destructive' });
        } else if (existingTeacher.status === 'approved') {
          toast({ title: 'حساب موجود', description: 'هذا البريد مسجل بالفعل، يرجى تسجيل الدخول', variant: 'destructive' });
        } else {
          toast({ title: 'حساب مرفوض', description: 'تم رفض طلب سابق بهذا البريد', variant: 'destructive' });
        }
        setIsLoading(false);
        return;
      }

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
        if (insertError.code === '23505') {
          toast({ title: 'خطأ', description: 'هذا البريد الإلكتروني مسجل بالفعل', variant: 'destructive' });
        } else {
          toast({ title: 'خطأ في الحفظ', description: insertError.message || 'تعذر حفظ بيانات الحساب', variant: 'destructive' });
        }
        setIsLoading(false);
        return;
      }

      setRegistrationSuccess(true);
      setFirstName('');
      setLastName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return null;
  }

  if (registrationSuccess) {
    return (
      <div className="page-container min-h-screen flex flex-col">
        <header className="glass-nav px-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowRight className="w-6 h-6 ml-2" />
            العودة
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-8 text-center animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">تم إرسال طلبك بنجاح!</h2>
            <p className="text-muted-foreground mb-6 text-base">
              سيتم مراجعة طلبك من قبل الإدارة. ستتمكن من تسجيل الدخول بمجرد الموافقة على حسابك.
            </p>
            <div className="space-y-3">
              <Button variant="gradient" className="w-full" size="lg" onClick={() => setRegistrationSuccess(false)}>
                العودة لتسجيل الدخول
              </Button>
              <Button variant="outline" className="w-full" size="lg" onClick={() => navigate('/')}>
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
      <header className="glass-nav px-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowRight className="w-6 h-6 ml-2" />
          العودة
        </Button>
      </header>

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
              <TabsTrigger value="login" className="text-base font-semibold">لدي حساب</TabsTrigger>
              <TabsTrigger value="register" className="text-base font-semibold">حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pr-10 input-styled text-base"
                      dir="ltr"
                    />
                  </div>
                  {loginErrors.email && <p className="text-xs text-destructive">{loginErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pr-10 pl-10 input-styled text-base"
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
                  {loginErrors.password && <p className="text-xs text-destructive">{loginErrors.password}</p>}
                </div>

                <Button type="submit" variant="gradient" size="lg" className="w-full text-base" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري تسجيل الدخول...</>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">الاسم *</label>
                    <Input type="text" placeholder="الاسم" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-styled text-base" maxLength={50} />
                    {registerErrors.firstName && <p className="text-xs text-destructive">{registerErrors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">اللقب *</label>
                    <Input type="text" placeholder="اللقب" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-styled text-base" maxLength={50} />
                    {registerErrors.lastName && <p className="text-xs text-destructive">{registerErrors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">البريد الإلكتروني *</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input type="email" placeholder="example@email.com" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="pr-10 input-styled text-base" dir="ltr" maxLength={255} />
                  </div>
                  {registerErrors.email && <p className="text-xs text-destructive">{registerErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="أحرف وأرقام فقط (6 على الأقل)" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className="pr-10 pl-10 input-styled text-base" dir="ltr" maxLength={50} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {registerErrors.password && <p className="text-xs text-destructive">{registerErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">تأكيد كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="أعد كتابة كلمة المرور" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-10 pl-10 input-styled text-base" dir="ltr" maxLength={50} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {registerErrors.confirmPassword && <p className="text-xs text-destructive">{registerErrors.confirmPassword}</p>}
                </div>

                <div className="p-3 bg-secondary/20 rounded-lg text-sm text-muted-foreground border-2 border-border">
                  <p className="text-center">ⓘ سيتم تحديد المادة والأقسام من قبل الإدارة بعد الموافقة على حسابك</p>
                </div>

                <Button type="submit" variant="gradient" size="lg" className="w-full text-base" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري إرسال الطلب...</>
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
