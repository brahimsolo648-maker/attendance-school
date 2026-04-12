import { ReactNode, useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LoadingScreen from '@/components/LoadingScreen';

type RequiredRole = 'admin' | 'teacher' | 'any';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: RequiredRole;
  redirectTo?: string;
}

let cachedAuth: { userId: string; roles: string[] } | null = null;

const ProtectedRoute = ({ 
  children, 
  requiredRole = 'any',
  redirectTo = '/admin/login'
}: ProtectedRouteProps) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(!cachedAuth);
  const [isAuthenticated, setIsAuthenticated] = useState(!!cachedAuth);
  const [hasRequiredRole, setHasRequiredRole] = useState(() => {
    if (!cachedAuth) return false;
    if (requiredRole === 'any') return cachedAuth.roles.length > 0;
    return cachedAuth.roles.includes(requiredRole);
  });
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (cachedAuth) {
      const hasRole = requiredRole === 'any' 
        ? cachedAuth.roles.length > 0 
        : cachedAuth.roles.includes(requiredRole);
      setIsAuthenticated(true);
      setHasRequiredRole(hasRole);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          cachedAuth = null;
          if (isMounted.current) {
            setIsAuthenticated(false);
            setHasRequiredRole(false);
            setIsLoading(false);
          }
          return;
        }

        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        const roles = (rolesData || []).map(r => r.role);
        cachedAuth = { userId: session.user.id, roles };

        const hasRole = requiredRole === 'any' ? roles.length > 0 : roles.includes(requiredRole);

        if (isMounted.current) {
          setIsAuthenticated(true);
          setHasRequiredRole(hasRole);
          setIsLoading(false);
        }
      } catch {
        cachedAuth = null;
        if (isMounted.current) {
          setIsAuthenticated(false);
          setHasRequiredRole(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          cachedAuth = null;
          if (isMounted.current) {
            setIsAuthenticated(false);
            setHasRequiredRole(false);
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          cachedAuth = null;
          checkAuth();
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [requiredRole]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!hasRequiredRole) {
    if (requiredRole === 'admin') return <Navigate to="/admin/login" replace />;
    if (requiredRole === 'teacher') return <Navigate to="/teacher/auth" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
