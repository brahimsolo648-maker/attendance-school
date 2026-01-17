import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type RequiredRole = 'admin' | 'teacher' | 'any';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: RequiredRole;
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole = 'any',
  redirectTo = '/admin/login'
}: ProtectedRouteProps) => {
  const { user, loading: authLoading, isAdmin, isTeacher } = useAuth();
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setRoleChecked(true);
        return;
      }

      // If useAuth already has the role info, use it
      if (requiredRole === 'admin' && isAdmin) {
        setHasRequiredRole(true);
        setRoleChecked(true);
        return;
      }
      if (requiredRole === 'teacher' && isTeacher) {
        setHasRequiredRole(true);
        setRoleChecked(true);
        return;
      }
      if (requiredRole === 'any' && (isAdmin || isTeacher)) {
        setHasRequiredRole(true);
        setRoleChecked(true);
        return;
      }

      // Double-check from database directly
      try {
        if (requiredRole === 'admin') {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          setHasRequiredRole(!!data);
        } else if (requiredRole === 'teacher') {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'teacher')
            .maybeSingle();
          setHasRequiredRole(!!data);
        } else {
          // 'any' role - check if user has any role
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          setHasRequiredRole(!!data);
        }
      } catch (error) {
        console.error('Error checking role:', error);
        setHasRequiredRole(false);
      }
      setRoleChecked(true);
    };

    checkRole();
  }, [user, isAdmin, isTeacher, requiredRole]);

  if (authLoading || !roleChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole !== 'any' && !hasRequiredRole) {
    // Redirect based on required role
    if (requiredRole === 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    if (requiredRole === 'teacher') {
      return <Navigate to="/teacher/auth" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
