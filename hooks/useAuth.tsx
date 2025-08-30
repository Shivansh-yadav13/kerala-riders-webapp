'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    is_active?: boolean;
    is_email_verified?: boolean;
    is_mobile_verified?: boolean;
    phone_number?: string | null;
    gender?: string | null;
    uae_emirate?: string | null;
    city?: string | null;
    kerala_district?: string | null;
    strava_access_token?: string;
    strava_refresh_token?: string;
    strava_athlete_id?: string;
    strava_expires_at?: number;
  };
  email_confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  requiresEmailVerification: boolean;
  pendingVerificationEmail: string | null;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  signInWithGoogle: () => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  resendOTP: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  connectStrava: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
    requiresEmailVerification: false,
    pendingVerificationEmail: null,
  });

  // Initialize auth state on mount and listen for auth changes
  useEffect(() => {
    // Handle OAuth callback if there are tokens in the URL
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        try {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
          } else if (data.session) {
            // Clear the tokens from URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
        }
      }
    };

    handleOAuthCallback();
    checkAuthStatus();

    // Listen for auth state changes (important for OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setState(prev => ({
            ...prev,
            user: session.user,
            isAuthenticated: true,
            loading: false,
            error: null,
            requiresEmailVerification: false,
            pendingVerificationEmail: null,
          }));
        } else if (event === 'SIGNED_OUT') {
          setState(prev => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            requiresEmailVerification: false,
            pendingVerificationEmail: null,
          }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Try to get the current session from Supabase directly
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        }));
        return;
      }

      if (session && session.user) {
        setState(prev => ({
          ...prev,
          user: session.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      }));
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use Supabase directly for authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        setState(prev => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        }));
        return { success: true };
      } else {
        const errorMessage = 'No user data received';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during sign in';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, userData = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use Supabase directly for sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: null,
          requiresEmailVerification: true,
          pendingVerificationEmail: email,
        }));
        return { success: true, requiresVerification: true };
      } else if (data.user && data.session) {
        setState(prev => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        }));
        return { success: true };
      } else {
        const errorMessage = 'No user data received';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during sign up';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use Supabase directly for Google OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Google sign in failed',
      }));
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use Supabase directly for OTP verification
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        setState(prev => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
          requiresEmailVerification: false,
          pendingVerificationEmail: null,
        }));
        return { success: true };
      } else {
        const errorMessage = 'OTP verification failed';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during OTP verification';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const resendOTP = async (email: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use Supabase directly to resend OTP
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      setState(prev => ({ ...prev, loading: false }));

      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Network error while resending OTP';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use Supabase directly for password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      setState(prev => ({ ...prev, loading: false }));

      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during password reset';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use Supabase directly for profile update
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data.user) {
        setState(prev => ({
          ...prev,
          user: data.user,
          loading: false,
          error: null,
        }));
        return { success: true };
      } else {
        const errorMessage = 'Failed to update profile';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during profile update';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await supabase.auth.signOut();

      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        requiresEmailVerification: false,
        pendingVerificationEmail: null,
      }));

      return { success: true };
    } catch (error: any) {
      // Even if the API call fails, clear the local state
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      }));
      return { success: true };
    }
  };

  const connectStrava = () => {
    if (!state.user) {
      setState(prev => ({ ...prev, error: 'Must be authenticated to connect Strava' }));
      return;
    }
    
    const currentUrl = window.location.pathname;
    const redirectUrl = currentUrl !== '/' ? currentUrl : '/';
    window.location.href = `/api/auth/strava/connect?user_id=${state.user.id}&redirect_to=${encodeURIComponent(redirectUrl)}`;
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signInWithGoogle,
    verifyOTP,
    resendOTP,
    resetPassword,
    updateProfile,
    signOut,
    connectStrava,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}