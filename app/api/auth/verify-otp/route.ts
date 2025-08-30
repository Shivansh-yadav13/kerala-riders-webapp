import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and OTP token are required" },
        { status: 400 }
      );
    }

    console.log("🔐 [OTP Verification] Starting OTP verification for:", email);

    // Verify OTP with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    console.log("✅ [OTP Verification] Verification response:", { 
      hasUser: !!data.user, 
      hasSession: !!data.session,
      error: error?.message 
    });

    if (error) {
      console.error("❌ [OTP Verification] Verification error:", error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes("Token has expired")) {
        errorMessage = "OTP token has expired. Please request a new one.";
      } else if (error.message.includes("Invalid token")) {
        errorMessage = "Invalid OTP token. Please check and try again.";
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (!data.user || !data.session) {
      console.error("❌ [OTP Verification] No user or session data received");
      return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }

    console.log("📝 [OTP Verification] Updating user metadata for email verification...");

    // Update user metadata to mark email as verified
    const { error: updateError } = await supabase.auth.updateUser({
      data: { is_email_verified: true },
    });

    if (updateError) {
      console.error("⚠️ [OTP Verification] Failed to update metadata:", updateError);
      // Don't fail the verification, just log the error
    } else {
      console.log("✅ [OTP Verification] User metadata updated successfully");
    }

    // Create updated user object with verified status
    const updatedUser = {
      ...data.user,
      user_metadata: {
        ...data.user.user_metadata,
        is_email_verified: true,
      },
    };

    console.log("✅ [OTP Verification] Email verified successfully for user:", data.user.id);

    // Set session cookies and return user data
    const response = NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        user_metadata: updatedUser.user_metadata,
        email_confirmed_at: updatedUser.email_confirmed_at,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      message: "Email verified successfully",
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

    console.log("🍪 [OTP Verification] Session cookies set for user:", data.user.id);

    return response;

  } catch (error: any) {
    console.error("💥 [OTP Verification] Unexpected error:", error);
    const errorMessage = error.message || "An unexpected error occurred during OTP verification";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}