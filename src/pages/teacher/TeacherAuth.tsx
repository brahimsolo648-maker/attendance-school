import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useRegisterTeacher } from '@/hooks/useTeachers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const TeacherAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isTeacher, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state - simplified (no subject/sections)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const registerTeacher = useRegisterTeacher();

  // Redirect if already authenticated as teacher
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!authLoading && user) {
        // Check if user has teacher role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'teacher')
          .maybeSingle();
        
        if (roleData || isTeacher) {
          navigate('/teacher/dashboard', { replace: true });
        }
      }
    };
    checkAndRedirect();
  }, [user, isTeacher, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if teacher exists and is approved
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, status, user_id')
        .eq('email', loginEmail.trim().toLowerCase())
        .maybeSingle();

      if (teacherError) {
        throw teacherError;
      }

      if (!teacherData) {
        toast({
          title: 'خطأ',
          description: 'لا يوجد حساب بهذا البريد الإلكتروني',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      if (teacherData.status === 'pending') {
        toast({
          title: 'حساب قيد المراجعة',
          description: 'حسابك لم تتم الموافقة عليه بعد، يرجى الانتظار',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      if (teacherData.status === 'rejected') {
        toast({
          title: 'تم رفض الحساب',
          description: 'تم رفض طلب التسجيل الخاص بك',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // If teacher has user_id, sign in with password
      if (teacherData.user_id) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });

        if (signInError) {
          toast({
            title: 'خطأ في تسجيل الدخول',
            description: signInError.message.includes('Invalid login credentials') 
              ? 'كلمة المرور غير صحيحة' 
              : signInError.message,
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        // Ensure teacher role exists
        if (signInData.user) {
          // First make sure teacher record is linked
          await supabase
            .from('teachers')
            .update({ user_id: signInData.user.id })
            .eq('id', teacherData.id);

          // Then ensure role exists
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', signInData.user.id)
            .eq('role', 'teacher')
            .maybeSingle();

          if (!existingRole) {
            await supabase
              .from('user_roles')
              .insert({ user_id: signInData.user.id, role: 'teacher' });
          }
          
          // Small delay to ensure DB updates are committed
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        toast({
          title: 'تم تسجيل الدخول',
          description: 'مرحباً بك',
        });
        
        // Force navigation with window.location for clean state
        window.location.href = '/teacher/dashboard';
      } else {
        // Teacher approved but no auth account - create one
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/teacher/dashboard`,
          }
        });

        if (signUpError) {
          // User might already exist - try to sign in
          if (signUpError.message.includes('User already registered')) {
            const { data: existingSignIn, error: signInError } = await supabase.auth.signInWithPassword({
              email: loginEmail.trim().toLowerCase(),
              password: loginPassword,
            });

            if (signInError) {
              toast({
                title: 'خطأ',
                description: 'كلمة المرور غير صحيحة',
                variant: 'destructive'
              });
              setIsLoading(false);
              return;
            }

            // Link user_id to teacher and add role
            if (existingSignIn?.user) {
              await supabase
                .from('teachers')
                .update({ user_id: existingSignIn.user.id })
                .eq('id', teacherData.id);

              const { data: existingRole } = await supabase
                .from('user_roles')
                .select('id')
                .eq('user_id', existingSignIn.user.id)
                .eq('role', 'teacher')
                .maybeSingle();

              if (!existingRole) {
                await supabase
                  .from('user_roles')
                  .insert({ user_id: existingSignIn.user.id, role: 'teacher' });
              }
            }

            toast({
              title: 'تم تسجيل الدخول',
              description: 'مرحباً بك',
            });
            
            // Small delay then force navigation
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = '/teacher/dashboard';
            return;
          } else {
            toast({
              title: 'خطأ',
              description: signUpError.message,
              variant: 'destructive'
            });
            setIsLoading(false);
            return;
          }
        }

        // Link user_id to teacher and add role
        if (signUpData?.user) {
          await supabase
            .from('teachers')
            .update({ user_id: signUpData.user.id })
            .eq('id', teacherData.id);

          await supabase
            .from('user_roles')
            .insert({ user_id: signUpData.user.id, role: 'teacher' });
        }

        toast({
          title: 'تم إنشاء الحساب',
          description: 'مرحباً بك، تم تفعيل حسابك',
        });
        
        // Small delay then force navigation
        await new Promise(resolve => setTimeout(resolve, 300));
        window.location.href = '/teacher/dashboard';
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'خطأ',
        description: error?.message || 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال الاسم واللقب',
        variant: 'destructive'
      });
      return;
    }

    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال بريد إلكتروني صحيح',
        variant: 'destructive'
      });
      return;
    }

    if (registerPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive'
      });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمتا المرور غير متطابقتين',
        variant: 'destructive'
      });
      return;
    }

    try {
      await registerTeacher.mutateAsync({
        teacher: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: registerEmail.trim().toLowerCase(),
          subject: 'غير محدد', // Will be set by admin later
          status: 'pending',
        },
        sectionIds: [], // Will be assigned by admin later
      });

      toast({
        title: 'تم إرسال طلبك',
        description: 'سيتم مراجعة طلبك والموافقة عليه من قبل الإدارة، ثم سيتم تحديد المادة والأقسام',
      });

      // Reset form
      setFirstName('');
      setLastName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error?.message?.includes('duplicate') || error?.code === '23505') {
        toast({
          title: 'خطأ',
          description: 'هذا البريد الإلكتروني مسجل بالفعل',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'خطأ',
          description: error?.message || 'حدث خطأ أثناء إنشاء الحساب',
          variant: 'destructive'
        });
      }
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
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
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
                  disabled={isLoading || authLoading}
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

            {/* Register Tab - Simplified */}
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
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">اللقب *</label>
                    <Input
                      type="text"
                      placeholder="اللقب"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input-styled"
                      required
                    />
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
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="6 أحرف على الأقل"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
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
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                  <p className="text-center">
                    ⓘ سيتم تحديد المادة والأقسام من قبل الإدارة بعد الموافقة على حسابك
                  </p>
                </div>

                <Button 
                  type="submit" 
                  variant="gradient" 
                  size="lg" 
                  className="w-full"
                  disabled={registerTeacher.isPending}
                >
                  {registerTeacher.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    'إنشاء الحساب'
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
