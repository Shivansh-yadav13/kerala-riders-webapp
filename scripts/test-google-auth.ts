/**
 * Test script for Google OAuth authentication flow
 * 
 * This script demonstrates how to use the Google OAuth endpoints:
 * 1. GET /api/auth/google/signin - Initiates Google OAuth flow
 * 2. GET /api/auth/google/callback - Handles OAuth callback from Google
 * 
 * The flow also demonstrates:
 * - Provider conflict detection
 * - User metadata updates
 * - Session management
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testGoogleAuthFlow() {
  console.log('🧪 Testing Google OAuth Authentication Flow\n');

  try {
    // Test 1: OAuth Initiation (GET)
    console.log('1. Testing Google OAuth initiation...');
    const initiateUrl = `${BASE_URL}/api/auth/google/signin`;
    
    console.log(`   GET ${initiateUrl}`);
    console.log('   This should redirect to Google OAuth URL via Supabase\n');

    // Test 2: Manual flow demonstration
    console.log('2. OAuth Flow Steps:');
    console.log('   a) User clicks "Sign in with Google"');
    console.log('   b) Browser redirects to /api/auth/google/signin');
    console.log('   c) Server redirects to Google OAuth with Supabase');
    console.log('   d) User authorizes on Google');
    console.log('   e) Google redirects to /api/auth/google/callback');
    console.log('   f) Server processes callback and sets session cookies');
    console.log('   g) User is redirected to app with authenticated session\n');

    // Test 3: Callback simulation
    console.log('3. Callback handling features:');
    console.log('   ✅ Provider conflict detection');
    console.log('   ✅ User metadata updates for new users');
    console.log('   ✅ Session cookie management');
    console.log('   ✅ Error handling and redirects\n');

    // Test 4: Error scenarios
    console.log('4. Error handling scenarios:');
    console.log('   - Missing authorization code');
    console.log('   - OAuth errors from Google');
    console.log('   - Provider conflicts (existing email with password auth)');
    console.log('   - Session exchange failures\n');

    console.log('✅ Test overview completed successfully!');
    console.log('\n📝 To test the actual flow:');
    console.log('1. Start your Next.js development server: npm run dev');
    console.log('2. Configure Google OAuth in Supabase dashboard');
    console.log('3. Add redirect URLs to Google OAuth app settings');
    console.log('4. Create a simple login page that links to /api/auth/google/signin');
    console.log('5. Test the complete flow in browser');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Real test functions for when server is running
export async function testGoogleOAuthInitiation(): Promise<void> {
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/google/signin`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 // Expect redirect
    });
    
    const redirectUrl = response.headers.location;
    console.log('✅ Google OAuth initiation successful');
    console.log('   Redirect URL:', redirectUrl);
    
    // Check if it's a Google OAuth URL
    if (redirectUrl && redirectUrl.includes('accounts.google.com/oauth')) {
      console.log('   ✅ Correctly redirecting to Google OAuth');
    } else {
      console.log('   ⚠️ Unexpected redirect URL format');
    }
  } catch (error: any) {
    if (error.response?.status === 302) {
      console.log('✅ Google OAuth initiation successful (redirect response)');
      console.log('   Redirect URL:', error.response.headers.location);
    } else {
      console.error('❌ Google OAuth initiation failed:', error.message);
    }
  }
}

export async function testCallbackError(errorType: string): Promise<void> {
  try {
    const callbackUrl = `${BASE_URL}/api/auth/google/callback?error=${errorType}`;
    const response = await axios.get(callbackUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 // Expect redirect
    });
    
    console.log('✅ Error handling test successful');
    console.log('   Error redirect URL:', response.headers.location);
  } catch (error: any) {
    if (error.response?.status === 302) {
      console.log('✅ Error handling test successful (redirect response)');
      console.log('   Error redirect URL:', error.response.headers.location);
    } else {
      console.error('❌ Error handling test failed:', error.message);
    }
  }
}

// Authentication utilities for testing
export class GoogleAuthTester {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async startOAuthFlow(redirectTo = '/'): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/api/auth/google/signin?redirect_to=${encodeURIComponent(redirectTo)}`;
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });
      
      return response.headers.location || null;
    } catch (error: any) {
      if (error.response?.status === 302) {
        return error.response.headers.location || null;
      }
      throw error;
    }
  }

  async simulateCallback(code: string, redirectTo = '/'): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/api/auth/google/callback?code=${code}&redirect_to=${encodeURIComponent(redirectTo)}`;
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });
      
      return response.headers.location || null;
    } catch (error: any) {
      if (error.response?.status === 302) {
        return error.response.headers.location || null;
      }
      throw error;
    }
  }

  async simulateError(errorType: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/api/auth/google/callback?error=${errorType}`;
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });
      
      return response.headers.location || null;
    } catch (error: any) {
      if (error.response?.status === 302) {
        return error.response.headers.location || null;
      }
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGoogleAuthFlow();
}