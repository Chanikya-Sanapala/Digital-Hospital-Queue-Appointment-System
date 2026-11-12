import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Mail, Lock, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await api.post('/auth/forgot-password', { email: cleanEmail });
      setStep('reset');
      setMessage(res.data.message || `If an account exists for ${cleanEmail}, a verification code has been dispatched.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to request password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp_code: otpCode.trim(),
        new_password: newPassword,
      });
      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 sm:p-9 text-[#242424]">
      <h1 className="text-2xl font-bold text-[#242424] mb-2 tracking-tight text-center">
        {step === 'request' ? 'Forgot Password' : 'Reset Password'}
      </h1>
      <p className="text-xs text-center text-gray-500 mb-6">
        {step === 'request'
          ? 'Enter your registered email address to receive a 6-digit verification code.'
          : `Enter the 6-digit code sent to ${email} and your new password.`}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-xs text-green-800">
          {message}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#242424] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 pr-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
              />
              <Mail size={15} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded-md text-sm transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Sending Code...' : 'Send Verification Code'}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-gray-500 hover:text-[#234F3E] inline-flex items-center space-x-1">
              <ArrowLeft size={12} />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#242424] mb-1.5">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 font-mono tracking-widest text-center focus:outline-none focus:border-[#234F3E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#242424] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
              />
              <Lock size={15} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded-md text-sm transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Re-enter Email Address
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
