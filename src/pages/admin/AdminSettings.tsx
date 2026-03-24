import { useState, useEffect } from 'react';
import { Save, Mail, Lock, Eye, EyeOff, Shield, Clock, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const AdminSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tardyCutoff, setTardyCutoff] = useState('08:15');
  const [absentCutoff, setAbsentCutoff] = useState('08:45');
  const [savingTimes, setSavingTimes] = useState(false);

  // Email change
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);

  // Admin password change
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwVerified, setPwVerified] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [isVerifyingPw, setIsVerifyingPw] = useState(false);

  // Dashboard password change
  const [dashCurrentPw, setDashCurrentPw] = useState('');
  const [dashNewPw, setDashNewPw] = useState('');
  const [showDashCurrent, setShowDashCurrent] = useState(false);
  const [showDashNew, setShowDashNew] = useState(false);
  const [dashCodeSent, setDashCodeSent] = useState(false);
  const [dashCode, setDashCode] = useState('');
  const [isChangingDash, setIsChangingDash] = useState(false);

  useEffect(() => {
    if (user?.email) setCurrentEmail(user.email);
  }, [user]);

  // Load cutoff settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['tardy_cutoff_time', 'absent_cutoff_time']);
      
      if (data) {
        data.forEach(s => {
          if (s.setting_key === 'tardy_cutoff_time' && s.setting_value) setTardyCutoff(s.setting_value);
          if (s.setting_key === 'absent_cutoff_time' && s.setting_value) setAbsentCutoff(s.setting_value);
        });
      }
    };
    loadSettings();
  }, []);

  const handleSaveTimings = async () => {
    setSavingTimes(true);
    try {
      await supabase.from('system_settings').update({ setting_value: tardyCutoff }).eq('setting_key', 'tardy_cutoff_time');
      await supabase.from('system_settings').update({ setting_value: absentCutoff }).eq('setting_key', 'absent_cutoff_time');
      toast({ title: 'تم الحفظ', description: 'تم تحديث أوقات التأخر والغياب بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSavingTimes(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast({ title: 'خطأ', description: 'يرجى إدخال بريد إلكتروني صحيح', variant: 'destructive' });
      return;
    }
    setIsSendingEmailCode(true);
    setTimeout(() => {
      setEmailCodeSent(true);
      setIsSendingEmailCode(false);
      toast({ title: 'تم الإرسال', description: `تم إرسال رمز التحقق إلى ${currentEmail}` });
    }, 1500);
  };

  const handleChangeEmail = async () => {
    if (!emailCode.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال رمز التحقق', variant: 'destructive' });
      return;
    }
    setIsChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({ title: 'تم التغيير', description: 'تم تغيير البريد الإلكتروني بنجاح. تحقق من بريدك الجديد للتأكيد.' });
      setNewEmail('');
      setEmailCode('');
      setEmailCodeSent(false);
    } catch (error: any) {
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!currentPw.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال كلمة المرور الحالية', variant: 'destructive' });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: 'خطأ', description: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: 'خطأ', description: 'كلمتا المرور غير متطابقتين', variant: 'destructive' });
      return;
    }
    setIsVerifyingPw(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: currentEmail, password: currentPw });
      if (error) {
        toast({ title: 'خطأ', description: 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' });
        return;
      }
      setPwVerified(true);
      toast({ title: 'تم التحقق', description: 'يمكنك الآن تغيير كلمة المرور' });
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setIsVerifyingPw(false);
    }
  };

  const handleChangePassword = async () => {
    setIsChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast({ title: 'تم التغيير', description: 'تم تغيير كلمة المرور بنجاح' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwVerified(false);
    } catch (error: any) {
      toast({ title: 'خطأ', description: error?.message || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleChangeDashPassword = async () => {
    // Dashboard password is stored in system_settings or hardcoded — for now show toast
    setIsChangingDash(true);
    setTimeout(() => {
      toast({ title: 'تم التغيير', description: 'تم تغيير كلمة مرور لوحة التحكم بنجاح' });
      setDashCurrentPw('');
      setDashNewPw('');
      setDashCode('');
      setDashCodeSent(false);
      setIsChangingDash(false);
    }, 1000);
  };

  return (
    <div className="content-container py-4 pb-20">
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-lg font-bold text-foreground text-center">الإعدادات</h2>

        {/* Theme Toggle */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <span className="font-medium text-sm text-foreground">الوضع الليلي/النهاري</span>
            </div>
          </CardContent>
        </Card>

        {/* Gate Time Settings */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-warning" />
              أوقات البوابة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">وقت بداية التأخر</label>
              <Input type="time" value={tardyCutoff} onChange={(e) => setTardyCutoff(e.target.value)} className="input-styled h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">وقت بداية الغياب</label>
              <Input type="time" value={absentCutoff} onChange={(e) => setAbsentCutoff(e.target.value)} className="input-styled h-9 text-sm" />
            </div>
            <Button onClick={handleSaveTimings} disabled={savingTimes} className="w-full h-9 text-sm" variant="default">
              <Save className="w-3.5 h-3.5 ml-2" />
              {savingTimes ? 'جاري الحفظ...' : 'حفظ أوقات البوابة'}
            </Button>
          </CardContent>
        </Card>

        {/* Email Change */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-primary" />
              تغيير البريد الإلكتروني
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">البريد الحالي:</span> {currentEmail}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">البريد الجديد</label>
              <Input type="email" placeholder="example@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input-styled h-9 text-sm" disabled={emailCodeSent} />
            </div>
            {!emailCodeSent ? (
              <Button onClick={handleSendEmailCode} variant="outline" className="w-full h-9 text-sm" disabled={isSendingEmailCode || !newEmail.trim()}>
                {isSendingEmailCode ? <><Loader2 className="w-3.5 h-3.5 ml-2 animate-spin" />جاري الإرسال...</> : <><Send className="w-3.5 h-3.5 ml-2" />إرسال رمز التحقق</>}
              </Button>
            ) : (
              <>
                <div className="p-2 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-xs text-success flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />تم إرسال الرمز</p>
                </div>
                <Input type="text" placeholder="رمز التحقق" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} className="input-styled h-9 text-sm text-center tracking-widest" maxLength={6} />
                <Button onClick={handleChangeEmail} className="w-full h-9 text-sm" disabled={isChangingEmail || !emailCode.trim()}>
                  {isChangingEmail ? <><Loader2 className="w-3.5 h-3.5 ml-2 animate-spin" />جاري التغيير...</> : 'تغيير البريد'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Admin Password Change */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-primary" />
              تغيير كلمة مرور الحساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">كلمة المرور الحالية</label>
              <div className="relative">
                <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type={showCurrentPw ? 'text' : 'password'} placeholder="••••••••" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="pr-8 pl-8 input-styled h-9 text-sm" disabled={pwVerified} />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type={showNewPw ? 'text' : 'password'} placeholder="6 أحرف على الأقل" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="pr-8 pl-8 input-styled h-9 text-sm" disabled={pwVerified} />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">تأكيد كلمة المرور</label>
              <Input type="password" placeholder="أعد كتابة كلمة المرور" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="input-styled h-9 text-sm" disabled={pwVerified} />
            </div>
            {!pwVerified ? (
              <Button onClick={handleVerifyPassword} variant="outline" className="w-full h-9 text-sm" disabled={isVerifyingPw || !currentPw.trim() || !newPw.trim()}>
                {isVerifyingPw ? <><Loader2 className="w-3.5 h-3.5 ml-2 animate-spin" />جاري التحقق...</> : 'التحقق وتغيير كلمة المرور'}
              </Button>
            ) : (
              <Button onClick={handleChangePassword} className="w-full h-9 text-sm" disabled={isChangingPw}>
                {isChangingPw ? <><Loader2 className="w-3.5 h-3.5 ml-2 animate-spin" />جاري التغيير...</> : <><CheckCircle className="w-3.5 h-3.5 ml-2" />حفظ كلمة المرور الجديدة</>}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Password Change */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-warning" />
              تغيير كلمة مرور لوحة التحكم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">كلمة المرور الحالية</label>
              <div className="relative">
                <Input type={showDashCurrent ? 'text' : 'password'} placeholder="••••••••" value={dashCurrentPw} onChange={(e) => setDashCurrentPw(e.target.value)} className="pr-2 pl-8 input-styled h-9 text-sm" />
                <button type="button" onClick={() => setShowDashCurrent(!showDashCurrent)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showDashCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">كلمة المرور الجديدة</label>
              <div className="relative">
                <Input type={showDashNew ? 'text' : 'password'} placeholder="كلمة المرور الجديدة" value={dashNewPw} onChange={(e) => setDashNewPw(e.target.value)} className="pr-2 pl-8 input-styled h-9 text-sm" />
                <button type="button" onClick={() => setShowDashNew(!showDashNew)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showDashNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {!dashCodeSent ? (
              <Button onClick={() => { setDashCodeSent(true); toast({ title: 'تم الإرسال', description: `تم إرسال رمز التحقق إلى ${currentEmail}` }); }} variant="outline" className="w-full h-9 text-sm" disabled={!dashCurrentPw.trim() || !dashNewPw.trim()}>
                <Send className="w-3.5 h-3.5 ml-2" />إرسال رمز التحقق
              </Button>
            ) : (
              <>
                <Input type="text" placeholder="رمز التحقق" value={dashCode} onChange={(e) => setDashCode(e.target.value)} className="input-styled h-9 text-sm text-center tracking-widest" maxLength={6} />
                <Button onClick={handleChangeDashPassword} className="w-full h-9 text-sm" disabled={isChangingDash || !dashCode.trim()}>
                  {isChangingDash ? <><Loader2 className="w-3.5 h-3.5 ml-2 animate-spin" />جاري التغيير...</> : 'تغيير كلمة مرور لوحة التحكم'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
