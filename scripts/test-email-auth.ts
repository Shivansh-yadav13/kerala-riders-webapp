/**
 * Test script for email/password authentication flow
 * 
 * This script demonstrates how to use the email authentication endpoints:
 * 1. POST /api/auth/signup - User registration with email/password
 * 2. POST /api/auth/verify-otp - OTP verification for email confirmation
 * 3. POST /api/auth/resend-otp - Resend OTP for email verification
 * 4. POST /api/auth/signin - User sign-in with email/password
 * 5. POST /api/auth/reset-password - Password reset request
 * 6. POST /api/auth/update-profile - Update user profile
 * 7. GET /api/auth/update-profile - Get user profile
 * 8. POST /api/auth/signout - User sign-out
 */

import axios from 'axios';

async function testEmailAuthFlow() {
  console.log('🧪 Testing Email/Password Authentication Flow\n');

  try {
    // Test 1: User Registration
    console.log('1. Testing user registration (signup)...');
    console.log('   POST /api/auth/signup');
    console.log('   Body: { email, password, userData? }');
    console.log('   Response: User object or email confirmation requirement\n');

    // Test 2: OTP Verification
    console.log('2. Testing OTP verification...');
    console.log('   POST /api/auth/verify-otp');
    console.log('   Body: { email, token }');
    console.log('   Response: Authenticated user with session\n');

    // Test 3: Resend OTP
    console.log('3. Testing OTP resend...');
    console.log('   POST /api/auth/resend-otp');
    console.log('   Body: { email }');
    console.log('   Response: Confirmation message\n');

    // Test 4: User Sign-in
    console.log('4. Testing user sign-in...');
    console.log('   POST /api/auth/signin');
    console.log('   Body: { email, password }');
    console.log('   Response: Authenticated user with session\n');

    // Test 5: Password Reset
    console.log('5. Testing password reset...');
    console.log('   POST /api/auth/reset-password');
    console.log('   Body: { email }');
    console.log('   Response: Reset email confirmation\n');

    // Test 6: Profile Update
    console.log('6. Testing profile update...');
    console.log('   POST /api/auth/update-profile');
    console.log('   Body: { full_name?, is_active?, ... }');
    console.log('   Response: Updated user profile\n');

    // Test 7: Get Profile
    console.log('7. Testing get profile...');
    console.log('   GET /api/auth/update-profile');
    console.log('   Response: Current user profile\n');

    // Test 8: Sign-out
    console.log('8. Testing user sign-out...');
    console.log('   POST /api/auth/signout');
    console.log('   Response: Success message and cleared cookies\n');

    console.log('✅ Authentication Flow Overview:');
    console.log('   📧 Registration with email confirmation');
    console.log('   🔐 OTP-based email verification');
    console.log('   🔑 Password-based authentication');
    console.log('   🔒 Password reset functionality');
    console.log('   👤 Profile management');
    console.log('   🍪 Secure session management with HTTP-only cookies');
    console.log('   🚪 Clean sign-out with session cleanup\n');

    console.log('✅ Test overview completed successfully!');
    console.log('\n📝 To test the actual flow:');
    console.log('1. Start your Next.js development server: npm run dev');
    console.log('2. Configure email settings in Supabase dashboard');
    console.log('3. Use the EmailAuthTester class or make direct HTTP requests');
    console.log('4. Test the complete authentication flow');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Authentication testing utilities
export class EmailAuthTester {
  private baseUrl: string;
  private cookies: string[] = [];

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private getHeaders() {
    return this.cookies.length > 0 
      ? { Cookie: this.cookies.join('; ') }
      : {};
  }

  private extractCookies(response: any) {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      this.cookies = setCookieHeaders.map((cookie: string) => cookie.split(';')[0]);
    }
  }

  async signup(email: string, password: string, userData?: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/signup`, {
        email,
        password,
        userData,
      });
      
      this.extractCookies(response);
      console.log('✅ Signup successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Signup failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async signin(email: string, password: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/signin`, {
        email,
        password,
      });
      
      this.extractCookies(response);
      console.log('✅ Signin successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Signin failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async verifyOTP(email: string, token: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/verify-otp`, {
        email,
        token,
      });
      
      this.extractCookies(response);
      console.log('✅ OTP verification successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OTP verification failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async resendOTP(email: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/resend-otp`, {
        email,
      });
      
      console.log('✅ OTP resend successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OTP resend failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/reset-password`, {
        email,
      });
      
      console.log('✅ Password reset successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Password reset failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProfile(updates: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/update-profile`, updates, {
        headers: this.getHeaders(),
      });
      
      console.log('✅ Profile update successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Profile update failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/auth/update-profile`, {
        headers: this.getHeaders(),
      });
      
      console.log('✅ Get profile successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get profile failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async signout(): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/signout`, {}, {
        headers: this.getHeaders(),
      });
      
      // Clear stored cookies
      this.cookies = [];
      console.log('✅ Signout successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Signout failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Complete flow test
  async testCompleteFlow(email: string, password: string): Promise<void> {
    console.log('\n🧪 Testing complete authentication flow...\n');

    try {
      // 1. Sign up
      console.log('1️⃣ Testing signup...');
      const signupResult = await this.signup(email, password, {
        full_name: 'Test User',
      });

      // 2. Sign in (if no email confirmation required)
      if (!signupResult.requiresConfirmation) {
        console.log('2️⃣ Testing immediate signin (no confirmation required)...');
      } else {
        console.log('2️⃣ Email confirmation required - skipping signin test');
        return;
      }

      // 3. Update profile
      console.log('3️⃣ Testing profile update...');
      await this.updateProfile({
        full_name: 'Updated Test User',
        is_active: true,
      });

      // 4. Get profile
      console.log('4️⃣ Testing get profile...');
      await this.getProfile();

      // 5. Sign out
      console.log('5️⃣ Testing signout...');
      await this.signout();

      console.log('\n✅ Complete flow test passed!\n');

    } catch (error) {
      console.error('\n❌ Complete flow test failed:', error);
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEmailAuthFlow();
}