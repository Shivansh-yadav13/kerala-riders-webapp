'use client';

import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useAuth } from '../../hooks/useAuth';
import { StravaConnection } from './StravaConnection';
import { UserProfile } from './UserProfile';

export function Dashboard() {
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {user.user_metadata?.full_name || user.email}!
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your Kerala Riders account and connections
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {user.email}
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  loading={loading}
                  size="sm"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Profile */}
          <UserProfile user={user} />

          {/* Strava Connection */}
          <StravaConnection user={user} />
        </div>

        {/* Additional Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Activity Stats</h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
                <p className="text-sm text-gray-600">Activities This Month</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Community</h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-green-600 mb-2">Kerala</div>
                <p className="text-sm text-gray-600">Riders Community</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-yellow-600 mb-2">🏆</div>
                <p className="text-sm text-gray-600">Coming Soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Status */}
        {user.user_metadata && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.user_metadata.is_email_verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.user_metadata.is_email_verified ? '✓ Verified' : '⚠ Pending'}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Email</p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.user_metadata.is_mobile_verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.user_metadata.is_mobile_verified ? '✓ Verified' : '- Not Set'}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Mobile</p>
                  </div>

                  <div className="text-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.user_metadata.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.user_metadata.is_active ? '✓ Active' : '- Inactive'}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Account</p>
                  </div>

                  <div className="text-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.user_metadata.strava_access_token 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.user_metadata.strava_access_token ? '✓ Connected' : '- Not Connected'}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Strava</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}