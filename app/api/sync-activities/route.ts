import { NextRequest, NextResponse } from 'next/server';
import { syncTodaysActivities } from '@/lib/syncActivities';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header to verify user is authenticated
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Execute the sync operation
    const result = await syncTodaysActivities();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          details: result.details
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('API Error in sync-activities:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: { errors: [error] }
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Strava Activity Sync API',
    endpoints: {
      'POST /api/sync-activities': 'Sync today\'s activities from Strava'
    },
    status: 'ready'
  });
}