import { PrismaClient, User as PrismaUser, Activity } from "@prisma/client";
import { User } from "@supabase/supabase-js";

const prisma = new PrismaClient();

export interface CreateUserData {
  krid: string;
  email: string;
  name?: string;
  athleteId?: string;
}

export interface ActivityData {
  id: bigint;
  name: string;
  type: string;
  sportType: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevation: number;
  startDate: Date;
  startDateLocal: Date;
  timezone?: string;
  averageSpeed?: number;
  maxSpeed?: number;
  workoutType?: number;
}

/**
 * Create a user in the database from Supabase auth data
 */
export const createUserFromSupabase = async (
  supabaseUser: User
): Promise<{ user: PrismaUser | null; error: Error | null }> => {
  try {
    const userData: CreateUserData = {
      krid: supabaseUser.user_metadata?.krid || `temp-${supabaseUser.id}`,
      email: supabaseUser.email!,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
      athleteId: supabaseUser.user_metadata?.strava_athlete_id?.toString(),
    };

    const user = await prisma.user.create({
      data: userData,
    });

    console.log("✅ User created in database:", user);
    return { user, error: null };
  } catch (error) {
    console.error("❌ Error creating user:", error);
    return { user: null, error: error as Error };
  }
};

/**
 * Find user by email or create new user from Supabase data
 */
export const findOrCreateUser = async (
  supabaseUser: User
): Promise<{ user: PrismaUser | null; error: Error | null; created: boolean }> => {
  try {
    // First, try to find existing user by email
    const user = await prisma.user.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (user) {
      console.log("✅ Found existing user:", user.krid);
      return { user, error: null, created: false };
    }

    // If not found, create new user
    const result = await createUserFromSupabase(supabaseUser);
    if (result.error || !result.user) {
      return { user: null, error: result.error || new Error("Failed to create user"), created: false };
    }

    console.log("✅ Created new user:", result.user.krid);
    return { user: result.user, error: null, created: true };
  } catch (error) {
    console.error("❌ Error in findOrCreateUser:", error);
    return { user: null, error: error as Error, created: false };
  }
};

/**
 * Store activities in database with duplicate checking
 */
export const storeActivities = async (
  userKRId: string,
  activities: ActivityData[]
): Promise<{ stored: number; skipped: number; errors: Error[] }> => {
  const results = {
    stored: 0,
    skipped: 0,
    errors: [] as Error[],
  };

  console.log(`📦 Storing ${activities.length} activities for user ${userKRId}`);

  for (const activity of activities) {
    try {
      // Check if activity already exists
      const existingActivity = await prisma.activity.findUnique({
        where: { id: activity.id },
      });

      if (existingActivity) {
        console.log(`⏭️  Skipping existing activity: ${activity.name} (${activity.id})`);
        results.skipped++;
        continue;
      }

      // Create new activity
      await prisma.activity.create({
        data: {
          ...activity,
          userKRId,
        },
      });

      console.log(`✅ Stored activity: ${activity.name} (${activity.id})`);
      results.stored++;
    } catch (error) {
      console.error(`❌ Error storing activity ${activity.id}:`, error);
      results.errors.push(error as Error);
    }
  }

  console.log(`📊 Storage complete: ${results.stored} stored, ${results.skipped} skipped, ${results.errors.length} errors`);
  return results;
};

/**
 * Get user activities from database
 */
export const getUserActivities = async (
  userKRId: string,
  limit: number = 50
): Promise<{ activities: Activity[]; error: Error | null }> => {
  try {
    const activities = await prisma.activity.findMany({
      where: { userKRId },
      orderBy: { startDate: 'desc' },
      take: limit,
    });

    return { activities, error: null };
  } catch (error) {
    console.error("❌ Error fetching user activities:", error);
    return { activities: [], error: error as Error };
  }
};

/**
 * Get activity count for user
 */
export const getUserActivityCount = async (
  userKRId: string
): Promise<{ count: number; error: Error | null }> => {
  try {
    const count = await prisma.activity.count({
      where: { userKRId },
    });

    return { count, error: null };
  } catch (error) {
    console.error("❌ Error counting user activities:", error);
    return { count: 0, error: error as Error };
  }
};

/**
 * Clean up function to close Prisma connection
 */
export const closeDatabaseConnection = async () => {
  await prisma.$disconnect();
};

export { prisma };