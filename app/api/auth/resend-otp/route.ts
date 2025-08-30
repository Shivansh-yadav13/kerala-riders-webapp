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

    console.log("📧 [Resend OTP] Starting OTP resend for:", email);

    // Resend OTP via Supabase
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    console.log("📨 [Resend OTP] Resend response:", { 
      error: error?.message 
    });

    if (error) {
      console.error("❌ [Resend OTP] Resend error:", error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes("For security purposes")) {
        errorMessage = "Please wait before requesting another OTP";
      } else if (error.message.includes("User not found")) {
        errorMessage = "No account found with this email address";
      } else if (error.message.includes("Email rate limit exceeded")) {
        errorMessage = "Too many emails sent. Please wait before requesting another OTP";
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.log("✅ [Resend OTP] OTP resent successfully to:", email);

    return NextResponse.json({
      message: "OTP has been sent to your email address",
      email,
    });

  } catch (error: any) {
    console.error("💥 [Resend OTP] Unexpected error:", error);
    const errorMessage = error.message || "An unexpected error occurred while resending OTP";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}