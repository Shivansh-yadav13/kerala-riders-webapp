'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useAuth, User } from '../../hooks/useAuth';

interface StravaConnectionProps {
  user: User;
}

export function StravaConnection({ user }: StravaConnectionProps) {
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { connectStrava, loading, error, clearError, refreshUser } = useAuth();

  const isStravaConnected = !!(
    user.user_metadata?.strava_access_token && 
    user.user_metadata?.strava_athlete_id
  );

  // Debug logging to see what's in user metadata
  console.log('🔍 [StravaConnection] User metadata:', user.user_metadata);
  console.log('🔍 [StravaConnection] Strava connected?', isStravaConnected);
  console.log('🔍 [StravaConnection] Access token present?', !!user.user_metadata?.strava_access_token);
  console.log('🔍 [StravaConnection] Athlete ID present?', !!user.user_metadata?.strava_athlete_id);

  const handleConnectStrava = () => {
    setLocalError('');
    setSuccessMessage('');
    clearError();
    connectStrava();
  };

  const handleDisconnectStrava = async () => {
    setLocalError('');
    setSuccessMessage('');
    clearError();

    try {
      // Call API to disconnect Strava
      const response = await fetch('/api/auth/strava/disconnect', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setSuccessMessage('Strava account disconnected successfully!');
        await refreshUser(); // Refresh user data
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setLocalError(data.error || 'Failed to disconnect Strava account');
      }
    } catch (error: any) {
      setLocalError(error.message || 'Network error while disconnecting Strava');
    }
  };

  const displayError = localError || error;

  // Format the expiry date if available
  const formatExpiryDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7.008 13.828h4.172"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Strava Connection</h3>
            <p className="text-sm text-gray-600">
              Connect your Strava account to sync activities
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {displayError && (
          <Alert variant="error" onClose={() => { setLocalError(''); clearError(); }} className="mb-4">
            {displayError}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage('')} className="mb-4">
            {successMessage}
          </Alert>
        )}

        {isStravaConnected ? (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Strava Connected
                  </p>
                  <p className="text-sm text-green-700">
                    Your activities will be automatically synced
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>

            {/* Strava Account Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Athlete ID</dt>
                  <dd className="text-gray-900 mt-1">
                    {user.user_metadata?.strava_athlete_id || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Token Expires</dt>
                  <dd className="text-gray-900 mt-1">
                    {formatExpiryDate(user.user_metadata?.strava_expires_at)}
                  </dd>
                </div>
              </div>

              {/* Token Status */}
              {user.user_metadata?.strava_expires_at && (
                <div className="mt-3">
                  {Date.now() / 1000 > user.user_metadata.strava_expires_at ? (
                    <div className="flex items-center space-x-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        Token expired - reconnection may be required
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        Token is valid and active
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={handleConnectStrava}
                loading={loading}
                disabled={loading}
                className="flex-1"
              >
                Reconnect Strava
              </Button>
              <Button
                variant="danger"
                onClick={handleDisconnectStrava}
                loading={loading}
                disabled={loading}
                className="flex-1"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected State */}
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7.008 13.828h4.172"/>
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Connect Your Strava Account
              </h4>
              <p className="text-sm text-gray-600 mb-6">
                Sync your cycling and running activities automatically with Kerala Riders
              </p>
              
              <Button
                onClick={handleConnectStrava}
                loading={loading}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7.008 13.828h4.172"/>
                </svg>
                Connect with Strava
              </Button>
            </div>

            {/* Benefits */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">
                Benefits of connecting Strava:
              </h5>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Automatic activity synchronization
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Community challenges and leaderboards
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Detailed activity analytics
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Connect with Kerala cycling community
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}