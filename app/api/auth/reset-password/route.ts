import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("🔒 [Password Reset] Starting password reset for:", email);

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password-confirm`,
    });

    console.log("📧 [Password Reset] Reset email response:", { 
      error: error?.message 
    });

    if (error) {
      console.error("❌ [Password Reset] Reset error:", error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes("For security purposes")) {
        errorMessage = "Please wait before requesting another password reset";
      } else if (error.message.includes("User not found")) {
        errorMessage = "No account found with this email address";
      } else if (error.message.includes("Email rate limit exceeded")) {
        errorMessage = "Too many emails sent. Please wait before requesting another reset";
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.log("✅ [Password Reset] Password reset email sent to:", email);

    return NextResponse.json({
      message: "Password reset link has been sent to your email address",
      email,
    });

  } catch (error: any) {
    console.error("💥 [Password Reset] Unexpected error:", error);
    const errorMessage = error.message || "An unexpected error occurred while sending password reset email";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}