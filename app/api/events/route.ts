import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createEvent, getEvents, EventFilters, CreateEventData } from "@/lib/events";
import { findOrCreateUser } from "@/lib/database";

/**
 * GET /api/events - List events with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get optional authentication
    const authHeader = request.headers.get("authorization");
    let currentUserKRId: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        // Find or create user in database to get KRID
        const { user: dbUser } = await findOrCreateUser(user);
        if (dbUser) {
          currentUserKRId = dbUser.krid;
        }
      }
    }

    // Parse filters from query parameters
    const filters: EventFilters = {};
    
    if (searchParams.get("category")) {
      filters.category = searchParams.get("category")!;
    }
    
    if (searchParams.get("difficulty")) {
      filters.difficulty = searchParams.get("difficulty")!;
    }
    
    if (searchParams.get("dateFrom")) {
      const dateFrom = searchParams.get("dateFrom")!;
      filters.dateFrom = new Date(dateFrom);
      if (isNaN(filters.dateFrom.getTime())) {
        return NextResponse.json(
          { error: "Invalid dateFrom format. Use ISO 8601 format." },
          { status: 400 }
        );
      }
    }
    
    if (searchParams.get("dateTo")) {
      const dateTo = searchParams.get("dateTo")!;
      filters.dateTo = new Date(dateTo);
      if (isNaN(filters.dateTo.getTime())) {
        return NextResponse.json(
          { error: "Invalid dateTo format. Use ISO 8601 format." },
          { status: 400 }
        );
      }
    }
    
    if (searchParams.get("location")) {
      filters.location = searchParams.get("location")!;
    }

    console.log("🔍 [Events API] Fetching events with filters:", filters);

    const { events, error } = await getEvents(filters, currentUserKRId);

    if (error) {
      console.error("❌ [Events API] Error fetching events:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ [Events API] Found", events.length, "events");
    
    return NextResponse.json({
      success: true,
      data: events,
      count: events.length
    });

  } catch (error: any) {
    console.error("💥 [Events API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events - Create a new event
 */
export async function POST(request: NextRequest) {
  try {
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
      console.error("❌ [Events API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find or create user in database
    const { user: dbUser, error: userError } = await findOrCreateUser(user);
    
    if (userError || !dbUser) {
      console.error("❌ [Events API] User database error:", userError);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log("📝 [Events API] Creating event:", body.title);

    // Validate required fields
    const requiredFields = ["title", "date", "location", "category"];
    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate and parse date
    const eventDate = new Date(body.date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format." },
        { status: 400 }
      );
    }

    // Check if event date is in the future
    if (eventDate <= new Date()) {
      return NextResponse.json(
        { error: "Event date must be in the future" },
        { status: 400 }
      );
    }

    // Validate registration deadline if provided
    let registrationDeadline: Date | undefined;
    if (body.registrationDeadline) {
      registrationDeadline = new Date(body.registrationDeadline);
      if (isNaN(registrationDeadline.getTime())) {
        return NextResponse.json(
          { error: "Invalid registration deadline format. Use ISO 8601 format." },
          { status: 400 }
        );
      }
      
      if (registrationDeadline >= eventDate) {
        return NextResponse.json(
          { error: "Registration deadline must be before the event date" },
          { status: 400 }
        );
      }
    }

    // Validate optional numeric fields
    if (body.maxParticipants !== undefined && body.maxParticipants !== null) {
      const maxParticipants = parseInt(body.maxParticipants);
      if (isNaN(maxParticipants) || maxParticipants <= 0) {
        return NextResponse.json(
          { error: "Maximum participants must be a positive number" },
          { status: 400 }
        );
      }
      body.maxParticipants = maxParticipants;
    }

    if (body.distance !== undefined && body.distance !== null) {
      const distance = parseFloat(body.distance);
      if (isNaN(distance) || distance < 0) {
        return NextResponse.json(
          { error: "Distance must be a non-negative number" },
          { status: 400 }
        );
      }
      body.distance = distance;
    }

    // Prepare event data
    const eventData: CreateEventData = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      date: eventDate,
      location: body.location.trim(),
      maxParticipants: body.maxParticipants || null,
      category: body.category,
      difficulty: body.difficulty || null,
      distance: body.distance || null,
      registrationDeadline: registrationDeadline || null,
    };

    // Create event
    const { event, error } = await createEvent(eventData, dbUser.krid);

    if (error) {
      console.error("❌ [Events API] Error creating event:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Failed to create event" },
        { status: 500 }
      );
    }

    console.log("✅ [Events API] Event created successfully:", event.id);

    return NextResponse.json({
      success: true,
      message: "Event created successfully",
      data: event
    }, { status: 201 });

  } catch (error: any) {
    console.error("💥 [Events API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}