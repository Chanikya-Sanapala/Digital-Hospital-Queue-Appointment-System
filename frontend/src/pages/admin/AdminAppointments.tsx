import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Appointment } from '../../types';
import { Calendar, Filter, Search } from 'lucide-react';

export const AdminAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = '';
      if (dateFilter) query += `&date=${dateFilter}`;
      if (statusFilter) query += `&status_filter=${statusFilter}`;
      const res = await api.get(`/admin/appointments?${query}`);
      setAppointments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter, statusFilter]);

  const filtered = appointments.filter((app) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      app.customer_name?.toLowerCase().includes(term) ||
      app.customer_mobile?.includes(term) ||
      app.token_number?.toLowerCase().includes(term) ||
      app.department_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Appointment Records
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Complete registry of patient bookings and clinic schedules.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-md text-xs bg-white text-gray-700"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-md text-xs bg-white text-gray-700 capitalize"
          >
            <option value="">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="in_service">In Service</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
          </select>

          {(dateFilter || statusFilter) && (
            <button
              onClick={() => {
                setDateFilter('');
                setStatusFilter('');
              }}
              className="text-xs text-red-600 hover:underline px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by patient name, phone, or token #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 pl-9 border border-[#E5E7EB] rounded-md text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#234F3E]"
        />
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading appointments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">No appointments found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
              <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                <tr>
                  <th className="px-4 py-3">Token #</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date &amp; Slot</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-bold text-[#234F3E]">{app.token_number || '—'}</td>
                    <td className="px-4 py-3 font-medium">{app.customer_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{app.customer_mobile}</td>
                    <td className="px-4 py-3">{app.department_name}</td>
                    <td className="px-4 py-3 text-gray-600">{app.service_name}</td>
                    <td className="px-4 py-3">
                      <div>{app.appointment_date}</div>
                      <div className="text-[10px] text-gray-400">{app.time_slot}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          app.status === 'booked'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : app.status === 'in_service'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : app.status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : app.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {app.status}
                      </span>
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

