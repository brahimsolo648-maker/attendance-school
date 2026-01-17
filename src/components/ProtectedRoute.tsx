import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  const { user, loading, isAdmin, isTeacher } = useAuth();
  const location = useLocation();

  if (loading) {
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
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === 'teacher' && !isTeacher) {
    return <Navigate to="/" replace />;
  }

  // For 'any' role, just being authenticated is enough
  return <>{children}</>;
};

export default ProtectedRoute;
