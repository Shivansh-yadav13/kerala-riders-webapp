import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

export interface UserMetadata {
  full_name?: string;
  is_active?: boolean;
  is_data_consent?: boolean;
  is_email_verified?: boolean;
  is_mobile_verified?: boolean;
  phone_number?: string | null;
  gender?: string | null;
  uae_emirate?: string | null;
  city?: string | null;
  kerala_district?: string | null;
}

export interface AuthResult {
  user: User | null;
  error: Error | null;
}

/**
 * Check if user is existing based on creation/update timestamps and metadata
 */
export function isExistingUser(user: User): boolean {
  return (
    user.created_at !== user.updated_at ||
    user.user_metadata?.is_active !== undefined
  );
}

/**
 * Check if user has provider conflict (exists with different auth provider)
 */
export function hasProviderConflict(user: User, currentProvider: string): boolean {
  const userProviders = user.app_metadata?.providers || [];
  const isExisting = isExistingUser(user);
  
  return (
    isExisting &&
    userProviders.length > 0 &&
    !userProviders.includes(currentProvider)
  );
}

/**
 * Check if user metadata needs updating
 */
export function shouldUpdateUserMetadata(user: User): boolean {
  const isExisting = isExistingUser(user);
  
  return (
    !isExisting ||
    !user.user_metadata?.is_active ||
    !user.user_metadata?.full_name
  );
}

/**
 * Create default user metadata for new users
 */
export function createDefaultUserMetadata(
  user: User,
  provider: 'google' | 'email' = 'email',
  overrides: Partial<UserMetadata> = {}
): UserMetadata {
  const baseMetadata: UserMetadata = {
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
    is_active: true,
    is_data_consent: false,
    is_email_verified: provider === 'google', // Google accounts are pre-verified
    is_mobile_verified: false,
    phone_number: null,
    gender: null,
    uae_emirate: null,
    city: null,
    kerala_district: null,
    ...overrides,
  };

  return baseMetadata;
}

/**
 * Update user metadata in Supabase
 */
export async function updateUserMetadata(
  metadata: UserMetadata
): Promise<{ error: Error | null }> {
  try {
    console.log("📝 [Auth Utils] Updating user metadata:", metadata);
    
    const { error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      console.error("❌ [Auth Utils] Failed to update user metadata:", error);
      return { error };
    }

    console.log("✅ [Auth Utils] User metadata updated successfully");
    return { error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to update metadata");
    console.error("💥 [Auth Utils] Update metadata error:", error);
    return { error };
  }
}

/**
 * Sign out user from Supabase
 */
export async function signOutUser(): Promise<{ error: Error | null }> {
  try {
    console.log("🚪 [Auth Utils] Signing out user...");
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("❌ [Auth Utils] Sign out error:", error);
      return { error };
    }

    console.log("✅ [Auth Utils] User signed out successfully");
    return { error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to sign out");
    console.error("💥 [Auth Utils] Sign out error:", error);
    return { error };
  }
}

/**
 * Get current authenticated user (client-side only)
 * For server-side, use getCurrentUserFromRequest from auth-server.ts
 */
export async function getCurrentUser(): Promise<{
  user: User | null;
  error: Error | null;
}> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ [Auth Utils] Get user error:", error);
      return { user: null, error };
    }

    return { user, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to get user");
    console.error("💥 [Auth Utils] Get user error:", error);
    return { user: null, error };
  }
}

/**
 * Check if current user has valid session
 */
export async function hasValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return !error && !!session;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
}

/**
 * Refresh current session
 */
export async function refreshSession(): Promise<{ error: Error | null }> {
  try {
    console.log("🔄 [Auth Utils] Refreshing session...");
    
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("❌ [Auth Utils] Session refresh error:", error);
      return { error };
    }

    console.log("✅ [Auth Utils] Session refreshed successfully");
    return { error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to refresh session");
    console.error("💥 [Auth Utils] Session refresh error:", error);
    return { error };
  }
}