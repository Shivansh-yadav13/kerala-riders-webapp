import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { leaveEvent } from "@/lib/events";
import { findOrCreateUser } from "@/lib/database";

/**
 * POST /api/events/[id]/leave - Leave an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header with Bearer token required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ [Leave Event API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find or create user in database
    const { user: dbUser, error: userError } = await findOrCreateUser(user);
    
    if (userError || !dbUser) {
      console.error("❌ [Leave Event API] User database error:", userError);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 500 }
      );
    }

    console.log("🚪 [Leave Event API] User", dbUser.krid, "leaving event", id);

    // Leave event
    const { error } = await leaveEvent(id, dbUser.krid);

    if (error) {
      console.error("❌ [Leave Event API] Error leaving event:", error);
      
      let status = 500;
      if (error.message.includes("not participating")) {
        status = 400;
      }
      
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    console.log("✅ [Leave Event API] User left event successfully");

    return NextResponse.json({
      success: true,
      message: "Successfully left the event"
    });

  } catch (error: any) {
    console.error("💥 [Leave Event API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}