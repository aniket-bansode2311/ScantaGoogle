import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { auth, type User } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook((): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    auth.getCurrentUser().then(({ data: { user }, error }) => {
      if (user && !error) {
        setUser(user as User);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
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

  return useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }), [user, session, loading, signIn, signUp, signOut]);
});