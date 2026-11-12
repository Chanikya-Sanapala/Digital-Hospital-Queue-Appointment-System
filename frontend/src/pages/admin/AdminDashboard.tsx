import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AdminMetrics } from '../../types';
import { Users, Clock, CheckCircle2, Calendar, ArrowRight, Play, Check, AlertCircle } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [activeQueues, setActiveQueues] = useState<any[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [departmentSummary, setDepartmentSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setMetrics(res.data.metrics);
      setActiveQueues(res.data.active_queues || []);
      setRecentAppointments(res.data.recent_appointments || []);
      setDepartmentSummary(res.data.department_summary || []);
    } catch (e) {
      console.error('Failed to load admin dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Admin Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Hospital Operations Overview
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Real-time patient flow, active clinical queues and department capacity.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/queues"
            className="px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5"
          >
            <span>Live Queue Console</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium">
            Total Appointments Today
          </div>
          <div className="text-2xl font-bold text-[#242424] mt-1">
            {metrics ? metrics.total_appointments_today : '—'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            All registered clinic bookings
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium">
            Waiting Customers
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {metrics ? metrics.waiting_customers : '—'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            In physical / digital waiting rooms
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium">
            Completed Services
          </div>
          <div className="text-2xl font-bold text-[#234F3E] mt-1">
            {metrics ? metrics.completed_services : '—'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Discharged consultations today
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
          <div className="text-xs text-[#777777] font-medium">
            Average Waiting Time
          </div>
          <div className="text-2xl font-bold text-[#88C65A] mt-1">
            {metrics ? `${metrics.average_waiting_time_minutes} min` : '—'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Calculated from completed calls
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Queues & Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Queue Table */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#242424]">
              Active Patient Queues (Today)
            </h2>
            <Link to="/admin/queues" className="text-xs text-[#234F3E] hover:underline font-medium">
              Manage Queues &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading queues...</div>
          ) : activeQueues.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No active queue tokens currently waiting.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                  <tr>
                    <th className="px-4 py-2.5">Token #</th>
                    <th className="px-4 py-2.5">Patient</th>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                  {activeQueues.slice(0, 7).map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-bold text-[#234F3E]">{q.token_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{q.customer_name}</div>
                        <div className="text-[10px] text-gray-500">{q.customer_mobile}</div>
                      </td>
                      <td className="px-4 py-3">{q.department_name}</td>
                      <td className="px-4 py-3 text-gray-500">{q.appointment_time || 'Walk-in'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            q.status === 'called'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : q.status === 'in_service'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Department Performance Summary */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs p-5 space-y-4">
          <div className="border-b border-[#E5E7EB] pb-3">
            <h2 className="text-sm font-bold text-[#242424]">Department Performance</h2>
            <p className="text-[11px] text-[#777777]">Live volume breakdown</p>
          </div>

          {departmentSummary.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">No department activity recorded today.</div>
          ) : (
            <div className="space-y-3">
              {departmentSummary.map((d) => (
                <div key={d.department_id} className="p-3 rounded-md bg-[#F4F5F7] border border-gray-200 text-xs">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-[#242424]">{d.department_name}</span>
                    <span className="text-[10px] text-gray-500">{d.avg_service_duration_minutes}m avg visit</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#777777]">
                    <span>Total Tokens: <strong>{d.total_tokens}</strong></span>
                    <span>Completed: <strong className="text-[#234F3E]">{d.completed_tokens}</strong></span>
                    <span>Waiting: <strong className="text-amber-600">{d.waiting_tokens}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/admin/analytics"
              className="text-xs text-[#234F3E] hover:underline font-semibold block text-center"
            >
              View Detailed Analytics &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Appointments Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#242424]">Recent Appointment Bookings</h2>
          <Link to="/admin/appointments" className="text-xs text-[#234F3E] hover:underline font-medium">
            View All Bookings &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
            <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
              <tr>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Facility</th>
                <th className="px-5 py-3">Department &amp; Service</th>
                <th className="px-5 py-3">Date &amp; Slot</th>
                <th className="px-5 py-3">Token #</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
              {recentAppointments.slice(0, 6).map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold">{app.customer_name}</div>
                    <div className="text-[10px] text-gray-500">{app.customer_mobile}</div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{app.organization_name}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{app.department_name}</div>
                    <div className="text-[11px] text-gray-500">{app.service_name}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>{app.appointment_date}</div>
                    <div className="text-[11px] text-gray-500">{app.time_slot}</div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-[#234F3E]">
                    {app.token_number || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        app.status === 'booked'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
      </div>
    </div>
  );
};

