import { supabase } from "./supabase";
import { getAthleteActivities, transformStravaActivity } from "./strava";
import { findOrCreateUser, storeActivities, closeDatabaseConnection } from "./database";

export interface SyncResult {
  success: boolean;
  message: string;
  details: {
    userCreated: boolean;
    activitiesFetched: number;
    activitiesStored: number;
    activitiesSkipped: number;
    errors: Error[];
  };
}

/**
 * Main function to sync today's activities from Strava to database
 */
export const syncTodaysActivities = async (): Promise<SyncResult> => {
  console.log("🚀 Starting activity sync process...");

  try {
    // Step 1: Get current authenticated user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      const errorMsg = "No authenticated user found. Please sign in first.";
      console.error("❌", errorMsg);
      return {
        success: false,
        message: errorMsg,
        details: {
          userCreated: false,
          activitiesFetched: 0,
          activitiesStored: 0,
          activitiesSkipped: 0,
          errors: authError ? [authError as Error] : [],
        },
      };
    }

    console.log("✅ Authenticated user found:", user.email);

    // Step 2: Check if user has Strava connected
    const stravaAccessToken = user.user_metadata?.strava_access_token;
    const stravaAthleteId = user.user_metadata?.strava_athlete_id;

    if (!stravaAccessToken || !stravaAthleteId) {
      const errorMsg = "Strava not connected. Please connect your Strava account first.";
      console.error("❌", errorMsg);
      return {
        success: false,
        message: errorMsg,
        details: {
          userCreated: false,
          activitiesFetched: 0,
          activitiesStored: 0,
          activitiesSkipped: 0,
          errors: [new Error("Missing Strava credentials")],
        },
      };
    }

    console.log("✅ Strava credentials found for athlete:", stravaAthleteId);

    // Step 3: Find or create user in database
    const { user: dbUser, error: dbUserError, created: userCreated } = await findOrCreateUser(user);
    
    if (dbUserError || !dbUser) {
      const errorMsg = "Failed to create/find user in database";
      console.error("❌", errorMsg, dbUserError);
      return {
        success: false,
        message: errorMsg,
        details: {
          userCreated: false,
          activitiesFetched: 0,
          activitiesStored: 0,
          activitiesSkipped: 0,
          errors: dbUserError ? [dbUserError as Error] : [],
        },
      };
    }

    console.log(`✅ Database user ${userCreated ? 'created' : 'found'}:`, dbUser.krid);

    // Step 4: Fetch today's activities from Strava
    console.log("📡 Fetching today's activities from Strava...");
    const { data: stravaActivities, error: stravaError } = await getAthleteActivities(
      stravaAccessToken,
      false // Don't log details in production
    );

    if (stravaError || !stravaActivities) {
      const errorMsg = "Failed to fetch activities from Strava";
      console.error("❌", errorMsg, stravaError);
      return {
        success: false,
        message: errorMsg,
        details: {
          userCreated,
          activitiesFetched: 0,
          activitiesStored: 0,
          activitiesSkipped: 0,
          errors: stravaError ? [stravaError as Error] : [],
        },
      };
    }

    console.log(`✅ Fetched ${stravaActivities.length} activities from Strava`);

    if (stravaActivities.length === 0) {
      const message = "No activities found for today. Nothing to sync.";
      console.log("ℹ️", message);
      return {
        success: true,
        message,
        details: {
          userCreated,
          activitiesFetched: 0,
          activitiesStored: 0,
          activitiesSkipped: 0,
          errors: [],
        },
      };
    }

    // Step 5: Transform Strava activities to database format
    console.log("🔄 Transforming activities...");
    const dbActivities = stravaActivities.map(transformStravaActivity);
    console.log(`✅ Transformed ${dbActivities.length} activities`);

    // Step 6: Store activities in database
    console.log("💾 Storing activities in database...");
    const storageResult = await storeActivities(dbUser.krid, dbActivities);

    // Step 7: Return success result
    const successMessage = `Sync completed! ${storageResult.stored} activities stored, ${storageResult.skipped} skipped`;
    console.log("🎉", successMessage);

    return {
      success: true,
      message: successMessage,
      details: {
        userCreated,
        activitiesFetched: stravaActivities.length,
        activitiesStored: storageResult.stored,
        activitiesSkipped: storageResult.skipped,
        errors: storageResult.errors,
      },
    };

  } catch (error) {
    const errorMsg = "Unexpected error during sync process";
    console.error("💥", errorMsg, error);
    
    return {
      success: false,
      message: errorMsg,
      details: {
        userCreated: false,
        activitiesFetched: 0,
        activitiesStored: 0,
        activitiesSkipped: 0,
        errors: [error as Error],
      },
    };
  } finally {
    // Clean up database connection
    await closeDatabaseConnection();
  }
};

/**
 * Wrapper function for easy testing from UI
 */
export const testActivitySync = async (): Promise<string> => {
  const result = await syncTodaysActivities();
  
  if (result.success) {
    return `✅ ${result.message}\n\nDetails:\n- User created: ${result.details.userCreated ? 'Yes' : 'No'}\n- Activities fetched: ${result.details.activitiesFetched}\n- Activities stored: ${result.details.activitiesStored}\n- Activities skipped: ${result.details.activitiesSkipped}\n- Errors: ${result.details.errors.length}`;
  } else {
    return `❌ ${result.message}\n\nErrors: ${result.details.errors.length > 0 ? result.details.errors.join(', ') : 'Unknown error'}`;
  }
};