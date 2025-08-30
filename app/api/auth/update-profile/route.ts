import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates, accessToken } = body;

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Profile updates are required" },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token required" },
        { status: 401 }
      );
    }

    console.log("📝 [Profile Update] Starting profile update");

    // Create a new supabase instance with the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    // Update user metadata
    const { data, error } = await userSupabase.auth.updateUser({
      data: updates,
    });

    console.log("✏️ [Profile Update] Update response:", { 
      hasUser: !!data.user,
      error: error?.message 
    });

    if (error) {
      console.error("❌ [Profile Update] Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    console.log("✅ [Profile Update] Profile updated successfully");

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
      },
      message: "Profile updated successfully",
    });

  } catch (error: any) {
    console.error("💥 [Profile Update] Unexpected error:", error);
    const errorMessage = error.message || "An unexpected error occurred while updating profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("👤 [Profile Get] Getting current user profile...");

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);

    // Create a new supabase instance with the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const { data: { user }, error } = await userSupabase.auth.getUser();

    if (error || !user) {
      console.error("❌ [Profile Get] No authenticated user found:", error);
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    console.log("✅ [Profile Get] Retrieved profile for user:", user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });

  } catch (error: any) {
    console.error("💥 [Profile Get] Unexpected error:", error);
    const errorMessage = error.message || "An unexpected error occurred while getting profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}