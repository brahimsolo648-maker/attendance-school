import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // Get session directly - most reliable
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (isMounted) {
            setIsAuthenticated(false);
            setHasRequiredRole(false);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
        }

        // Check role from user_roles table
        if (requiredRole === 'any') {
          // Just need any role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (isMounted) {
            setHasRequiredRole(!!roleData);
            setIsLoading(false);
          }
        } else {
          // Check for specific role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', requiredRole)
            .maybeSingle();
          
          if (isMounted) {
            setHasRequiredRole(!!roleData);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setHasRequiredRole(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setIsAuthenticated(false);
            setHasRequiredRole(false);
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Re-check role on sign in
          checkAuth();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [requiredRole]);

  if (isLoading) {
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
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Authenticated but missing required role
  if (!hasRequiredRole) {
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
