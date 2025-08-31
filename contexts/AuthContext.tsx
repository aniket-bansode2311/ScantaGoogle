import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, type User } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { startMetric, endMetric } from '@/lib/performance';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Defer initial auth check to improve cold start
    const initAuth = async () => {
      startMetric('Auth Initialization');
      try {
        // Use faster session check first
        const { data: { session }, error } = await auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user && !error) {
          setUser(session.user as User);
          setSession(session);
        } else {
          // Fallback to getCurrentUser if no session
          const { data: { user }, error: userError } = await auth.getCurrentUser();
          if (user && !userError && mounted) {
            setUser(user as User);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          endMetric('Auth Initialization');
        }
      }
    };
    
    // Start auth initialization immediately but don't block
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        setUser(session.user as User);
        setSession(session);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        console.log('Signin error:', error);
        setLoading(false);
        return { error };
      }
      
      if (data.user) {
        console.log('User signed in successfully:', data.user.id);
        setUser(data.user as User);
        setSession(data.session);
      }
      
      setLoading(false);
      return { error: null };
    } catch (err) {
      console.error('Signin catch error:', err);
      setLoading(false);
      return { error: { message: 'Failed to sign in. Please try again.' } };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await auth.signUp(email, password);
      
      if (error) {
        console.log('Signup error:', error);
        setLoading(false);
        return { error };
      }
      
      if (data.user) {
        console.log('User created successfully:', data.user.id);
        setUser(data.user as User);
        setSession(data.session);
      }
      
      setLoading(false);
      return { error: null };
    } catch (err) {
      console.error('Signup catch error:', err);
      setLoading(false);
      return { error: { message: 'Failed to create account. Please try again.' } };
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }), [user, session, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}