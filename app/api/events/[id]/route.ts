import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getEventById, updateEvent, deleteEvent, UpdateEventData } from "@/lib/events";
import { findOrCreateUser } from "@/lib/database";

/**
 * GET /api/events/[id] - Get single event by ID
 */
export async function GET(
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

    // Get optional authentication for user participation info
    const authHeader = request.headers.get("authorization");
    let currentUserKRId: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        const { user: dbUser } = await findOrCreateUser(user);
        if (dbUser) {
          currentUserKRId = dbUser.krid;
        }
      }
    }

    console.log("🔍 [Single Event API] Fetching event:", id);

    const { event, error } = await getEventById(id, currentUserKRId);

    if (error) {
      console.error("❌ [Single Event API] Error fetching event:", error);
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Event not found" ? 404 : 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    console.log("✅ [Single Event API] Found event:", event.title);

    return NextResponse.json({
      success: true,
      data: event
    });

  } catch (error: any) {
    console.error("💥 [Single Event API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[id] - Update event (creator only)
 */
export async function PUT(
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
      console.error("❌ [Update Event API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find or create user in database
    const { user: dbUser, error: userError } = await findOrCreateUser(user);
    
    if (userError || !dbUser) {
      console.error("❌ [Update Event API] User database error:", userError);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log("📝 [Update Event API] Updating event:", id);

    // Validate and prepare update data
    const updates: UpdateEventData = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json(
          { error: "Title must be a non-empty string" },
          { status: 400 }
        );
      }
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (body.date !== undefined) {
      const eventDate = new Date(body.date);
      if (isNaN(eventDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO 8601 format." },
          { status: 400 }
        );
      }
      
      if (eventDate <= new Date()) {
        return NextResponse.json(
          { error: "Event date must be in the future" },
          { status: 400 }
        );
      }
      updates.date = eventDate;
    }

    if (body.location !== undefined) {
      if (typeof body.location !== 'string' || body.location.trim() === '') {
        return NextResponse.json(
          { error: "Location must be a non-empty string" },
          { status: 400 }
        );
      }
      updates.location = body.location.trim();
    }

    if (body.maxParticipants !== undefined) {
      if (body.maxParticipants !== null) {
        const maxParticipants = parseInt(body.maxParticipants);
        if (isNaN(maxParticipants) || maxParticipants <= 0) {
          return NextResponse.json(
            { error: "Maximum participants must be a positive number" },
            { status: 400 }
          );
        }
        updates.maxParticipants = maxParticipants;
      } else {
        updates.maxParticipants = null;
      }
    }

    if (body.category !== undefined) {
      updates.category = body.category;
    }

    if (body.difficulty !== undefined) {
      updates.difficulty = body.difficulty || null;
    }

    if (body.distance !== undefined) {
      if (body.distance !== null) {
        const distance = parseFloat(body.distance);
        if (isNaN(distance) || distance < 0) {
          return NextResponse.json(
            { error: "Distance must be a non-negative number" },
            { status: 400 }
          );
        }
        updates.distance = distance;
      } else {
        updates.distance = null;
      }
    }

    if (body.registrationDeadline !== undefined) {
      if (body.registrationDeadline !== null) {
        const registrationDeadline = new Date(body.registrationDeadline);
        if (isNaN(registrationDeadline.getTime())) {
          return NextResponse.json(
            { error: "Invalid registration deadline format. Use ISO 8601 format." },
            { status: 400 }
          );
        }
        
        // If we're also updating the date, check against the new date, otherwise get current event date
        const eventDate = updates.date || (await getEventById(id)).event?.date;
        if (eventDate && registrationDeadline >= eventDate) {
          return NextResponse.json(
            { error: "Registration deadline must be before the event date" },
            { status: 400 }
          );
        }
        updates.registrationDeadline = registrationDeadline;
      } else {
        updates.registrationDeadline = null;
      }
    }

    // Check if there are any updates to apply
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update event
    const { event, error } = await updateEvent(id, updates, dbUser.krid);

    if (error) {
      console.error("❌ [Update Event API] Error updating event:", error);
      const status = error.message.includes("not found") ? 404 :
                   error.message.includes("creator") ? 403 : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 }
      );
    }

    console.log("✅ [Update Event API] Event updated successfully:", event.id);

    return NextResponse.json({
      success: true,
      message: "Event updated successfully",
      data: event
    });

  } catch (error: any) {
    console.error("💥 [Update Event API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id] - Delete event (creator only) - soft delete
 */
export async function DELETE(
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
      console.error("❌ [Delete Event API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find or create user in database
    const { user: dbUser, error: userError } = await findOrCreateUser(user);
    
    if (userError || !dbUser) {
      console.error("❌ [Delete Event API] User database error:", userError);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 500 }
      );
    }

    console.log("🗑️ [Delete Event API] Deleting event:", id);

    // Delete event
    const { error } = await deleteEvent(id, dbUser.krid);

    if (error) {
      console.error("❌ [Delete Event API] Error deleting event:", error);
      const status = error.message.includes("not found") || error.message.includes("creator") ? 404 : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    console.log("✅ [Delete Event API] Event deleted successfully:", id);

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error: any) {
    console.error("💥 [Delete Event API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}