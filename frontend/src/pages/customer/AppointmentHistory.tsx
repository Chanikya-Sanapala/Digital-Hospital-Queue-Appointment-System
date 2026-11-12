import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Appointment } from '../../types';
import { Calendar, Filter, ArrowRight } from 'lucide-react';

export const AppointmentHistory: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/appointments/me');
        setAppointments(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filtered = appointments.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Appointment History
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Review past and scheduled clinic visits and digital tokens.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1 bg-white border border-[#E5E7EB] rounded-md p-1 text-xs">
          {['all', 'booked', 'in_service', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded capitalize transition ${
                filter === tab
                  ? 'bg-[#234F3E] text-white font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading appointment records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Calendar size={28} className="mx-auto text-gray-400" />
            <h3 className="text-sm font-semibold text-[#242424]">No Records Found</h3>
            <p className="text-xs text-[#777777]">There are no appointments matching the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
              <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                <tr>
                  <th className="px-5 py-3">Token #</th>
                  <th className="px-5 py-3">Hospital</th>
                  <th className="px-5 py-3">Department &amp; Service</th>
                  <th className="px-5 py-3">Appointment Date &amp; Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-bold text-[#234F3E]">
                      {app.token_number || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{app.organization_name}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold">{app.department_name}</div>
                      <div className="text-[11px] text-gray-500">{app.service_name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{app.appointment_date}</div>
                      <div className="text-[11px] text-gray-500">{app.time_slot}</div>
                    </td>
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5 text-right">
                      {app.token_id && (
                        <Link
                          to={`/customer/ticket?id=${app.token_id}`}
                          className="text-[#234F3E] hover:underline font-semibold"
                        >
                          View Ticket
                        </Link>
                      )}
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

