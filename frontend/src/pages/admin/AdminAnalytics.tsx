import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AdminAnalytics as AnalyticsType } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(7);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/analytics?days=${days}`);
      setData(res.data);
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Hospital Analytics &amp; Reporting
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Database-aggregated performance metrics, throughput, and service duration trends.
          </p>
        </div>

        {/* Date Window Filter */}
        <div className="flex items-center space-x-1 bg-white border border-[#E5E7EB] rounded-md p-1 text-xs">
          {[
            { label: 'Past 7 Days', val: 7 },
            { label: 'Past 14 Days', val: 14 },
            { label: 'Past 30 Days', val: 30 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDays(item.val)}
              className={`px-3 py-1 rounded transition ${
                days === item.val
                  ? 'bg-[#234F3E] text-white font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-10 text-center text-xs text-gray-500">
          Running database aggregations...
        </div>
      ) : !data ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-8 text-center text-xs text-gray-500">
          Unable to generate analytics report.
        </div>
      ) : (
        <>
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
              <span className="text-xs text-[#777777] font-medium block">Total Volume</span>
              <span className="text-2xl font-bold text-[#242424] mt-1 block">
                {data.total_appointments}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Booked appointments</span>
            </div>

            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
              <span className="text-xs text-[#777777] font-medium block">Completed Patients</span>
              <span className="text-2xl font-bold text-[#234F3E] mt-1 block">
                {data.completed_appointments}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Discharged successfully</span>
            </div>

            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
              <span className="text-xs text-[#777777] font-medium block">Avg Waiting Time</span>
              <span className="text-2xl font-bold text-[#88C65A] mt-1 block">
                {data.average_waiting_time_minutes} min
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">From token to call</span>
            </div>

            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4.5 shadow-xs">
              <span className="text-xs text-[#777777] font-medium block">Avg Consultation Duration</span>
              <span className="text-2xl font-bold text-[#242424] mt-1 block">
                {data.average_service_duration_minutes} min
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Active doctor service</span>
            </div>
          </div>

          {/* Daily Volume Bar Chart */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#242424]">Daily Appointment Volume &amp; Completion</h2>
                <p className="text-xs text-[#777777]">Actual volume records over the last {days} days</p>
              </div>
            </div>

            <div className="h-64 w-full">
              {data.daily_volume.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  Insufficient history for chart rendering.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily_volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#777777" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#777777" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="total" name="Total Bookings" fill="#234F3E" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#88C65A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cancelled" name="Cancelled" fill="#E5E7EB" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-bold text-[#242424]">Department Throughput Performance</h2>
              <p className="text-xs text-[#777777]">Clinical patient distribution and average durations</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                  <tr>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Total Tokens</th>
                    <th className="px-5 py-3">Completed Services</th>
                    <th className="px-5 py-3">Currently Waiting</th>
                    <th className="px-5 py-3">Avg Service Duration</th>
                    <th className="px-5 py-3">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                  {data.department_performance.map((dept) => {
                    const rate = dept.total_tokens > 0
                      ? Math.round((dept.completed_tokens / dept.total_tokens) * 100)
                      : 0;
                    return (
                      <tr key={dept.department_id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5 font-bold text-[#242424]">{dept.department_name}</td>
                        <td className="px-5 py-3.5 font-semibold">{dept.total_tokens}</td>
                        <td className="px-5 py-3.5 text-[#234F3E] font-semibold">{dept.completed_tokens}</td>
                        <td className="px-5 py-3.5 text-amber-600 font-semibold">{dept.waiting_tokens}</td>
                        <td className="px-5 py-3.5 text-gray-600">{dept.avg_service_duration_minutes} mins</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#88C65A] h-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="font-medium text-gray-700">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

