import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("🚀 [Email Signin] Starting email signin for:", email);

    // Sign in user with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("🔐 [Email Signin] Signin response:", { 
      hasUser: !!data.user, 
      hasSession: !!data.session,
      error: error?.message 
    });

    if (error) {
      console.error("❌ [Email Signin] Signin error:", error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please confirm your email address before signing in";
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    if (!data.user || !data.session) {
      console.error("❌ [Email Signin] No user or session data received");
      return NextResponse.json({ error: "No user data received" }, { status: 500 });
    }

    console.log("✅ [Email Signin] User signed in successfully:", {
      userId: data.user.id,
      email: data.user.email,
      emailConfirmed: !!data.user.email_confirmed_at,
    });

    console.log("✅ [Email Signin] User signed in successfully:", data.user.id);

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      message: "Signed in successfully",
    });

  } catch (error: any) {
    console.error("💥 [Email Signin] Unexpected error:", error);
    const errorMessage = error.message || "An unexpected error occurred during signin";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}