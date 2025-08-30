import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log("REquest received");
    // Get authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header with Bearer token required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("Request body:", body);
    const requiredFields = ["id", "name", "type"];

    for (const field of requiredFields) {
      if (
        body.activity[field] === undefined ||
        body.activity[field] === null ||
        body.activity[field] === ""
      ) {
        console.log("Missing required field:", field);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    let dbUser = await prisma.user.findUnique({
      where: { email: body.user.email, krid: String(body.user.krid) },
      select: { krid: true },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: body.user.email,
          krid: body.user.krid,
          athleteId: String(body.user.stravaAthleteId),
          name: body.user.name,
        },
        select: {
          krid: true,
        },
      });
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate ID format (should be numeric only for BigInt compatibility)
    if (!/^\d+$/.test(body.activity.id)) {
      console.log("Invalid activity ID format");
      return NextResponse.json(
        { error: "Invalid activity ID format" },
        { status: 400 }
      );
    }

    // Check if activity already exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id: BigInt(body.activity.id) },
    });

    if (existingActivity) {
      return NextResponse.json(
        { error: "Activity with this ID already exists" },
        { status: 409 }
      );
    }

    // Validate and parse numeric values
    const parsedDistance = parseFloat(body.activity.distance);
    const parsedMovingTime = parseInt(body.activity.movingTime);
    const parsedElapsedTime =
      parseInt(body.activity.elapsedTime) || parsedMovingTime;
    const parsedTotalElevation = body.activity.totalElevation
      ? parseFloat(body.activity.totalElevation)
      : 0;

    if (isNaN(parsedDistance) || parsedDistance < 0) {
      console.log("Invalid distance value");
      return NextResponse.json(
        { error: "Invalid distance value" },
        { status: 400 }
      );
    }

    if (isNaN(parsedMovingTime) || parsedMovingTime <= 0) {
      console.log("Invalid moving time value");
      return NextResponse.json(
        { error: "Invalid duration value" },
        { status: 400 }
      );
    }

    // Create the activity
    const newActivity = await prisma.activity.create({
      data: {
        id: BigInt(body.activity.id),
        userKRId: dbUser.krid, // Use the krid from the found user
        name: body.activity.name.trim(),
        type: body.activity.type,
        sportType: body.activity.sportType || body.activity.type, // Fallback to type if sportType is missing
        distance: parsedDistance,
        movingTime: parsedMovingTime,
        elapsedTime: parsedElapsedTime,
        totalElevation: parsedTotalElevation,
        startDate: new Date(body.activity.startDate),
        startDateLocal: new Date(body.activity.startDateLocal),
        timezone: body.activity.timezone || null,
        averageSpeed: body.activity.averageSpeed
          ? parseFloat(body.activity.averageSpeed)
          : null,
        maxSpeed: body.activity.maxSpeed
          ? parseFloat(body.activity.maxSpeed)
          : null,
        workoutType: body.activity.workoutType
          ? parseInt(body.activity.workoutType)
          : null,
        // createdAt is automatically set by Prisma with @default(now())
      },
      select: {
        id: true,
        name: true,
        type: true,
        sportType: true,
        distance: true,
        movingTime: true,
        elapsedTime: true,
        totalElevation: true,
        startDate: true,
        startDateLocal: true,
        timezone: true,
        averageSpeed: true,
        maxSpeed: true,
        workoutType: true,
        createdAt: true,
      },
    });

    // Transform bigint id to string for JSON serialization
    const transformedActivity = {
      ...newActivity,
      id: newActivity.id.toString(),
    };

    return NextResponse.json(
      {
        success: true,
        message: "Activity created successfully",
        data: {
          activity: transformedActivity,
          id: transformedActivity.id, // Also provide id at data level for compatibility
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error in add activity:", error);

    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          {
            success: false,
            error: "Activity with this ID already exists",
            message: error.message,
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
