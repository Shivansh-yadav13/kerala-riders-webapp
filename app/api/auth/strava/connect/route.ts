import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import axios from "axios";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || "173716";
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || "6a07e6d7563960d4d0596ed8d6ff3a7146b943b6";
const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI || `https://kerala-riders-webapp.vercel.app/api/auth/strava/connect`;

const STRAVA_SCOPES = [
  "read",
  "read_all", 
  "profile:read_all",
  "profile:write",
  "activity:read",
  "activity:read_all",
  "activity:write"
].join(",");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  
  // If we have a code, this is a callback from Strava
  if (code && state) {
    try {
      console.log("🚀 [Strava Connect] Processing callback for user:", state);

      // Exchange authorization code for tokens
      const tokenResponse = await axios.post(
        `https://www.strava.com/oauth/token?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}&code=${code}&grant_type=authorization_code`
      );

      const { 
        access_token, 
        refresh_token, 
        expires_at,
        athlete 
      } = tokenResponse.data;

      console.log("✅ [Strava Connect] Token exchange successful for athlete:", athlete?.id);

      // Get user from Supabase
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(state);

      if (userError || !user) {
        console.error("❌ [Strava Connect] User not found:", userError);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}?error=user_not_found`);
      }

      // Update user metadata with Strava tokens
      const { error: updateError } = await supabase.auth.admin.updateUserById(state, {
        user_metadata: {
          ...user.user.user_metadata,
          strava_access_token: access_token,
          strava_refresh_token: refresh_token,
          strava_expires_at: expires_at,
          strava_athlete_id: athlete?.id,
        },
      });

      if (updateError) {
        console.error("❌ [Strava Connect] Failed to update user metadata:", updateError);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}?error=update_failed`);
      }

      console.log("✅ [Strava Connect] User metadata updated successfully");

      // Redirect back to the app with success
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}?strava_connected=true`);

    } catch (error: any) {
      console.error("💥 [Strava Connect] Callback error:", error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}?error=strava_connect_failed`);
    }
  }

  // If no code, this is the initial request to start OAuth flow
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Generate Strava OAuth URL
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=${STRAVA_SCOPES}&state=${userId}`;

  return NextResponse.redirect(stravaAuthUrl);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state: userId } = body;

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log("🚀 [Strava Connect] Starting token exchange for user:", userId);

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post(
      `https://www.strava.com/oauth/token?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}&code=${code}&grant_type=authorization_code`
    );

    const { 
      access_token, 
      refresh_token, 
      expires_at,
      athlete 
    } = tokenResponse.data;

    console.log("✅ [Strava Connect] Token exchange successful");

    // Get user session to verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ [Strava Connect] No authenticated user found:", userError);
      return NextResponse.json({ error: "User must be authenticated" }, { status: 401 });
    }

    if (user.id !== userId) {
      console.error("❌ [Strava Connect] User ID mismatch");
      return NextResponse.json({ error: "Invalid user session" }, { status: 403 });
    }

    // Update user metadata with Strava tokens
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        strava_access_token: access_token,
        strava_refresh_token: refresh_token,
        strava_athlete_id: athlete.id,
        strava_expires_at: expires_at,
      },
    });

    if (updateError) {
      console.error("❌ [Strava Connect] Failed to update user metadata:", updateError);
      return NextResponse.json({ error: "Failed to store Strava credentials" }, { status: 500 });
    }

    console.log("✅ [Strava Connect] Successfully linked Strava account for athlete:", athlete.id);

    return NextResponse.json({
      success: true,
      athlete: {
        id: athlete.id,
        username: athlete.username,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
      }
    });

  } catch (error: any) {
    console.error("💥 [Strava Connect] Error:", error);
    
    if (error.response?.data) {
      console.error("Strava API Error:", error.response.data);
    }

    const errorMessage = error.response?.data?.message || error.message || "Failed to connect Strava account";
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}