import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, ShieldAlert, X } from 'lucide-react';

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup';
  onError?: (msg: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle';
              width?: number | string;
              logo_alignment?: 'left' | 'center';
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode = 'signin',
  onError,
}) => {
  const navigate = useNavigate();
  const { loginWithGoogle, linkGoogleAccount } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secure account linking state
  const [linkingRequired, setLinkingRequired] = useState(false);
  const [pendingCredential, setPendingCredential] = useState<string | null>(null);
  const [linkingEmail, setLinkingEmail] = useState('');
  const [linkingPassword, setLinkingPassword] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const handleCredentialResponse = async (credential: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await loginWithGoogle(credential);

      // 1. Check if existing password account requires secure account-linking
      if (res.requires_account_linking) {
        setPendingCredential(credential);
        setLinkingEmail(res.email || '');
        setLinkingRequired(true);
        return;
      }

      // 2. User is authenticated with verified Google account -> redirect to dashboard
      const user = res.user;
      if (user?.role === 'admin' || user?.role === 'staff') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Google authentication failed. Please try again.';
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAccountLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCredential || !linkingPassword) return;

    setLinkingLoading(true);
    setError(null);

    try {
      const res = await linkGoogleAccount(pendingCredential, linkingPassword);
      setLinkingRequired(false);

      const user = res.user;
      if (user?.role === 'admin' || user?.role === 'staff') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to verify account password. Linking rejected.');
    } finally {
      setLinkingLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderGsiButton = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (res) => handleCredentialResponse(res.credential),
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render Google's official, branded "Continue with Google" button
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 340,
            logo_alignment: 'left',
          });
        } catch (e) {
          console.error('Failed to initialize Google Identity Services button', e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGsiButton;
      document.body.appendChild(script);
    } else {
      renderGsiButton();
    }
  }, [googleClientId]);

  return (
    <>
      <div className="w-full flex flex-col items-center">
        {error && (
          <div className="w-full mb-3 p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-1.5">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {googleClientId ? (
          <>
            {/* Real Google Identity Services Button Container */}
            <div
              ref={buttonRef}
              className={`flex justify-center w-full min-h-[44px] transition-opacity ${
                loading ? 'opacity-50 pointer-events-none' : 'opacity-100'
              }`}
            />
            {loading && (
              <p className="text-[11px] text-gray-500 mt-1.5 animate-pulse">
                Verifying Google ID token with backend...
              </p>
            )}
          </>
        ) : (
          <div className="w-full p-3 border border-amber-200 bg-amber-50 rounded-md text-center text-xs text-amber-800">
            <span className="font-semibold">Google Client ID required:</span>
            <div className="text-[11px] text-amber-700 mt-1">
              Add your Google Web Client ID to <code className="bg-amber-100 px-1 py-0.5 rounded">frontend/.env</code> as <code className="font-bold">VITE_GOOGLE_CLIENT_ID</code>.
            </div>
          </div>
        )}
      </div>

      {/* Secure Account Linking Modal: Required when an existing password account matches Google email */}
      {linkingRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl max-w-md w-full p-6 text-[#242424]">
            <div className="flex items-start justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#242424]">
                    Link Google Account
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Existing account detected with email {linkingEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkingRequired(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmAccountLink} className="space-y-4 pt-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                For security, please enter the existing password for <strong className="text-[#242424]">{linkingEmail}</strong> to link your Google identity.
              </p>

              <div>
                <label className="block text-xs font-medium text-[#242424] mb-1">
                  Account Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Enter existing password"
                    value={linkingPassword}
                    onChange={(e) => setLinkingPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
                  />
                  <Lock size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setLinkingRequired(false)}
                  className="px-3.5 py-1.5 border border-[#E5E7EB] hover:bg-gray-50 text-xs font-medium rounded text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingLoading}
                  className="px-4 py-1.5 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded shadow-xs cursor-pointer transition disabled:opacity-60"
                >
                  {linkingLoading ? 'Verifying...' : 'Confirm & Link Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
