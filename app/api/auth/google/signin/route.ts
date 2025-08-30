import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirect_to") || "/";

    console.log("🚀 [Google OAuth] Starting Google OAuth initiation...");

    // Generate Google OAuth URL via Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/google/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    console.log("🔗 [Google OAuth] OAuth response:", { data, error });

    if (error) {
      console.error("❌ [Google OAuth] OAuth initiation error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.url) {
      console.error("❌ [Google OAuth] No OAuth URL received from Supabase");
      return NextResponse.json({ error: "No OAuth URL received from Supabase" }, { status: 500 });
    }

    console.log("🌐 [Google OAuth] Redirecting to Google OAuth URL:", data.url);
    
    // Redirect user to Google OAuth
    return NextResponse.redirect(data.url);

  } catch (error: any) {
    console.error("💥 [Google OAuth] Initiation error:", error);
    const errorMessage = error.message || "Failed to initiate Google OAuth";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}