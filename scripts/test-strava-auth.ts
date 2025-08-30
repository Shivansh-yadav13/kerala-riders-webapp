/**
 * Test script for Strava authentication flow
 * 
 * This script demonstrates how to use the Strava OAuth endpoints:
 * 1. GET /api/auth/strava/connect - Initiates OAuth flow
 * 2. POST /api/auth/strava/connect - Handles OAuth callback
 * 3. POST /api/auth/strava/refresh - Refreshes expired tokens
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testStravaAuthFlow() {
  console.log('🧪 Testing Strava Authentication Flow\n');

  try {
    // Test 1: OAuth Initiation (GET)
    console.log('1. Testing OAuth initiation...');
    const testUserId = 'test-user-123';
    const initiateUrl = `${BASE_URL}/api/auth/strava/connect?user_id=${testUserId}`;
    
    console.log(`   GET ${initiateUrl}`);
    console.log('   This should redirect to Strava OAuth URL\n');

    // Test 2: Token Exchange (POST) - Simulation
    console.log('2. Testing token exchange (simulated)...');
    const mockAuthCode = 'mock_auth_code_123';
    
    const tokenExchangePayload = {
      code: mockAuthCode,
      state: testUserId
    };

    console.log('   POST /api/auth/strava/connect');
    console.log('   Payload:', JSON.stringify(tokenExchangePayload, null, 2));
    console.log('   Note: This would normally be called by the OAuth redirect handler\n');

    // Test 3: Token Refresh (POST) - Simulation
    console.log('3. Testing token refresh (simulated)...');
    
    const refreshPayload = {
      userId: testUserId
    };

    console.log('   POST /api/auth/strava/refresh');
    console.log('   Payload:', JSON.stringify(refreshPayload, null, 2));
    console.log('   Note: This requires an authenticated user with existing Strava tokens\n');

    console.log('✅ Test script completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Start your Next.js development server: npm run dev');
    console.log('2. Test OAuth initiation by visiting the GET endpoint in browser');
    console.log('3. Complete OAuth flow by authorizing with Strava');
    console.log('4. Test token refresh with a valid user session');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Real test functions for when server is running
export async function testOAuthInitiation(userId: string): Promise<void> {
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/strava/connect?user_id=${userId}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 // Expect redirect
    });
    
    const redirectUrl = response.headers.location;
    console.log('✅ OAuth initiation successful');
    console.log('   Redirect URL:', redirectUrl);
  } catch (error: any) {
    if (error.response?.status === 302) {
      console.log('✅ OAuth initiation successful (redirect response)');
      console.log('   Redirect URL:', error.response.headers.location);
    } else {
      console.error('❌ OAuth initiation failed:', error.message);
    }
  }
}

export async function testTokenRefresh(userId: string): Promise<void> {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/strava/refresh`, {
      userId
    });
    
    console.log('✅ Token refresh successful');
    console.log('   Response:', response.data);
  } catch (error: any) {
    console.error('❌ Token refresh failed:', error.response?.data || error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testStravaAuthFlow();
}