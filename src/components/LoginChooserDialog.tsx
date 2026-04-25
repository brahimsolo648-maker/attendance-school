import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LoginChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginChooserDialog = ({ open, onOpenChange }: LoginChooserDialogProps) => {
  const navigate = useNavigate();

  const go = (path: string) => {
    onOpenChange(false);
    setTimeout(() => navigate(path), 80);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-md rounded-2xl border-2 border-border bg-card p-6 sm:p-7"
      >
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-2xl font-bold text-foreground text-center">
            تسجيل الدخول إلى SchoolOS
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-base">
            اختر نوع الحساب الذي تريد الدخول به
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Teacher */}
          <button
            onClick={() => go('/teacher/auth')}
            className="w-full text-right group rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all p-4 flex items-center gap-4 active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-md shrink-0">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-base">الدخول كأستاذ</h3>
              <p className="text-xs text-muted-foreground mt-0.5">للأساتذة المسجّلين بالنظام</p>
            </div>
          </button>

          {/* Admin */}
          <button
            onClick={() => go('/admin/login')}
            className="w-full text-right group rounded-2xl border-2 border-accent/40 bg-accent/30 hover:bg-accent/50 hover:border-accent transition-all p-4 flex items-center gap-4 active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center shadow-md shrink-0">
              <Shield className="w-7 h-7 text-background" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-base">الدخول كإداري</h3>
              <p className="text-xs text-muted-foreground mt-0.5">للمسؤولين عن إدارة النظام</p>
            </div>
          </button>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginChooserDialog;