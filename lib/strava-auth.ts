import axios from "axios";
import { supabase } from "./supabase";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || "173716";
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || "6a07e6d7563960d4d0596ed8d6ff3a7146b943b6";

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Check if Strava token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(expiresAt: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const bufferTime = 5 * 60; // 5 minutes buffer
  return currentTime >= (expiresAt - bufferTime);
}

/**
 * Refresh Strava access token using refresh token
 */
export async function refreshStravaToken(refreshToken: string): Promise<{
  data: StravaTokens | null;
  error: Error | null;
}> {
  try {
    console.log("🔄 [Strava Auth] Refreshing Strava access token...");

    const response = await axios.post("https://www.strava.com/oauth/token", {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: newRefreshToken, expires_at } = response.data;

    console.log("✅ [Strava Auth] Token refresh successful");

    return {
      data: {
        accessToken: access_token,
        refreshToken: newRefreshToken,
        expiresAt: expires_at,
      },
      error: null,
    };
  } catch (error: any) {
    console.error("❌ [Strava Auth] Token refresh failed:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Failed to refresh token"),
    };
  }
}

/**
 * Get valid Strava access token for a user, refreshing if necessary
 */
export async function getValidStravaToken(userId: string): Promise<{
  data: string | null;
  error: Error | null;
}> {
  try {
    console.log("🔍 [Strava Auth] Getting valid token for user:", userId);

    // Get user metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || user.id !== userId) {
      return {
        data: null,
        error: new Error("User not found or unauthorized"),
      };
    }

    const { 
      strava_access_token: accessToken,
      strava_refresh_token: refreshToken,
      strava_expires_at: expiresAt 
    } = user.user_metadata || {};

    if (!accessToken || !refreshToken) {
      return {
        data: null,
        error: new Error("No Strava credentials found"),
      };
    }

    // Check if token needs refresh
    if (!expiresAt || isTokenExpired(expiresAt)) {
      console.log("⚠️ [Strava Auth] Token expired or missing expiry, refreshing...");
      
      const { data: newTokens, error: refreshError } = await refreshStravaToken(refreshToken);
      
      if (refreshError || !newTokens) {
        return {
          data: null,
          error: refreshError || new Error("Failed to refresh token"),
        };
      }

      // Update user metadata with new tokens
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          strava_access_token: newTokens.accessToken,
          strava_refresh_token: newTokens.refreshToken,
          strava_expires_at: newTokens.expiresAt,
        },
      });

      if (updateError) {
        console.error("❌ [Strava Auth] Failed to update user metadata:", updateError);
        return {
          data: null,
          error: new Error("Failed to update credentials"),
        };
      }

      console.log("🔄✅ [Strava Auth] Token refreshed and updated");
      return { data: newTokens.accessToken, error: null };
    }

    console.log("✅ [Strava Auth] Token is still valid");
    return { data: accessToken, error: null };

  } catch (error: any) {
    console.error("💥 [Strava Auth] Unexpected error:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unexpected error"),
    };
  }
}

/**
 * Check if user has Strava connected
 */
export async function hasStravaConnected(userId: string): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user || user.id !== userId) {
      return false;
    }

    return !!(user.user_metadata?.strava_access_token && user.user_metadata?.strava_refresh_token);
  } catch (error) {
    console.error("Error checking Strava connection:", error);
    return false;
  }
}