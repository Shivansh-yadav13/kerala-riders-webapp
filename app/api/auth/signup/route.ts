import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, password, userData = {} } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("🚀 [Email Signup] Starting email signup for:", email);

    // Sign up user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });

    console.log("📝 [Email Signup] Signup response:", { 
      hasUser: !!data.user, 
      hasSession: !!data.session,
      error: error?.message 
    });

    if (error) {
      console.error("❌ [Email Signup] Signup error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Check if user needs email confirmation
    if (data.user && !data.session) {
      console.log("📧 [Email Signup] Email confirmation required for user:", data.user.id);
      return NextResponse.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
        message: "Please check your email to confirm your account",
        requiresConfirmation: true,
      });
    }

    // User is immediately signed in (email confirmation disabled)
    if (data.user && data.session) {
      console.log("✅ [Email Signup] User signed up and logged in immediately:", data.user.id);
      
      // Set session cookies
      const response = NextResponse.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
          email_confirmed_at: data.user.email_confirmed_at,
        },
        message: "Account created successfully",
      });

      // Set secure HTTP-only cookies
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

      return response;
    }

    // Fallback case
    return NextResponse.json({
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
      } : null,
      error: "Signup completed but no session created",
    });

  } catch (error: any) {
    console.error("💥 [Email Signup] Unexpected error:", error);
    const errorMessage = error.message || "An unexpected error occurred during signup";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}