import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { joinEvent } from "@/lib/events";
import { findOrCreateUser } from "@/lib/database";

/**
 * POST /api/events/[id]/join - Join an event
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
      console.error("❌ [Join Event API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find or create user in database
    const { user: dbUser, error: userError } = await findOrCreateUser(user);
    
    if (userError || !dbUser) {
      console.error("❌ [Join Event API] User database error:", userError);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 500 }
      );
    }

    console.log("🔗 [Join Event API] User", dbUser.krid, "joining event", id);

    // Join event
    const { participation, error } = await joinEvent(id, dbUser.krid);

    if (error) {
      console.error("❌ [Join Event API] Error joining event:", error);
      
      let status = 500;
      if (error.message.includes("not found")) {
        status = 404;
      } else if (error.message.includes("already participating")) {
        status = 409;
      } else if (error.message.includes("deadline has passed")) {
        status = 400;
      }
      
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    if (!participation) {
      return NextResponse.json(
        { error: "Failed to join event" },
        { status: 500 }
      );
    }

    console.log("✅ [Join Event API] User joined event successfully with status:", participation.status);

    // Prepare response message based on status
    let message = "Successfully joined the event";
    if (participation.status === 'waitlist') {
      message = "Successfully joined the event waitlist. You'll be automatically registered when a spot becomes available.";
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        participation,
        status: participation.status
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("💥 [Join Event API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}