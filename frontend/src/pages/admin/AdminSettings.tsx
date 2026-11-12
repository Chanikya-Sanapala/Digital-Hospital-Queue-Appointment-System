import React, { useState } from 'react';
import { Settings, Shield, Bell, MessageSquare, Database, CheckCircle2, Clock } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [saved, setSaved] = useState(false);

  // Mock settings toggles
  const [autoSmsNotify, setAutoSmsNotify] = useState(true);
  const [voiceCallFallback, setVoiceCallFallback] = useState(true);
  const [maxSlotCapacity, setMaxSlotCapacity] = useState(3);
  const [defaultDuration, setDefaultDuration] = useState(15);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('17:00');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
          System &amp; Queue Settings
        </h1>
        <p className="text-xs text-[#777777] mt-0.5">
          Configure clinical parameters, SMS gateways, and queue operation rules.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Operational settings updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs text-[#242424]">
        {/* MSG91 Gateway Integration Card */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100">
            <MessageSquare size={16} className="text-[#234F3E]" />
            <h2 className="text-sm font-bold text-[#242424]">MSG91 SMS &amp; Voice Gateway</h2>
          </div>

          <p className="text-gray-500">
            QueueSense integrates directly with MSG91 for real-time transactional OTP delivery and automated voice-call failover.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block">Automatic SMS OTP Delivery</span>
                <span className="text-gray-500 text-[11px]">Send instant 6-digit codes to mobile numbers upon registration and login.</span>
              </div>
              <input
                type="checkbox"
                checked={autoSmsNotify}
                onChange={(e) => setAutoSmsNotify(e.target.checked)}
                className="h-4 w-4 rounded text-[#88C65A]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <span className="font-semibold block">Automated Voice Call Fallback</span>
                <span className="text-gray-500 text-[11px]">Trigger automated IVR voice delivery if SMS is undelivered or requested.</span>
              </div>
              <input
                type="checkbox"
                checked={voiceCallFallback}
                onChange={(e) => setVoiceCallFallback(e.target.checked)}
                className="h-4 w-4 rounded text-[#88C65A]"
              />
            </div>
          </div>
        </div>

        {/* Clinical Queue Timing Rules */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100">
            <Clock size={16} className="text-[#234F3E]" />
            <h2 className="text-sm font-bold text-[#242424]">Queue &amp; Slot Parameters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Max Patients per Time Slot</label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxSlotCapacity}
                onChange={(e) => setMaxSlotCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Default Duration (mins)</label>
              <input
                type="number"
                min={5}
                max={60}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Clinic Opening Time</label>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Clinic Closing Time</label>
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
              />
            </div>
          </div>
        </div>

        {/* Database & Security Info */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
            <Database size={16} className="text-[#234F3E]" />
            <h2 className="text-sm font-bold text-[#242424]">Infrastructure Status</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-[#F4F5F7]">
              <span className="text-gray-500 block">Database Engine</span>
              <span className="font-semibold text-gray-800">MongoDB Atlas (Live Cluster)</span>
            </div>
            <div className="p-3 rounded bg-[#F4F5F7]">
              <span className="text-gray-500 block">Password Hashing</span>
              <span className="font-semibold text-gray-800">Argon2id (RFC 9106)</span>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded text-xs shadow-xs transition cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
