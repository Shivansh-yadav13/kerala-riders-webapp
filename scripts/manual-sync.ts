#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";
import { getAthleteActivities, transformStravaActivity } from "../lib/strava";
import { storeActivities } from "../lib/database";

const prisma = new PrismaClient();

async function syncActivitiesForUser(userEmail: string, stravaAccessToken: string): Promise<void> {
  console.log(`🚀 Starting activity sync for user: ${userEmail}`);

  try {
    // Find user in database by email
    let dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    let userCreated = false;
    if (!dbUser) {
      console.log(`Creating new user for email: ${userEmail}`);
      
      // Create user with minimal info since we don't have full Supabase user data
      dbUser = await prisma.user.create({
        data: {
          krid: `manual-${Date.now()}`, // Temporary KRID for manual sync
          email: userEmail,
          name: userEmail.split('@')[0], // Use email prefix as name
        },
      });
      userCreated = true;
    }

    console.log(`✅ Database user ${userCreated ? 'created' : 'found'}: ${dbUser.krid}`);

    // Fetch today's activities from Strava
    console.log("📡 Fetching today's activities from Strava...");
    const { data: stravaActivities, error: stravaError } = await getAthleteActivities(
      stravaAccessToken,
      true // Log details for manual script
    );

    if (stravaError || !stravaActivities) {
      console.error("❌ Failed to fetch activities from Strava:", stravaError);
      return;
    }

    console.log(`✅ Fetched ${stravaActivities.length} activities from Strava`);

    if (stravaActivities.length === 0) {
      console.log("ℹ️ No activities found for today. Nothing to sync.");
      return;
    }

    // Transform and store activities
    console.log("🔄 Transforming activities...");
    const dbActivities = stravaActivities.map(transformStravaActivity);
    console.log(`✅ Transformed ${dbActivities.length} activities`);

    console.log("💾 Storing activities in database...");
    const storageResult = await storeActivities(dbUser.krid, dbActivities);

    // Summary
    console.log("\n🎉 SYNC COMPLETED!");
    console.log(`📊 Results:`);
    console.log(`   - User: ${userCreated ? 'Created' : 'Found'}`);
    console.log(`   - Activities fetched: ${stravaActivities.length}`);
    console.log(`   - Activities stored: ${storageResult.stored}`);
    console.log(`   - Activities skipped: ${storageResult.skipped}`);
    console.log(`   - Errors: ${storageResult.errors.length}`);
    
    if (storageResult.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      storageResult.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
      });
    }

  } catch (error) {
    console.error("💥 Unexpected error during sync:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function listUsers(): Promise<void> {
  console.log("👥 Listing users from database...\n");

  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        krid: true,
        athleteId: true,
        _count: {
          select: { activities: true }
        }
      },
      orderBy: { email: 'asc' }
    });

    if (users.length === 0) {
      console.log("No users found in database.");
      return;
    }

    console.log(`Found ${users.length} user(s) in database:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   KRID: ${user.krid}`);
      console.log(`   Athlete ID: ${user.athleteId || 'N/A'}`);
      console.log(`   Activities: ${user._count.activities}`);
      console.log("");
    });

  } catch (error) {
    console.error("💥 Error listing users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === '--list' || args[0] === '-l') {
    await listUsers();
    return;
  }
  
  if (args.length === 0) {
    console.log("🔧 Kerala Riders Activity Sync Script\n");
    console.log("Usage:");
    console.log("  npm run sync-activities <user-email> <strava-access-token>  # Sync activities");
    console.log("  npm run list-users                                         # List all users");
    console.log("\nExamples:");
    console.log("  npm run sync-activities user@example.com abc123tokenhere");
    console.log("  npm run list-users");
    console.log("\nNote: You can find the Strava access token in the user's user_metadata in Supabase");
    process.exit(0);
  }

  if (args.length < 2) {
    console.error("❌ Please provide both email and Strava access token");
    console.error("Usage: npm run sync-activities <user-email> <strava-access-token>");
    process.exit(1);
  }
  
  const userEmail = args[0];
  const stravaAccessToken = args[1];
  
  if (!userEmail.includes('@')) {
    console.error("❌ Please provide a valid email address");
    process.exit(1);
  }
  
  await syncActivitiesForUser(userEmail, stravaAccessToken);
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