'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

function StravaCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Prevent multiple concurrent executions
    if (isProcessing) return;

    const processCallback = async () => {
      // Set processing flag to prevent duplicate calls
      setIsProcessing(true);
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for authorization denial
        if (error === 'access_denied') {
          setStatus('error');
          setErrorMessage('Strava authorization was denied. Please try connecting again.');
          setIsProcessing(false);
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          setStatus('error');
          setErrorMessage('Invalid callback parameters. Please try connecting again.');
          setIsProcessing(false);
          return;
        }

        console.log('🚀 [Strava Callback] Processing callback with code:', code);

        // Call the API to process the Strava callback
        const response = await fetch('/api/auth/strava/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log('✅ [Strava Callback] Connection successful');
          setStatus('success');
          
          // Refresh user data to get updated metadata
          await refreshUser();
          
          // Redirect to dashboard after a brief success message
          setTimeout(() => {
            router.push('/?strava_connected=true');
          }, 2000);
        } else {
          console.error('❌ [Strava Callback] Connection failed:', data);
          setStatus('error');
          setErrorMessage(data.error || 'Failed to connect Strava account');
        }
      } catch (error) {
        console.error('💥 [Strava Callback] Unexpected error:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred while connecting your Strava account');
      } finally {
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, refreshUser, router, isProcessing]);

  const handleRetry = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === 'processing' && (
              <>
                <div className="w-16 h-16 mx-auto bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Connecting Your Strava Account</h2>
                <p className="text-gray-600">Please wait while we complete the connection...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-green-900">Strava Connected Successfully!</h2>
                <p className="text-gray-600">Your Strava account has been linked. Redirecting you back...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-red-900">Connection Failed</h2>
                <p className="text-gray-600 text-sm">{errorMessage}</p>
                <button
                  onClick={handleRetry}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Return to Dashboard
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
            <p className="text-gray-600">Processing your request...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StravaCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StravaCallbackContent />
    </Suspense>
  );
}