import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleAuthButton } from '../../components/GoogleAuthButton';
import api from '../../services/api';
import { Mail, Eye, EyeOff, Phone, CheckCircle2 } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('Female');
  const [dobDay, setDobDay] = useState('Day');
  const [dobMonth, setDobMonth] = useState('Month');
  const [dobYear, setDobYear] = useState('Year');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live username availability check
  useEffect(() => {
    if (username.trim().length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/auth/check-username?username=${encodeURIComponent(username.trim())}`);
          setUsernameAvailable(res.data.available);
        } catch {
          setUsernameAvailable(null);
        }
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setUsernameAvailable(null);
    }
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeTerms) {
      setError('You must agree with the Terms & Conditions.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!mobile.trim()) {
      setError('Please provide your mobile number.');
      return;
    }

    setLoading(true);
    try {
      const dob = (dobYear !== 'Year' && dobMonth !== 'Month' && dobDay !== 'Day')
        ? `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`
        : undefined;

      const res = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        mobile: mobile.trim(),
        gender,
        dob,
        password,
        confirm_password: confirmPassword,
        agree_terms: agreeTerms,
      });

      // Navigate to Email OTP verification
      navigate('/verify-email', { state: { email: res.email || email.trim().toLowerCase(), fromRegistration: true } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Days 1..31, Years 1940..2024
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 85 }, (_, i) => String(currentYear - i - 10));

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 sm:p-9 text-[#242424]">
      <h1 className="text-2xl font-bold text-[#242424] mb-6 tracking-tight">
        Create Account
      </h1>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Google Auth Option */}
      <div className="mb-4">
        <GoogleAuthButton mode="signup" onError={(msg) => setError(msg)} />

        <div className="relative my-4.5 flex items-center justify-center">
          <div className="border-t border-[#E5E7EB] w-full" />
          <span className="bg-white px-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider absolute">
            or register with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Your Name */}
        <div>
          <label className="block text-xs font-medium text-[#242424] mb-1.5">
            Your Name
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
            />
            <input
              type="text"
              required
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
            />
          </div>
        </div>

        {/* Email Address */}
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

        {/* Username with live availability badge */}
        <div>
          <label className="block text-xs font-medium text-[#242424] mb-1.5">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="username123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 pr-24 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
            />
            {usernameAvailable === true && (
              <span className="absolute right-2.5 top-2 flex items-center space-x-1 text-[11px] font-medium text-[#88C65A]">
                <CheckCircle2 size={13} className="text-[#88C65A]" />
                <span>Available</span>
              </span>
            )}
            {usernameAvailable === false && (
              <span className="absolute right-2.5 top-2 text-[11px] font-medium text-red-500">
                Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Mobile Number (Mandatory) */}
        <div>
          <label className="block text-xs font-medium text-[#242424] mb-1.5">
            Mobile Number
          </label>
          <div className="relative">
            <input
              type="tel"
              required
              placeholder="+1 234 567 8910"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3 py-2 pr-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
            />
            <Phone size={15} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Gender & Birthday */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-[#242424] mb-1.5">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-2.5 py-2 border border-[#E5E7EB] rounded-md text-xs text-gray-700 bg-white focus:outline-none focus:border-[#234F3E]"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#242424] mb-1.5">
              Birthday
            </label>
            <div className="grid grid-cols-3 gap-1">
              <select
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
                className="w-full px-1 py-2 border border-[#E5E7EB] rounded-md text-[11px] text-gray-700 bg-white focus:outline-none"
              >
                <option value="Day">Day</option>
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
                className="w-full px-1 py-2 border border-[#E5E7EB] rounded-md text-[11px] text-gray-700 bg-white focus:outline-none"
              >
                <option value="Month">Month</option>
                {months.map((m, idx) => (
                  <option key={m} value={String(idx + 1)}>{m}</option>
                ))}
              </select>
              <select
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
                className="w-full px-1 py-2 border border-[#E5E7EB] rounded-md text-[11px] text-gray-700 bg-white focus:outline-none"
              >
                <option value="Year">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-[#242424] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-medium text-[#242424] mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 pr-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Terms and Conditions Checkbox */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            id="terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="h-4 w-4 rounded border-[#E5E7EB] text-[#88C65A] focus:ring-[#88C65A] cursor-pointer"
          />
          <label htmlFor="terms" className="text-xs text-gray-600 select-none cursor-pointer">
            Agree with Term &amp; Conditons
          </label>
        </div>

        {/* Create Account Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded-md text-sm transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>

      {/* Footer link */}
      <div className="text-center mt-5 text-xs text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[#242424] hover:text-[#234F3E] hover:underline">
          Login to Account
        </Link>
      </div>
    </div>
  );
};

