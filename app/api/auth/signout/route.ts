import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log("🚪 [Signout] Starting user signout...");

    // Sign out user from Supabase
    const { error } = await supabase.auth.signOut();

    console.log("🔓 [Signout] Signout response:", { 
      error: error?.message 
    });

    if (error) {
      console.error("❌ [Signout] Signout error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ [Signout] User signed out successfully");

    // Clear session cookies and return success message
    const response = NextResponse.json({
      message: "Signed out successfully",
    });

    // Clear session cookies by setting them to expire immediately
    response.cookies.set("sb-access-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      expires: new Date(0), // Set expiry to past date
    });

    response.cookies.set("sb-refresh-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      expires: new Date(0), // Set expiry to past date
    });

    console.log("🍪 [Signout] Session cookies cleared");

    return response;

  } catch (error: any) {
    console.error("💥 [Signout] Unexpected error:", error);
    
    // Even if there's an error, still clear the cookies
    const response = NextResponse.json(
      { error: error.message || "An unexpected error occurred during signout" },
      { status: 500 }
    );

    // Clear cookies on error too
    response.cookies.set("sb-access-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
    });

    response.cookies.set("sb-refresh-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  }
}