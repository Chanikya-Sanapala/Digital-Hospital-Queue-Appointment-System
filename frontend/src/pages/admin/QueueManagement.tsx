import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Department, QueueToken } from '../../types';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { Phone, Play, CheckCircle, XCircle, RefreshCw, Volume2, UserCheck, AlertCircle } from 'lucide-react';

export const QueueManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data);
        if (res.data.length > 0) {
          setSelectedDeptId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDepts();
  }, []);

  const fetchQueues = useCallback(async () => {
    if (!selectedDeptId) return;
    try {
      const res = await api.get(`/admin/queues?department_id=${selectedDeptId}`);
      setTokens(res.data);
    } catch (e) {
      console.error('Failed to load queues', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDeptId]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  // WebSocket for instant real-time sync with patient screens
  const selectedDept = departments.find((d) => d.id === selectedDeptId);
  useQueueSocket({
    organizationId: selectedDept?.organization_id,
    departmentId: selectedDeptId,
    onEvent: () => {
      fetchQueues();
    },
  });

  const handleCallNext = async () => {
    if (!selectedDeptId) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.post(`/admin/queues/${selectedDeptId}/call-next`);
      setMessage({
        text: `Successfully called patient token #${res.data.token_number} for consultation.`,
        type: 'success',
      });
      fetchQueues();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to call next token.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartService = async (tokenId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await api.patch(`/admin/tokens/${tokenId}/start`);
      setMessage({ text: 'Patient consultation marked as in-service.', type: 'success' });
      fetchQueues();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to start service.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async (tokenId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await api.patch(`/admin/tokens/${tokenId}/complete`);
      setMessage({ text: 'Consultation completed and logged successfully.', type: 'success' });
      fetchQueues();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to complete service.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkMissed = async (tokenId: string) => {
    if (!window.confirm('Mark this customer as missed?')) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await api.patch(`/admin/tokens/${tokenId}/missed`);
      setMessage({ text: 'Token marked as missed.', type: 'success' });
      fetchQueues();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to update token.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const waitingCount = tokens.filter((t) => t.status === 'waiting').length;
  const inServiceCount = tokens.filter((t) => t.status === 'in_service' || t.status === 'called').length;

  return (
    <div className="space-y-6">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Operational Queue Management
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Call patients sequentially, manage clinical consultations, and track wait times.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="px-3 py-2 border border-[#E5E7EB] rounded-md text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-[#234F3E]"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.queue_prefix})
              </option>
            ))}
          </select>

          <button
            onClick={handleCallNext}
            disabled={actionLoading || waitingCount === 0}
            className="px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Volume2 size={14} />
            <span>Call Next Customer</span>
          </button>

          <button
            onClick={fetchQueues}
            className="p-2 border border-[#E5E7EB] hover:bg-gray-50 rounded-md text-gray-600 transition"
            title="Refresh Queue"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {message && (
        <div
          className={`p-3.5 rounded-md border text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Summary Mini Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB] text-xs">
          <span className="text-[#777777] block">Waiting for Service</span>
          <span className="text-xl font-bold text-amber-600 mt-0.5 block">{waitingCount} Patients</span>
        </div>
        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB] text-xs">
          <span className="text-[#777777] block">Active In Consultation</span>
          <span className="text-xl font-bold text-[#234F3E] mt-0.5 block">{inServiceCount} Patients</span>
        </div>
        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB] text-xs">
          <span className="text-[#777777] block">Selected Department</span>
          <span className="text-xl font-bold text-[#242424] mt-0.5 block">
            {selectedDept?.name || 'All'}
          </span>
        </div>
      </div>

      {/* Operational Queue Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#242424]">
            Patient Queue Roster ({selectedDept?.name})
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            {tokens.length} total entries today
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading queue roster...</div>
        ) : tokens.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-500 space-y-2">
            <div>No patients in the queue for this department today.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
              <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                <tr>
                  <th className="px-4 py-3">Token #</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Slot / Booking Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3.5 font-bold text-sm text-[#234F3E]">
                      {token.token_number}
                    </td>
                    <td className="px-4 py-3.5 font-medium">{token.customer_name}</td>
                    <td className="px-4 py-3.5 text-gray-500 font-mono">{token.customer_mobile}</td>
                    <td className="px-4 py-3.5 text-gray-600">{token.service_name || 'Standard'}</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {token.appointment_time || new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          token.status === 'called'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                            : token.status === 'in_service'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : token.status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : token.status === 'missed'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : token.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {token.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {token.status === 'called' && (
                        <>
                          <button
                            onClick={() => handleStartService(token.id)}
                            className="px-2.5 py-1 bg-[#234F3E] hover:bg-[#193a2e] text-white rounded text-[11px] font-medium transition cursor-pointer"
                          >
                            Start Service
                          </button>
                          <button
                            onClick={() => handleMarkMissed(token.id)}
                            className="px-2 py-1 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded text-[11px] transition cursor-pointer"
                          >
                            Missed
                          </button>
                        </>
                      )}

                      {token.status === 'in_service' && (
                        <button
                          onClick={() => handleCompleteService(token.id)}
                          className="px-2.5 py-1 bg-[#88C65A] hover:bg-[#77B34C] text-white rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          Complete Service
                        </button>
                      )}

                      {token.status === 'waiting' && (
                        <button
                          onClick={() => handleMarkMissed(token.id)}
                          className="px-2 py-1 text-gray-400 hover:text-red-600 text-[11px] transition"
                        >
                          Mark Missed
                        </button>
                      )}

                      {token.status === 'completed' && (
                        <span className="text-[11px] text-gray-400">Completed</span>
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

