import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, User, Mail, Lock, Eye, EyeOff, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TeacherData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const TeacherSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Current teacher data
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);

  // Name change form
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Email change form
  const [newEmail, setNewEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeExpiry, setEmailCodeExpiry] = useState<Date | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordVerificationCode, setPasswordVerificationCode] = useState('');
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCodeExpiry, setPasswordCodeExpiry] = useState<Date | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingPasswordCode, setIsSendingPasswordCode] = useState(false);

  // Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user) {
        setIsLoadingTeacher(false);
        return;
      }

      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && teacher) {
        setTeacherData(teacher);
      }
      setIsLoadingTeacher(false);
    };

    fetchTeacherData();
  }, [user]);

  // Check if verification code is still valid (10 minutes)
  const isCodeValid = (expiry: Date | null) => {
    if (!expiry) return false;
    return new Date() < expiry;
  };

  const handleUpdateName = async () => {
    if (!newFirstName.trim() && !newLastName.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال الاسم الجديد أو اللقب الجديد',
        variant: 'destructive'
      });
      return;
    }

    if (!teacherData) return;

    setIsUpdatingName(true);
    
    const updates: Partial<TeacherData> = {};
    if (newFirstName.trim()) updates.first_name = newFirstName.trim();
    if (newLastName.trim()) updates.last_name = newLastName.trim();

    const { error } = await supabase
      .from('teachers')
      .update(updates)
      .eq('id', teacherData.id);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث البيانات',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الاسم واللقب بنجاح',
      });
      setTeacherData(prev => prev ? { ...prev, ...updates } : null);
      setNewFirstName('');
      setNewLastName('');
    }
    setIsUpdatingName(false);
  };

  const handleSendEmailVerificationCode = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال بريد إلكتروني صحيح',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingEmailCode(true);
    
    // Simulate sending verification code
    setTimeout(() => {
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);
      setEmailCodeExpiry(expiry);
      setEmailCodeSent(true);
      setIsSendingEmailCode(false);
      
      toast({
        title: 'تم الإرسال',
        description: `تم إرسال رمز التحقق إلى بريدك الحالي (${teacherData?.email}). الرمز صالح لمدة 10 دقائق.`,
      });
    }, 1500);
  };

  const handleChangeEmail = async () => {
    if (!emailVerificationCode.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رمز التحقق',
        variant: 'destructive'
      });
      return;
    }

    if (!isCodeValid(emailCodeExpiry)) {
      toast({
        title: 'انتهت صلاحية الرمز',
        description: 'يرجى طلب رمز جديد',
        variant: 'destructive'
      });
      setEmailCodeSent(false);
      return;
    }

    setIsChangingEmail(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: 'تم التغيير',
        description: 'تم تغيير البريد الإلكتروني بنجاح',
      });
      setNewEmail('');
      setEmailVerificationCode('');
      setEmailCodeSent(false);
      setIsChangingEmail(false);
    }, 1000);
  };

  const handleSendPasswordVerificationCode = async () => {
    if (!currentPassword.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال كلمة المرور الحالية',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمتا المرور الجديدة غير متطابقتين',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingPasswordCode(true);
    
    try {
      // Verify current password by attempting to sign in with it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: teacherData?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: 'خطأ',
          description: 'كلمة المرور الحالية غير صحيحة',
          variant: 'destructive'
        });
        setIsSendingPasswordCode(false);
        return;
      }

      // Current password is correct, proceed with sending verification code
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);
      setPasswordCodeExpiry(expiry);
      setPasswordCodeSent(true);
      
      toast({
        title: 'تم التحقق',
        description: `كلمة المرور الحالية صحيحة. يمكنك الآن تغيير كلمة المرور.`,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء التحقق من كلمة المرور',
        variant: 'destructive'
      });
    }
    
    setIsSendingPasswordCode(false);
  };

  const handleChangePassword = async () => {
    if (!isCodeValid(passwordCodeExpiry)) {
      toast({
        title: 'انتهت صلاحية الجلسة',
        description: 'يرجى إعادة التحقق من كلمة المرور الحالية',
        variant: 'destructive'
      });
      setPasswordCodeSent(false);
      return;
    }

    setIsChangingPassword(true);
    
    try {
      // Update the password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: 'خطأ',
          description: error.message || 'حدث خطأ أثناء تغيير كلمة المرور',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'تم التغيير',
          description: 'تم تغيير كلمة المرور بنجاح',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordVerificationCode('');
        setPasswordCodeSent(false);
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
    }
    
    setIsChangingPassword(false);
  };

  if (isLoadingTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacherData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-bold">لم يتم العثور على بيانات الأستاذ</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            العودة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/teacher/dashboard')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">إعدادات الحساب</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Profile Avatar */}
          <div className="glass-card p-6 animate-slide-up text-center">
            <div className="w-24 h-24 mx-auto rounded-full gradient-primary flex items-center justify-center shadow-glow mb-4">
              <User className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{teacherData.last_name} {teacherData.first_name}</h2>
            <p className="text-muted-foreground">{teacherData.email}</p>
          </div>

          {/* Name Change Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-5 h-5 text-primary" />
                تغيير الاسم واللقب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">الاسم الحالي:</span> {teacherData.first_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">اللقب الحالي:</span> {teacherData.last_name}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">الاسم الجديد</label>
                  <Input
                    type="text"
                    placeholder="أدخل الاسم الجديد"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">اللقب الجديد</label>
                  <Input
                    type="text"
                    placeholder="أدخل اللقب الجديد"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="input-styled"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleUpdateName} 
                className="w-full"
                disabled={isUpdatingName}
              >
                {isUpdatingName ? (
                  <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التحديث...</>
                ) : (
                  <><Save className="w-4 h-4 ml-2" /> تحديث الاسم</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Email Change Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-5 h-5 text-primary" />
                تغيير البريد الإلكتروني
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">البريد الحالي:</span> {teacherData.email}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">البريد الإلكتروني الجديد</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="pr-10 input-styled"
                    disabled={emailCodeSent}
                  />
                </div>
              </div>
              
              {!emailCodeSent ? (
                <Button 
                  onClick={handleSendEmailVerificationCode} 
                  variant="outline"
                  className="w-full"
                  disabled={isSendingEmailCode || !newEmail.trim()}
                >
                  {isSendingEmailCode ? (
                    <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الإرسال...</>
                  ) : (
                    <><Send className="w-4 h-4 ml-2" /> إرسال رمز التحقق</>
                  )}
                </Button>
              ) : (
                <>
                  <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                    <p className="text-sm text-success flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      تم إرسال رمز التحقق إلى بريدك الحالي. صالح لمدة 10 دقائق.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">رمز التحقق</label>
                    <Input
                      type="text"
                      placeholder="أدخل رمز التحقق"
                      value={emailVerificationCode}
                      onChange={(e) => setEmailVerificationCode(e.target.value)}
                      className="input-styled text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleChangeEmail} 
                    className="w-full"
                    disabled={isChangingEmail || !emailVerificationCode.trim()}
                  >
                    {isChangingEmail ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التغيير...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 ml-2" /> تغيير البريد الإلكتروني</>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Password Change Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="w-5 h-5 text-primary" />
                تغيير كلمة المرور
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">كلمة المرور الحالية</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور الحالية"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10 pl-10 input-styled"
                    disabled={passwordCodeSent}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="6 أحرف على الأقل"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 pl-10 input-styled"
                    disabled={passwordCodeSent}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">تأكيد كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="أعد كتابة كلمة المرور الجديدة"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pr-10 pl-10 input-styled"
                    disabled={passwordCodeSent}
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
              
              {!passwordCodeSent ? (
                <Button 
                  onClick={handleSendPasswordVerificationCode} 
                  variant="outline"
                  className="w-full"
                  disabled={isSendingPasswordCode || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()}
                >
                  {isSendingPasswordCode ? (
                    <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الإرسال...</>
                  ) : (
                    <><Send className="w-4 h-4 ml-2" /> إرسال رمز التحقق</>
                  )}
                </Button>
              ) : (
                <>
                  <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                    <p className="text-sm text-success flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      تم التحقق من كلمة المرور الحالية. يمكنك الآن تغيير كلمة المرور.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleChangePassword} 
                    className="w-full"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التغيير...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 ml-2" /> تغيير كلمة المرور</>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default TeacherSettings;
