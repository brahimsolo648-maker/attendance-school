import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Mail, Lock, Eye, EyeOff, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';

const ControlPanelSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [tardyCutoff, setTardyCutoff] = useState('08:15');
  const [absentCutoff, setAbsentCutoff] = useState('08:45');
  const [savingTimes, setSavingTimes] = useState(false);

  const [formData, setFormData] = useState({
    currentEmail: 'brahimsolo648@gmail.com',
    currentPassword: '',
    newEmail: '',
    newPassword: ''
  });

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'تم الحفظ',
      description: 'تم تحديث بيانات الإدارة بنجاح',
    });
    navigate('/admin/control-panel/dashboard');
  };

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate('/admin/control-panel/dashboard')}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">الإعدادات</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Theme Toggle */}
          <div className="glass-card p-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">الوضع الليلي/النهاري</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Time Cutoff Settings */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground">أوقات البوابة</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">وقت بداية التأخر</label>
                <Input
                  type="time"
                  value={tardyCutoff}
                  onChange={(e) => setTardyCutoff(e.target.value)}
                  className="input-styled"
                />
                <p className="text-xs text-muted-foreground">المسح قبل هذا الوقت = حاضر</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">وقت بداية الغياب</label>
                <Input
                  type="time"
                  value={absentCutoff}
                  onChange={(e) => setAbsentCutoff(e.target.value)}
                  className="input-styled"
                />
                <p className="text-xs text-muted-foreground">المسح بعد هذا الوقت = غائب</p>
              </div>

              <Button onClick={handleSaveTimings} disabled={savingTimes} className="w-full" variant="default">
                <Save className="w-4 h-4 ml-2" />
                {savingTimes ? 'جاري الحفظ...' : 'حفظ أوقات البوابة'}
              </Button>
            </div>
          </div>

          {/* Admin Credentials */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-lg font-bold text-foreground">تغيير بيانات الإدارة</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">البريد الحالي</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={formData.currentEmail}
                    onChange={(e) => setFormData({ ...formData, currentEmail: e.target.value })}
                    className="pr-10 input-styled"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">كلمة المرور الحالية</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور الحالية"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="pr-10 pl-10 input-styled"
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

              <hr className="border-border" />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">البريد الجديد</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="اتركه فارغاً للإبقاء على البريد الحالي"
                    value={formData.newEmail}
                    onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                    className="pr-10 input-styled"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="pr-10 pl-10 input-styled"
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

              <Button type="submit" variant="gradient" size="lg" className="w-full">
                <Save className="w-5 h-5 ml-2" />
                حفظ التغييرات
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ControlPanelSettings;
