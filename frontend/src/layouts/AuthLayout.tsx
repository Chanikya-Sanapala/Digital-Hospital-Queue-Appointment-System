import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Branding Header */}
      <div className="flex flex-col items-center justify-center pt-2 pb-6">
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-bold tracking-tight text-[#234F3E]">
            QueueSense
          </span>
        </Link>
        <p className="text-xs text-[#777777] mt-1 font-medium">
          Digital Hospital Queue & Appointment System
        </p>
      </div>

      {/* Main Form Card Container */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[460px]">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-[#777777]">
        &copy; {new Date().getFullYear()} QueueSense Healthcare Platform. Secure &amp; HIPAA-Aligned.
      </div>
    </div>
  );
};

