import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Appointment, QueueToken } from '../../types';
import { Clock, Calendar, Ticket, Users, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTokenData, setActiveTokenData] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [tokenRes, appRes] = await Promise.all([
        api.get('/queue/active/me'),
        api.get('/appointments/me'),
      ]);

      if (tokenRes.data.has_active) {
        setActiveTokenData(tokenRes.data.token);
      } else {
        setActiveTokenData(null);
      }
      setAppointments(appRes.data);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const nextAppointment = appointments.find(
    (a) => a.status === 'booked' || a.status === 'in_service'
  );

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Welcome Back, {user?.first_name || 'Patient'}
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Monitor your digital tokens and appointments in real time.
          </p>
        </div>

        <Link
          to="/customer/book"
          className="inline-flex items-center justify-center px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition"
        >
          Book New Appointment
        </Link>
      </div>

      {/* Active Token Notification Spotlight Banner */}
      {activeTokenData && (
        <div className="bg-[#234F3E] text-white rounded-lg p-5 shadow-sm border border-[#193a2e]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#88C65A] text-white uppercase tracking-wider">
                  {activeTokenData.status === 'called' ? 'NOW CALLED' : 'ACTIVE QUEUE TICKET'}
                </span>
                <span className="text-xs text-gray-200">
                  {activeTokenData.department_name} • {activeTokenData.organization_name}
                </span>
              </div>
              <div className="text-2xl font-extrabold tracking-tight">
                Token #{activeTokenData.token_number}
              </div>
              <p className="text-xs text-gray-200">
                {activeTokenData.position_info?.people_ahead !== undefined && (
                  <span>
                    {activeTokenData.position_info.people_ahead} customer(s) ahead of you in line.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to={`/customer/ticket?id=${activeTokenData.id}`}
                className="px-3.5 py-1.5 bg-white text-[#234F3E] font-medium text-xs rounded hover:bg-gray-100 transition shadow-xs"
              >
                View Ticket
              </Link>
              <Link
                to={`/customer/queue?id=${activeTokenData.id}`}
                className="px-3.5 py-1.5 bg-[#88C65A] text-white font-medium text-xs rounded hover:bg-[#77B34C] transition shadow-xs flex items-center space-x-1"
              >
                <span>Live Queue</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Upcoming Appointment */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium mb-1">
            Upcoming Appointment
          </div>
          <div className="text-base font-bold text-[#242424]">
            {nextAppointment ? nextAppointment.appointment_date : 'None Scheduled'}
          </div>
          <div className="text-xs text-[#777777] mt-1 truncate">
            {nextAppointment ? `${nextAppointment.time_slot} • ${nextAppointment.department_name}` : 'Ready to schedule'}
          </div>
        </div>

        {/* Card 2: Active Queue Token */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium mb-1">
            Active Queue Token
          </div>
          <div className="text-base font-bold text-[#234F3E]">
            {activeTokenData ? activeTokenData.token_number : 'None'}
          </div>
          <div className="text-xs text-[#777777] mt-1 capitalize">
            {activeTokenData ? `Status: ${activeTokenData.status}` : 'No active queue token'}
          </div>
        </div>

        {/* Card 3: Queue Position */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium mb-1">
            Queue Position
          </div>
          <div className="text-base font-bold text-[#242424]">
            {activeTokenData?.position_info ? `#${activeTokenData.position_info.position}` : '—'}
          </div>
          <div className="text-xs text-[#777777] mt-1">
            {activeTokenData?.position_info?.people_ahead !== undefined
              ? `${activeTokenData.position_info.people_ahead} ahead`
              : 'Standby'}
          </div>
        </div>

        {/* Card 4: Estimated Waiting Time */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium mb-1">
            Estimated Waiting Time
          </div>
          <div className="text-base font-bold text-[#88C65A]">
            {activeTokenData?.position_info?.estimated_wait_minutes !== undefined
              ? `~${activeTokenData.position_info.estimated_wait_minutes} mins`
              : '—'}
          </div>
          <div className="text-xs text-[#777777] mt-1">
            {activeTokenData ? 'Calculated from live pace' : 'Not in queue'}
          </div>
        </div>
      </div>

      {/* Appointments List Section */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#242424]">
            Your Appointments
          </h2>
          <Link
            to="/customer/history"
            className="text-xs text-[#234F3E] hover:underline font-medium"
          >
            View Full History
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#777777]">
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <h3 className="text-sm font-semibold text-[#242424]">No Appointments Found</h3>
            <p className="text-xs text-[#777777] max-w-sm mx-auto">
              You haven't scheduled any doctor appointments yet. Choose a department to get your digital queue ticket.
            </p>
            <div className="pt-2">
              <Link
                to="/customer/book"
                className="inline-block px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition"
              >
                Schedule First Appointment
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
              <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                <tr>
                  <th className="px-5 py-3">Token #</th>
                  <th className="px-5 py-3">Hospital / Organization</th>
                  <th className="px-5 py-3">Department &amp; Service</th>
                  <th className="px-5 py-3">Date &amp; Slot</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                {appointments.slice(0, 5).map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-bold text-[#234F3E]">
                      {app.token_number || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{app.organization_name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{app.department_name}</div>
                      <div className="text-[11px] text-[#777777]">{app.service_name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{app.appointment_date}</div>
                      <div className="text-[11px] text-[#777777]">{app.time_slot}</div>
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

