import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, Phone, Mail, ShieldCheck, Search } from 'lucide-react';

export const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/admin/customers');
        setCustomers(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(term) ||
      c.last_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.mobile?.includes(term) ||
      c.username?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Registered Patients
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Directory of registered patient profiles and mobile verification statuses.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 pl-8 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
          />
          <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading patients...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">No patient records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
              <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                <tr>
                  <th className="px-5 py-3">Patient Name</th>
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Mobile Number</th>
                  <th className="px-5 py-3">Gender / DOB</th>
                  <th className="px-5 py-3">Verification</th>
                  <th className="px-5 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-bold text-[#242424]">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">@{c.username}</td>
                    <td className="px-5 py-3.5 text-gray-700">{c.email}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-600">{c.mobile}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {c.gender || '—'} {c.dob ? `(${c.dob})` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.is_verified ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck size={11} />
                          <span>OTP Verified</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

