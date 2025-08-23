import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  formatted_content?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Profile helpers
export const profiles = {
  create: async (userId: string, email: string, fullName?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ 
          id: userId, 
          email, 
          full_name: fullName || '' 
        }])
        .select()
        .single();
      return { data, error };
    } catch (err) {
      console.error('Profile creation error:', err);
      return { data: null, error: { message: 'Failed to create profile' } };
    }
  },

  getById: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return { data, error };
    } catch (err) {
      console.error('Profile fetch error:', err);
      return { data: null, error: { message: 'Failed to fetch profile' } };
    }
  },

  update: async (userId: string, updates: { email?: string; full_name?: string; avatar_url?: string }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      return { data, error };
    } catch (err) {
      console.error('Profile update error:', err);
      return { data: null, error: { message: 'Failed to update profile' } };
    }
  },
};

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, fullName?: string) => {
    try {
      console.log('Attempting to sign up with email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          }
        }
      });
      
      if (error) {
        console.log('Supabase auth signup error:', error);
        return { data, error };
      }
      
      console.log('Supabase auth signup successful:', data.user?.id);
      
      // The trigger should handle profile creation automatically
      // But as a fallback, we can create it manually if needed
      if (data.user && data.user.id && data.user.email_confirmed_at) {
        // Only try to create profile if email is confirmed
        try {
          const { error: profileError } = await profiles.create(
            data.user.id, 
            email, 
            fullName
          );
          if (profileError && !profileError.message?.includes('duplicate')) {
            console.warn('Profile creation failed, but user was created:', profileError);
          }
        } catch (profileErr) {
          console.warn('Profile creation error (non-critical):', profileErr);
          // Don't fail the signup if profile creation fails
        }
      }
      
      return { data, error };
    } catch (err) {
      console.error('Auth signup catch error:', err);
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'Failed to create account' 
        } 
      };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Supabase auth signin error:', error);
        return { data, error };
      }

      // Check if profile exists, create if missing
      if (data.user && data.user.id) {
        const { data: profile, error: profileError } = await profiles.getById(data.user.id);
        if (profileError || !profile) {
          // Profile doesn't exist, create it
          await profiles.create(data.user.id, data.user.email || email);
        }
      }

      return { data, error };
    } catch (err) {
      console.error('Auth signin catch error:', err);
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'Failed to sign in' 
        } 
      };
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      console.error('Auth signout error:', err);
      return { error: { message: 'Failed to sign out' } };
    }
  },

  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  getSession: () => {
    return supabase.auth.getSession();
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app-scheme://reset-password', // Update with your app scheme
      });
      return { error };
    } catch (err) {
      console.error('Password reset error:', err);
      return { error: { message: 'Failed to send reset email' } };
    }
  },
};

// Document helpers
export const documents = {
  create: async (document: Omit<Document, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([document])
        .select()
        .single();
      return { data, error };
    } catch (err) {
      console.error('Document creation error:', err);
      return { data: null, error: { message: 'Failed to create document' } };
    }
  },

  getAll: async (userId: string, options?: { limit?: number; offset?: number }) => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      return { data, error };
    } catch (err) {
      console.error('Documents fetch error:', err);
      return { data: null, error: { message: 'Failed to fetch documents' } };
    }
  },

  getCount: async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return { count, error };
    } catch (err) {
      console.error('Documents count error:', err);
      return { count: null, error: { message: 'Failed to get document count' } };
    }
  },

  getById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    } catch (err) {
      console.error('Document fetch error:', err);
      return { data: null, error: { message: 'Failed to fetch document' } };
    }
  },

  update: async (id: string, updates: Partial<Omit<Document, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    } catch (err) {
      console.error('Document update error:', err);
      return { data: null, error: { message: 'Failed to update document' } };
    }
  },

  delete: async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      return { error };
    } catch (err) {
      console.error('Document deletion error:', err);
      return { error: { message: 'Failed to delete document' } };
    }
  },

  search: async (userId: string, query: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (err) {
      console.error('Document search error:', err);
      return { data: null, error: { message: 'Failed to search documents' } };
    }
  },
};

// Storage helpers (if using Supabase storage)
export const storage = {
  uploadImage: async (userId: string, file: File | Blob, fileName: string) => {
    try {
      const fileExt = fileName.split('.').pop();
      const uniqueFileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('document-images')
        .upload(uniqueFileName, file);
      
      if (error) {
        return { data: null, error };
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('document-images')
        .getPublicUrl(uniqueFileName);
      
      return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
    } catch (err) {
      console.error('Image upload error:', err);
      return { data: null, error: { message: 'Failed to upload image' } };
    }
  },

  deleteImage: async (path: string) => {
    try {
      const { error } = await supabase.storage
        .from('document-images')
        .remove([path]);
      return { error };
    } catch (err) {
      console.error('Image deletion error:', err);
      return { error: { message: 'Failed to delete image' } };
    }
  },
};

// Utility function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
};

// Export the supabase client as default
export default supabase;