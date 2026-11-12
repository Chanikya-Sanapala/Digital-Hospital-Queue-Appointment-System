import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export const OTPVerification: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmailOtp, sendEmailOtp } = useAuth();

  const stateEmail = location.state?.email || '';
  const fromRegistration = Boolean(location.state?.fromRegistration);

  const [step, setStep] = useState<'input_email' | 'enter_code'>(stateEmail ? 'enter_code' : 'input_email');
  const [email, setEmail] = useState<string>(stateEmail);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(fromRegistration ? 60 : 0);

  // Focus first input on mount if already in enter_code step
  useEffect(() => {
    if (step === 'enter_code') {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

  const handleSendOtp = async (targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    if (!clean) {
      setError('Please provide a valid email address.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await sendEmailOtp(clean, 'registration');
      setStep('enter_code');
      setEmail(clean);
      setCooldown(res.cooldown_seconds || 60);
      setSuccessMsg(res.message || `A verification code has been dispatched to ${clean}`);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = cleanValue.slice(-1);
    setOtp(newOtp);

    // Auto advance to next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);

    const nextFocusIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await verifyEmailOtp(email.trim().toLowerCase(), fullCode, 'registration');
      setSuccessMsg('Email verified successfully! Taking you to your dashboard...');

      setTimeout(() => {
        if (user.role === 'admin' || user.role === 'staff') {
          navigate('/admin');
        } else {
          navigate('/customer');
        }
      }, 900);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 sm:p-9 text-[#242424]">
      <h1 className="text-2xl font-bold text-[#242424] mb-2 tracking-tight text-center">
        Verify Your Email
      </h1>

      <p className="text-xs text-center text-gray-500 leading-relaxed max-w-sm mx-auto mb-6">
        {step === 'enter_code' ? (
          <>
            We have sent a six-digit verification code to{' '}
            <strong className="text-[#242424] font-medium">{email}</strong>.
          </>
        ) : (
          'Enter your email address to receive a six-digit verification code to activate your account.'
        )}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-xs text-green-800 flex items-center space-x-1.5">
          <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 'input_email' ? (
        /* STEP 1: Enter Email */
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendOtp(email);
          }}
          className="space-y-4"
        >
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
                className="w-full px-3.5 py-2.5 pr-10 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
              />
              <Mail size={15} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
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
        /* STEP 2: 6 Square OTP Inputs */
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-between gap-2 max-w-[340px] mx-auto">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-11 h-12 text-center text-lg font-semibold border border-[#E5E7EB] rounded-lg bg-white text-[#242424] focus:outline-none focus:border-[#234F3E] focus:ring-1 focus:ring-[#234F3E] transition shadow-2xs"
              />
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded-md text-sm transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>

          {/* Resend and change email links */}
          <div className="flex flex-col items-center space-y-2 text-xs text-gray-600 pt-1">
            <div>
              Didn't receive a code?{' '}
              {cooldown > 0 ? (
                <span className="text-gray-400 font-medium">Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp(email)}
                  disabled={loading}
                  className="font-semibold text-[#242424] hover:text-[#234F3E] hover:underline cursor-pointer inline-flex items-center space-x-1"
                >
                  <RefreshCw size={11} />
                  <span>Resend Code</span>
                </button>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('input_email');
                  setOtp(['', '', '', '', '', '']);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-gray-500 hover:text-[#242424] hover:underline transition"
              >
                Change Email Address
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
