'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StravaBridgePage() {
  const searchParams = useSearchParams();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [status, setStatus] = useState('Redirecting back to app...');

  const log = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, message]);
  };

  const updateStatus = (message: string) => {
    setStatus(message);
    log(message);
  };

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        log('Starting redirect process...');
        log('Current URL: ' + window.location.href);
        
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const platform = searchParams.get('platform');
        
        log('Code: ' + (code ? 'Present' : 'Missing'));
        log('State: ' + (state || 'Not provided'));
        log('Error: ' + (error || 'None'));
        log('Platform param: ' + (platform || 'Not specified'));
        log('User agent: ' + navigator.userAgent);
        
        if (error) {
          updateStatus(`Error: ${error}`);
          return;
        }
        
        if (code) {
          // Detect platform
          const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const isInApp = ('standalone' in navigator && (navigator as any).standalone) || 
                         window.matchMedia('(display-mode: standalone)').matches;
          
          const detectedPlatform = platform || (isMobile || isInApp ? 'mobile' : 'web');
          
          log('Is mobile: ' + isMobile);
          log('Is in app: ' + isInApp);
          log('Final platform: ' + detectedPlatform);
          
          let redirectUrl: string;
          if (detectedPlatform === 'mobile') {
            redirectUrl = `keralaridersapp://strava/callback?code=${code}&state=${state || ''}`;
            updateStatus('Redirecting to mobile app...');
          } else {
            redirectUrl = `/auth/strava/callback?code=${code}&state=${state || ''}`;
            updateStatus('Redirecting to web app...');
          }
          
          log('Redirect URL: ' + redirectUrl);
          
          // Add a small delay to show debug info in development
          setTimeout(() => {
            if (detectedPlatform === 'mobile') {
              window.location.href = redirectUrl;
            } else {
              // For web, use Next.js router or direct navigation
              window.location.href = redirectUrl;
            }
          }, 2000);
          
        } else {
          updateStatus('No authorization code found in URL');
          log('No code parameter found');
        }
      } catch (err: any) {
        updateStatus('Error: ' + err.message);
        log('JavaScript error: ' + err.message);
      }
    };

    handleRedirect();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {status}
          </h2>
          <p className="text-sm text-gray-600">
            Processing Strava authentication...
          </p>
        </div>
        
        {/* Debug information - only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Debug Info:</h3>
            <div className="text-xs text-gray-600 font-mono space-y-1">
              {debugInfo.map((info, index) => (
                <div key={index}>{info}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}