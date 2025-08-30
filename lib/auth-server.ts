import { NextRequest } from "next/server";
import { createClient } from "./supabase-server";
import { User } from "@supabase/supabase-js";

/**
 * Get the current authenticated user from the server-side request
 * This function reads HTTP-only cookies and validates the session
 */
export async function getCurrentUserFromRequest(): Promise<{
  user: User | null;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ [Auth Server] Get user error:", error);
      return { user: null, error };
    }

    return { user, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to get user");
    console.error("💥 [Auth Server] Unexpected error:", error);
    return { user: null, error };
  }
}

/**
 * Simplified version that works with the current setup using manual cookie parsing
 */
export async function getCurrentUserFromCookies(request: NextRequest): Promise<{
  user: User | null;
  error: Error | null;
}> {
  try {
    // Get cookies from the request
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return { user: null, error: new Error("No auth tokens found") };
    }

    // Create a client-side Supabase instance with the tokens
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Set the session with the tokens
    const { data: { user }, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("❌ [Auth Server] Session error:", error);
      return { user: null, error };
    }

    return { user, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to get user from cookies");
    console.error("💥 [Auth Server] Cookie auth error:", error);
    return { user: null, error };
  }
}