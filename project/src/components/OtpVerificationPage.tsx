import { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import { API_CONFIG, getApiUrl } from '../config/api';

interface OtpVerificationPageProps {
  onBack: () => void;
  email: string;
  isSignup: boolean;
  onLoginSuccess: () => void;
  onSignupSuccess?: () => void;
}

export default function OtpVerificationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow max-w-md text-center">
        <h2 className="text-xl font-bold mb-4">OTP Feature Removed</h2>
        <p className="text-gray-600 mb-6">OTP-based verification has been removed. Please use email and password to register or login.</p>
        <a href="/" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">Go to Login</a>
      </div>
    </div>
  );
}
