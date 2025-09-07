import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserEvents } from "@/lib/events";
import { findOrCreateUser } from "@/lib/database";

/**
 * GET /api/users/[krid]/events - Get user's events (created and joined)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { krid: string } }
) {
  try {
    const { krid } = params;

    if (!krid) {
      return NextResponse.json(
        { error: "User KRID is required" },
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
      console.error("❌ [User Events API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find or create user in database
    const { user: dbUser, error: userError } = await findOrCreateUser(user);
    
    if (userError || !dbUser) {
      console.error("❌ [User Events API] User database error:", userError);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 500 }
      );
    }

    // Check if authenticated user is requesting their own events or if it's a public request
    const { searchParams } = new URL(request.url);
    const includePrivate = searchParams.get("includePrivate") === "true";
    
    // Only allow access to private events if the authenticated user matches the requested KRID
    const isOwnProfile = dbUser.krid === krid;
    
    if (includePrivate && !isOwnProfile) {
      return NextResponse.json(
        { error: "Access denied. You can only view your own private event data." },
        { status: 403 }
      );
    }

    console.log("📋 [User Events API] Fetching events for user:", krid);

    // Get user events
    const { createdEvents, joinedEvents, error } = await getUserEvents(krid);

    if (error) {
      console.error("❌ [User Events API] Error fetching user events:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ [User Events API] Found", createdEvents.length, "created and", joinedEvents.length, "joined events");

    // Parse query parameters for filtering/sorting
    const eventType = searchParams.get("type"); // 'created', 'joined', or 'all'
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    let responseData: any = {};

    if (eventType === "created") {
      responseData.events = createdEvents;
      responseData.type = "created";
    } else if (eventType === "joined") {
      responseData.events = joinedEvents;
      responseData.type = "joined";
    } else {
      // Return both types
      responseData.createdEvents = createdEvents;
      responseData.joinedEvents = joinedEvents;
      responseData.totalCreated = createdEvents.length;
      responseData.totalJoined = joinedEvents.length;
      responseData.totalAll = createdEvents.length + joinedEvents.length;
    }

    // Apply limit if specified
    if (limit && eventType && responseData.events) {
      responseData.events = responseData.events.slice(0, limit);
    } else if (limit && !eventType) {
      responseData.createdEvents = responseData.createdEvents.slice(0, Math.ceil(limit / 2));
      responseData.joinedEvents = responseData.joinedEvents.slice(0, Math.ceil(limit / 2));
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error("💥 [User Events API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}