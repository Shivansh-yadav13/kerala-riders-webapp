import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const redirectTo = searchParams.get("redirect_to") || "/";

    console.log("📲 [Google OAuth] Callback received:", { 
      hasCode: !!code, 
      error,
      redirectTo 
    });

    // Handle OAuth errors
    if (error) {
      console.error("❌ [Google OAuth] OAuth error from Google:", error);
      const errorUrl = new URL("/auth/error", request.url);
      errorUrl.searchParams.set("error", error);
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!code) {
      console.error("❌ [Google OAuth] No authorization code received");
      const errorUrl = new URL("/auth/error", request.url);
      errorUrl.searchParams.set("error", "no_code");
      return NextResponse.redirect(errorUrl.toString());
    }

    // Exchange code for session
    console.log("💾 [Google OAuth] Exchanging code for session...");
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error("❌ [Google OAuth] Session exchange error:", sessionError);
      const errorUrl = new URL("/auth/error", request.url);
      errorUrl.searchParams.set("error", sessionError.message);
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!data.user || !data.session) {
      console.error("❌ [Google OAuth] No user or session data received");
      const errorUrl = new URL("/auth/error", request.url);
      errorUrl.searchParams.set("error", "no_user_data");
      return NextResponse.redirect(errorUrl.toString());
    }

    console.log("👤 [Google OAuth] User authenticated:", {
      id: data.user.id,
      email: data.user.email,
      providers: data.user.app_metadata?.providers || [],
    });

    // Check for provider conflicts
    const userProviders = data.user.app_metadata?.providers || [];
    const isExistingUser = 
      data.user.created_at !== data.user.updated_at ||
      data.user.user_metadata?.is_active !== undefined;

    console.log("🔍 [Google OAuth] User analysis:", {
      isExistingUser,
      providers: userProviders,
      createdAt: data.user.created_at,
      updatedAt: data.user.updated_at,
    });

    // Check if user exists with different provider (not Google)
    if (
      isExistingUser &&
      userProviders.length > 0 &&
      !userProviders.includes("google")
    ) {
      console.log("❌ [Google OAuth] User exists with different provider:", userProviders);
      
      // Sign out the Google session
      await supabase.auth.signOut();
      
      const errorUrl = new URL("/auth/error", request.url);
      errorUrl.searchParams.set("error", "provider_conflict");
      errorUrl.searchParams.set("message", "This email is already registered with a different login method. Please use your password to sign in.");
      return NextResponse.redirect(errorUrl.toString());
    }

    // Update user metadata for new users or incomplete profiles
    const shouldUpdateMetadata =
      !isExistingUser ||
      !data.user.user_metadata?.is_active ||
      !data.user.user_metadata?.full_name;

    if (shouldUpdateMetadata) {
      console.log("📝 [Google OAuth] Updating user metadata...");
      
      const userData = {
        full_name:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          "",
        is_active: true,
        is_data_consent: false,
        is_email_verified: true, // Google accounts are pre-verified
        is_mobile_verified: false,
        phone_number: null,
        gender: null,
        uae_emirate: null,
        city: null,
        kerala_district: null,
      };

      const { error: updateError } = await supabase.auth.updateUser({
        data: userData,
      });

      if (updateError) {
        console.error("❌ [Google OAuth] Failed to update user metadata:", updateError);
        // Don't fail the auth, just log the error
      } else {
        console.log("✅ [Google OAuth] User metadata updated successfully");
      }
    } else {
      console.log("✅ [Google OAuth] Existing user with complete metadata - skipping update");
    }

    console.log("🎯 [Google OAuth] Authentication successful, redirecting to:", redirectTo);

    // Set session cookies and redirect
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    
    // Set session cookies
    response.cookies.set("sb-access-token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    response.cookies.set("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log("✅ [Google OAuth] Session cookies set, authentication complete");

    return response;

  } catch (error: any) {
    console.error("💥 [Google OAuth] Callback error:", error);
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("error", error.message || "Authentication failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}