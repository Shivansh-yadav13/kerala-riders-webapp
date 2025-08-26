#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Supabase configuration - you'll need service role key for this
const supabaseUrl = "https://bioblhctkouzvppnwxvd.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  console.log("Please set it in your .env.local file or run:");
  console.log("SUPABASE_SERVICE_ROLE_KEY=your_service_key npm run list-strava-users");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function listStravaUsers(): Promise<void> {
  console.log("🔍 Fetching users with Strava integration...\n");

  try {
    // Get all users from Supabase Auth
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error("❌ Error fetching users from Supabase:", error);
      return;
    }

    // Filter users with Strava credentials
    const stravaUsers = data.users.filter(user => 
      user.user_metadata?.strava_access_token && user.user_metadata?.strava_athlete_id
    );

    if (stravaUsers.length === 0) {
      console.log("No users found with Strava integration.");
      return;
    }

    console.log(`Found ${stravaUsers.length} user(s) with Strava integration:\n`);
    
    for (let i = 0; i < stravaUsers.length; i++) {
      const user = stravaUsers[i];
      console.log(`${i + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.user_metadata?.full_name || user.user_metadata?.name || 'N/A'}`);
      console.log(`   KRID: ${user.user_metadata?.krid || 'N/A'}`);
      console.log(`   Strava Athlete ID: ${user.user_metadata?.strava_athlete_id}`);
      console.log(`   Strava Access Token: ${user.user_metadata?.strava_access_token}`);
      
      // Check if user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { 
          krid: true, 
          _count: { select: { activities: true } }
        }
      });
      
      if (dbUser) {
        console.log(`   DB Status: ✅ Exists (KRID: ${dbUser.krid}, Activities: ${dbUser._count.activities})`);
      } else {
        console.log(`   DB Status: ❌ Not in database`);
      }
      
      console.log(`\n   🚀 Sync command:`);
      console.log(`   npm run sync-activities "${user.email}" "${user.user_metadata?.strava_access_token}"`);
      console.log("");
    }

  } catch (error) {
    console.error("💥 Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  await listStravaUsers();
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