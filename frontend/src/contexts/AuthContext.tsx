import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

export interface GoogleAuthResult {
  requires_account_linking?: boolean;
  user?: User;
  email?: string;
  message?: string;
}

export interface RegisterResult {
  success: boolean;
  email: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (data: any) => Promise<RegisterResult>;
  verifyEmailOtp: (email: string, otpCode: string, purpose?: string) => Promise<User>;
  sendEmailOtp: (email: string, purpose?: string) => Promise<{ success: boolean; message: string; cooldown_seconds?: number }>;
  loginWithGoogle: (credential: string) => Promise<GoogleAuthResult>;
  linkGoogleAccount: (credential: string, password: string) => Promise<GoogleAuthResult>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (identifier: string, password: string, rememberMe: boolean = false): Promise<User> => {
    const res = await api.post('/auth/login', {
      identifier,
      password,
      remember_me: rememberMe,
    });
    const { access_token, refresh_token, user: loggedInUser } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setToken(access_token);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (data: any): Promise<RegisterResult> => {
    const res = await api.post('/auth/register', data);
    return {
      success: res.data.success,
      email: res.data.email,
      message: res.data.message,
    };
  };

  const verifyEmailOtp = async (email: string, otpCode: string, purpose: string = 'registration'): Promise<User> => {
    const res = await api.post('/auth/verify-email-otp', {
      email,
      otp_code: otpCode,
      purpose,
    });
    const { access_token, refresh_token, user: verifiedUser } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(verifiedUser));
    setToken(access_token);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const sendEmailOtp = async (email: string, purpose: string = 'registration') => {
    const res = await api.post('/auth/send-email-otp', { email, purpose });
    return {
      success: res.data.success,
      message: res.data.message,
      cooldown_seconds: res.data.cooldown_seconds || 60,
    };
  };

  const loginWithGoogle = async (credential: string): Promise<GoogleAuthResult> => {
    const res = await api.post('/auth/google', { credential });
    if (res.data.requires_account_linking) {
      return {
        requires_account_linking: true,
        email: res.data.email,
        message: res.data.message,
      };
    }

    const { access_token, refresh_token, user: loggedInUser } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setToken(access_token);
    setUser(loggedInUser);

    return {
      requires_account_linking: false,
      user: loggedInUser,
    };
  };

  const linkGoogleAccount = async (credential: string, password: string): Promise<GoogleAuthResult> => {
    const res = await api.post('/auth/google/link', { credential, password });
    const { access_token, refresh_token, user: loggedInUser } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setToken(access_token);
    setUser(loggedInUser);

    return {
      requires_account_linking: false,
      user: loggedInUser,
    };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout notification error', e);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      updateUser(res.data);
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        verifyEmailOtp,
        sendEmailOtp,
        loginWithGoogle,
        linkGoogleAccount,
        logout,
        updateUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
