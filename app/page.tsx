'use client';

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthForm } from '../components/auth/AuthForm';
import { OTPVerification } from '../components/auth/OTPVerification';
import { Dashboard } from '../components/dashboard/Dashboard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function Home() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { 
    user, 
    loading, 
    isAuthenticated, 
    requiresEmailVerification, 
    pendingVerificationEmail 
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Dashboard />;
  }

  if (requiresEmailVerification && pendingVerificationEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <OTPVerification 
          email={pendingVerificationEmail}
          onBackToLogin={() => {
            // This will be handled by the auth context
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kerala Riders</h1>
                <p className="text-sm text-gray-600">Connect with Kerala's cycling community</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
        <div className="w-full max-w-md">
          <AuthForm mode={authMode} onModeChange={setAuthMode} />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-sm text-gray-500">
          Join the Kerala cycling community and track your rides with Strava integration
        </p>
      </div>
    </div>
  );
}
