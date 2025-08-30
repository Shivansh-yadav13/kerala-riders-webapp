import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import axios from "axios";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || "173716";
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || "6a07e6d7563960d4d0596ed8d6ff3a7146b943b6";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get user session to verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ [Strava Refresh] No authenticated user found:", userError);
      return NextResponse.json({ error: "User must be authenticated" }, { status: 401 });
    }

    if (user.id !== userId) {
      console.error("❌ [Strava Refresh] User ID mismatch");
      return NextResponse.json({ error: "Invalid user session" }, { status: 403 });
    }

    const refreshToken = user.user_metadata?.strava_refresh_token;
    if (!refreshToken) {
      return NextResponse.json({ error: "No Strava refresh token found" }, { status: 400 });
    }

    console.log("🔄 [Strava Refresh] Refreshing Strava access token for user:", userId);

    // Refresh the Strava token
    const response = await axios.post("https://www.strava.com/oauth/token", {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: newRefreshToken, expires_at } = response.data;

    // Update user metadata with new tokens
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        strava_access_token: access_token,
        strava_refresh_token: newRefreshToken,
        strava_expires_at: expires_at,
      },
    });

    if (updateError) {
      console.error("❌ [Strava Refresh] Failed to update tokens:", updateError);
      return NextResponse.json({ error: "Failed to update Strava credentials" }, { status: 500 });
    }

    console.log("✅ [Strava Refresh] Successfully refreshed Strava access token");

    return NextResponse.json({
      success: true,
      access_token,
      expires_at,
    });

  } catch (error: any) {
    console.error("💥 [Strava Refresh] Error:", error);
    
    if (error.response?.data) {
      console.error("Strava API Error:", error.response.data);
    }

    const errorMessage = error.response?.data?.message || error.message || "Failed to refresh Strava token";
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}