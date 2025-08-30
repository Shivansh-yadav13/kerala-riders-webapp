import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header with Bearer token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const krid = searchParams.get('krid');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const sportType = searchParams.get('sportType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validation: Need either email or krid
    if (!email && !krid) {
      return NextResponse.json(
        { error: 'Either email or krid parameter is required' },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50; // Max 100 activities per request
    const offsetNum = offset ? Math.max(parseInt(offset, 10), 0) : 0;

    // Build where clause
    const whereClause: Prisma.ActivityWhereInput = {};
    
    if (krid) {
      whereClause.userKRId = krid;
    } else if (email) {
      // First find user by email
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { krid: true }
      });

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      whereClause.userKRId = dbUser.krid;
    }

    // Add sport type filter if provided
    if (sportType) {
      whereClause.sportType = sportType;
    }

    // Add date range filters if provided
    if (startDate || endDate) {
      whereClause.startDate = {};
      
      if (startDate) {
        whereClause.startDate.gte = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.startDate.lte = new Date(endDate);
      }
    }

    // Fetch activities with pagination
    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where: whereClause,
        orderBy: { startDate: 'desc' },
        take: limitNum,
        skip: offsetNum,
        select: {
          id: true,
          name: true,
          type: true,
          sportType: true,
          distance: true,
          movingTime: true,
          elapsedTime: true,
          totalElevation: true,
          startDate: true,
          startDateLocal: true,
          timezone: true,
          averageSpeed: true,
          maxSpeed: true,
          workoutType: true,
          createdAt: true
        }
      }),
      prisma.activity.count({
        where: whereClause
      })
    ]);

    // Transform bigint id to string for JSON serialization
    const transformedActivities = activities.map(activity => ({
      ...activity,
      id: activity.id.toString(),
    }));

    // Calculate pagination info
    const hasMore = (offsetNum + limitNum) < totalCount;
    const totalPages = Math.ceil(totalCount / limitNum);
    const currentPage = Math.floor(offsetNum / limitNum) + 1;

    return NextResponse.json({
      success: true,
      data: {
        activities: transformedActivities,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore,
          totalPages,
          currentPage
        },
        filters: {
          email: email || null,
          krid: krid || null,
          sportType: sportType || null,
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });

  } catch (error) {
    console.error('API Error in get-all activities:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}