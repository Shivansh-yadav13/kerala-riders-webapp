'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { useAuth, User } from '../../hooks/useAuth';

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.user_metadata?.full_name || '',
    phone_number: user.user_metadata?.phone_number || '',
    gender: user.user_metadata?.gender || '',
    city: user.user_metadata?.city || '',
    kerala_district: user.user_metadata?.kerala_district || '',
    uae_emirate: user.user_metadata?.uae_emirate || '',
  });
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { updateProfile, loading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    clearError();

    if (!formData.full_name.trim()) {
      setLocalError('Full name is required');
      return;
    }

    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setIsEditing(false);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      // Error is handled by the auth hook
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (localError) setLocalError('');
    if (error) clearError();
  };

  const handleCancel = () => {
    setFormData({
      full_name: user.user_metadata?.full_name || '',
      phone_number: user.user_metadata?.phone_number || '',
      gender: user.user_metadata?.gender || '',
      city: user.user_metadata?.city || '',
      kerala_district: user.user_metadata?.kerala_district || '',
      uae_emirate: user.user_metadata?.uae_emirate || '',
    });
    setIsEditing(false);
    setLocalError('');
    clearError();
  };

  const displayError = localError || error;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              Edit Profile
            </Button>
          )}
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

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={handleInputChange('full_name')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone_number}
                onChange={handleInputChange('phone_number')}
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={handleInputChange('gender')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <Input
                type="text"
                value={formData.city}
                onChange={handleInputChange('city')}
                placeholder="Enter your city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kerala District
              </label>
              <select
                value={formData.kerala_district}
                onChange={handleInputChange('kerala_district')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select district</option>
                <option value="thiruvananthapuram">Thiruvananthapuram</option>
                <option value="kollam">Kollam</option>
                <option value="pathanamthitta">Pathanamthitta</option>
                <option value="alappuzha">Alappuzha</option>
                <option value="kottayam">Kottayam</option>
                <option value="idukki">Idukki</option>
                <option value="ernakulam">Ernakulam</option>
                <option value="thrissur">Thrissur</option>
                <option value="palakkad">Palakkad</option>
                <option value="malappuram">Malappuram</option>
                <option value="kozhikode">Kozhikode</option>
                <option value="wayanad">Wayanad</option>
                <option value="kannur">Kannur</option>
                <option value="kasaragod">Kasaragod</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UAE Emirate
              </label>
              <select
                value={formData.uae_emirate}
                onChange={handleInputChange('uae_emirate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select emirate</option>
                <option value="abu_dhabi">Abu Dhabi</option>
                <option value="dubai">Dubai</option>
                <option value="sharjah">Sharjah</option>
                <option value="ajman">Ajman</option>
                <option value="umm_al_quwain">Umm Al Quwain</option>
                <option value="ras_al_khaimah">Ras Al Khaimah</option>
                <option value="fujairah">Fujairah</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900 mt-1">{user.email}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {user.user_metadata?.full_name || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {user.user_metadata?.phone_number || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                <dd className="text-sm text-gray-900 mt-1 capitalize">
                  {user.user_metadata?.gender?.replace('_', ' ') || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">City</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {user.user_metadata?.city || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Kerala District</dt>
                <dd className="text-sm text-gray-900 mt-1 capitalize">
                  {user.user_metadata?.kerala_district?.replace('_', ' ') || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">UAE Emirate</dt>
                <dd className="text-sm text-gray-900 mt-1 capitalize">
                  {user.user_metadata?.uae_emirate?.replace('_', ' ') || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </dd>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}