#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { getAthleteActivities, transformStravaActivity } from "../lib/strava";
import { findOrCreateUser, storeActivities } from "../lib/database";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Supabase configuration
const supabaseUrl = "https://bioblhctkouzvppnwxvd.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface SyncStats {
  totalUsers: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalActivitiesFetched: number;
  totalActivitiesStored: number;
  totalActivitiesSkipped: number;
  userResults: Array<{
    email: string;
    success: boolean;
    message: string;
    activitiesFetched: number;
    activitiesStored: number;
    activitiesSkipped: number;
    errors: string[];
  }>;
}

async function syncUserActivities(user: any): Promise<{
  success: boolean;
  message: string;
  activitiesFetched: number;
  activitiesStored: number;
  activitiesSkipped: number;
  errors: string[];
}> {
  const email = user.email;
  const stravaAccessToken = user.user_metadata?.strava_access_token;
  const stravaAthleteId = user.user_metadata?.strava_athlete_id;

  console.log(`\n🔄 Syncing activities for: ${email}`);

  try {
    // Find or create user in database
    const { user: dbUser, error: dbUserError, created: userCreated } = await findOrCreateUser(user);
    
    if (dbUserError || !dbUser) {
      return {
        success: false,
        message: `Failed to create/find user in database: ${dbUserError?.message}`,
        activitiesFetched: 0,
        activitiesStored: 0,
        activitiesSkipped: 0,
        errors: [dbUserError?.message || "Unknown database error"]
      };
    }

    console.log(`   ✅ Database user ${userCreated ? 'created' : 'found'}: ${dbUser.krid}`);

    // Fetch today's activities from Strava
    console.log(`   📡 Fetching today's activities from Strava...`);
    const { data: stravaActivities, error: stravaError } = await getAthleteActivities(
      stravaAccessToken,
      false // Don't log details for auto sync
    );

    if (stravaError || !stravaActivities) {
      return {
        success: false,
        message: `Failed to fetch activities from Strava: ${stravaError?.message}`,
        activitiesFetched: 0,
        activitiesStored: 0,
        activitiesSkipped: 0,
        errors: [stravaError?.message || "Unknown Strava error"]
      };
    }

    console.log(`   ✅ Fetched ${stravaActivities.length} activities from Strava`);

    if (stravaActivities.length === 0) {
      return {
        success: true,
        message: "No activities found for today",
        activitiesFetched: 0,
        activitiesStored: 0,
        activitiesSkipped: 0,
        errors: []
      };
    }

    // Transform and store activities
    console.log(`   🔄 Transforming and storing activities...`);
    const dbActivities = stravaActivities.map(transformStravaActivity);
    const storageResult = await storeActivities(dbUser.krid, dbActivities);

    const message = `Sync completed! ${storageResult.stored} stored, ${storageResult.skipped} skipped`;
    console.log(`   🎉 ${message}`);

    return {
      success: true,
      message,
      activitiesFetched: stravaActivities.length,
      activitiesStored: storageResult.stored,
      activitiesSkipped: storageResult.skipped,
      errors: storageResult.errors.map(e => e.message)
    };

  } catch (error) {
    const errorMessage = `Unexpected error: ${(error as Error).message}`;
    console.log(`   ❌ ${errorMessage}`);
    
    return {
      success: false,
      message: errorMessage,
      activitiesFetched: 0,
      activitiesStored: 0,
      activitiesSkipped: 0,
      errors: [errorMessage]
    };
  }
}

async function autoSyncActivities(maxUsers: number = 10): Promise<void> {
  console.log(`🚀 Starting automatic activity sync for first ${maxUsers} users with Strava integration...\n`);

  const stats: SyncStats = {
    totalUsers: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalActivitiesFetched: 0,
    totalActivitiesStored: 0,
    totalActivitiesSkipped: 0,
    userResults: []
  };

  try {
    // Get users from Supabase Auth
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error("❌ Error fetching users from Supabase:", error);
      return;
    }

    // Filter users with Strava credentials and take first N
    const stravaUsers = data.users
      .filter(user => 
        user.user_metadata?.strava_access_token && user.user_metadata?.strava_athlete_id
      )
      .slice(0, maxUsers);

    if (stravaUsers.length === 0) {
      console.log("No users found with Strava integration.");
      return;
    }

    console.log(`Found ${data.users.filter(u => u.user_metadata?.strava_access_token).length} total users with Strava integration.`);
    console.log(`Processing first ${stravaUsers.length} users...\n`);

    stats.totalUsers = stravaUsers.length;

    // Process each user
    for (let i = 0; i < stravaUsers.length; i++) {
      const user = stravaUsers[i];
      console.log(`[${i + 1}/${stravaUsers.length}] Processing user: ${user.email}`);
      
      const result = await syncUserActivities(user);
      
      stats.userResults.push({
        email: user.email!,
        ...result
      });

      if (result.success) {
        stats.successfulSyncs++;
      } else {
        stats.failedSyncs++;
      }

      stats.totalActivitiesFetched += result.activitiesFetched;
      stats.totalActivitiesStored += result.activitiesStored;
      stats.totalActivitiesSkipped += result.activitiesSkipped;

      // Small delay between users to be respectful to APIs
      if (i < stravaUsers.length - 1) {
        console.log(`   ⏱️  Waiting 2 seconds before next user...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

  } catch (error) {
    console.error("💥 Error during auto sync:", error);
  } finally {
    await prisma.$disconnect();
    
    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SYNC SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total users processed: ${stats.totalUsers}`);
    console.log(`Successful syncs: ${stats.successfulSyncs}`);
    console.log(`Failed syncs: ${stats.failedSyncs}`);
    console.log(`Total activities fetched: ${stats.totalActivitiesFetched}`);
    console.log(`Total activities stored: ${stats.totalActivitiesStored}`);
    console.log(`Total activities skipped: ${stats.totalActivitiesSkipped}`);
    
    if (stats.failedSyncs > 0) {
      console.log("\n❌ Failed syncs:");
      stats.userResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   ${result.email}: ${result.message}`);
        });
    }
    
    if (stats.successfulSyncs > 0) {
      console.log("\n✅ Successful syncs:");
      stats.userResults
        .filter(r => r.success)
        .forEach(result => {
          console.log(`   ${result.email}: ${result.message}`);
        });
    }
    
    console.log("\n🎉 Auto sync completed!");
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const maxUsers = args[0] ? parseInt(args[0], 10) : 10;
  
  if (isNaN(maxUsers) || maxUsers < 1) {
    console.error("❌ Please provide a valid number of users to sync");
    console.log("Usage: npm run auto-sync [number-of-users]");
    console.log("Example: npm run auto-sync 5");
    process.exit(1);
  }
  
  await autoSyncActivities(maxUsers);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Gracefully shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(console.error);