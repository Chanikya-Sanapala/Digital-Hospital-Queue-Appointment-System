import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleAuthButton } from '../../components/GoogleAuthButton';
import { Mail, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(identifier, password, rememberMe);
      if (user.role === 'admin' || user.role === 'staff') {
        navigate('/admin');
      } else {
        navigate('/customer');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email/username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 sm:p-9 text-[#242424]">
      <h1 className="text-2xl font-bold text-[#242424] mb-6 tracking-tight">
        Login Account
      </h1>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Google Auth Option */}
      <div className="mb-4">
        <GoogleAuthButton mode="signin" onError={(msg) => setError(msg)} />

        <div className="relative my-4.5 flex items-center justify-center">
          <div className="border-t border-[#E5E7EB] w-full" />
          <span className="bg-white px-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider absolute">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Email or Username */}
        <div>
          <label className="block text-xs font-medium text-[#242424] mb-1.5">
            Email or Username
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="example@mail.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 pr-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
            />
            <Mail size={15} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
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

        {/* Remember Password & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center space-x-2 text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[#E5E7EB] text-[#88C65A] focus:ring-[#88C65A] cursor-pointer"
            />
            <span>Remember Password</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-gray-600 hover:text-[#234F3E] hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Login Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded-md text-sm transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Login Account'}
          </button>
        </div>
      </form>

      {/* Footer link */}
      <div className="text-center mt-5 text-xs text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-[#242424] hover:text-[#234F3E] hover:underline">
          Create Account
        </Link>
      </div>
    </div>
  );
};

