'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { useAuth } from '../../hooks/useAuth';

interface OTPVerificationProps {
  email: string;
  onBackToLogin: () => void;
}

export function OTPVerification({ email, onBackToLogin }: OTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { verifyOTP, resendOTP, loading, error, clearError } = useAuth();

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!otp || otp.length < 6) {
      setLocalError('Please enter a valid 6-digit verification code');
      return;
    }

    try {
      await verifyOTP(email, otp);
    } catch (error) {
      // Error is handled by the auth hook
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setLocalError('');
    clearError();
    setResendSuccess(false);

    try {
      const result = await resendOTP(email);
      if (result.success) {
        setResendSuccess(true);
        setResendCooldown(60); // 60 second cooldown
        setTimeout(() => setResendSuccess(false), 5000); // Hide success message after 5 seconds
      }
    } catch (error) {
      // Error is handled by the auth hook
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only allow 6 digits
    setOtp(value);
    if (localError) setLocalError('');
    if (error) clearError();
  };

  const displayError = localError || error;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We sent a verification code to
          </p>
          <p className="text-sm font-medium text-gray-900">{email}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {displayError && (
          <Alert variant="error" onClose={() => { setLocalError(''); clearError(); }}>
            {displayError}
          </Alert>
        )}

        {resendSuccess && (
          <Alert variant="success">
            Verification code sent successfully!
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={handleInputChange}
              className="text-center text-lg tracking-widest"
              maxLength={6}
              required
              autoComplete="one-time-code"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={loading || otp.length < 6}
          >
            Verify Email
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Didn't receive the code?
          </p>
          
          <Button
            variant="outline"
            onClick={handleResendOTP}
            disabled={resendCooldown > 0 || loading}
            className="text-sm"
          >
            {resendCooldown > 0 
              ? `Resend code in ${resendCooldown}s`
              : 'Resend verification code'
            }
          </Button>

          <div>
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm text-blue-600 hover:text-blue-800"
              disabled={loading}
            >
              ← Back to sign in
            </button>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Check your spam folder if you don't see the email in your inbox.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}