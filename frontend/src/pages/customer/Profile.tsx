import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Phone, Mail, ShieldCheck, Calendar } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
          Patient Profile
        </h1>
        <p className="text-xs text-[#777777] mt-0.5">
          Your personal healthcare identity and verified contact settings.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6 space-y-6">
        {/* Profile Card Header */}
        <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-[#234F3E] text-white flex items-center justify-center font-bold text-xl">
            {user?.first_name?.charAt(0) || 'P'}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#242424]">
              {user?.first_name} {user?.last_name}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">@{user?.username}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                {user?.role}
              </span>
              {user?.is_verified && (
                <span className="flex items-center space-x-1 text-[11px] font-medium text-[#88C65A]">
                  <ShieldCheck size={13} />
                  <span>Phone Verified</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#F4F5F7] border border-gray-200">
            <span className="text-gray-500 block mb-1">Email Address</span>
            <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
              <Mail size={13} className="text-gray-400" />
              <span>{user?.email}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F4F5F7] border border-gray-200">
            <span className="text-gray-500 block mb-1">Mobile Phone (SMS &amp; Voice OTP)</span>
            <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
              <Phone size={13} className="text-gray-400" />
              <span>{user?.mobile}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F4F5F7] border border-gray-200">
            <span className="text-gray-500 block mb-1">Gender</span>
            <div className="font-semibold text-gray-900">
              {user?.gender || 'Not specified'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F4F5F7] border border-gray-200">
            <span className="text-gray-500 block mb-1">Date of Birth</span>
            <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span>{user?.dob || 'Not specified'}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 text-xs text-gray-500 border-t border-gray-100 flex justify-between items-center">
          <span>Account ID: <span className="font-mono">{user?.id}</span></span>
          <span className="text-emerald-700 font-medium">Active Status: Active</span>
        </div>
      </div>
    </div>
  );
};

