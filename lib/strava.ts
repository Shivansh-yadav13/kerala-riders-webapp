import { getTodayEpochSeconds } from "./utils";
import { ActivityData } from "./database";
import axios from "axios";

const BASE_URL = "https://www.strava.com/api/v3";

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string; // ISO string
  start_date_local: string; // ISO string
  timezone: string;
  average_speed?: number;
  max_speed?: number;
  workout_type?: number;
  // Many more fields available but these are the key ones we need
}

export interface StravaAthleteStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  recent_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  recent_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  ytd_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  all_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  all_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  all_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
}

export const getAthleteStats = async (
  athleteId: string,
  accessToken: string
): Promise<{ data: StravaAthleteStats | null; error: Error | null }> => {
  try {
    const result = await axios.get(`${BASE_URL}/athletes/${athleteId}/stats`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = result.data;
    console.log("Strava athlete stats:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching Strava stats:", error);
    return { data: null, error: error as Error };
  }
};

/**
 * Transform Strava activity to database format
 */
export const transformStravaActivity = (stravaActivity: StravaActivity): ActivityData => {
  return {
    id: BigInt(stravaActivity.id),
    name: stravaActivity.name,
    type: stravaActivity.type,
    sportType: stravaActivity.sport_type,
    distance: stravaActivity.distance,
    movingTime: stravaActivity.moving_time,
    elapsedTime: stravaActivity.elapsed_time,
    totalElevation: stravaActivity.total_elevation_gain,
    startDate: new Date(stravaActivity.start_date),
    startDateLocal: new Date(stravaActivity.start_date_local),
    timezone: stravaActivity.timezone,
    averageSpeed: stravaActivity.average_speed,
    maxSpeed: stravaActivity.max_speed,
    workoutType: stravaActivity.workout_type,
  };
};

export const getAthleteActivities = async (
  accessToken: string,
  logDetails: boolean = false
): Promise<{ data: StravaActivity[] | null; error: Error | null }> => {
  try {
    const { startOfDay, endOfDay } = getTodayEpochSeconds();
    const result = await axios.get(
      `${BASE_URL}/athlete/activities?before=${endOfDay}&after=${startOfDay}&page=1&per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (logDetails) {
      console.log("=== STRAVA ATHLETE ACTIVITIES ===");
      console.log("Query params:", { startOfDay, endOfDay });
      console.log("Number of activities:", result.data.length);
      console.log("Raw activities data:", JSON.stringify(result.data, null, 2));
      
      if (result.data.length > 0) {
        console.log("=== FIRST ACTIVITY STRUCTURE ===");
        console.log("First activity:", JSON.stringify(result.data[0], null, 2));
        console.log("=== ACTIVITY KEYS ===");
        console.log("Available keys:", Object.keys(result.data[0]));
      }
    }
    
    return { data: result.data, error: null };
  } catch (error) {
    console.error("Error fetching Strava activities:", error);
    return { data: null, error: error as Error };
  }
};