import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'teacher';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
    isAdmin: false,
    isTeacher: false,
  });

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as AppRole | null;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setAuthState(prev => ({
              ...prev,
              role,
              isAdmin: role === 'admin',
              isTeacher: role === 'teacher',
              loading: false,
            }));
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            role: null,
            isAdmin: false,
            isTeacher: false,
            loading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setAuthState({
          session,
          user: session.user,
          role,
          isAdmin: role === 'admin',
          isTeacher: role === 'teacher',
          loading: false,
        });
      } else {
        setAuthState({
          session: null,
          user: null,
          role: null,
          isAdmin: false,
          isTeacher: false,
          loading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // Fetch role after successful sign in
    if (data.user) {
      const role = await fetchUserRole(data.user.id);
      setAuthState(prev => ({
        ...prev,
        role,
        isAdmin: role === 'admin',
        isTeacher: role === 'teacher',
      }));
    }

    return { data, error: null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setAuthState({
        session: null,
        user: null,
        role: null,
        isAdmin: false,
        isTeacher: false,
        loading: false,
      });
    }
    return { error };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
};
