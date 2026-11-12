import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { QueueToken } from '../../types';
import { Ticket, Clock, Calendar, ArrowRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const MyTicket: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenId = searchParams.get('id');

  const [token, setToken] = useState<QueueToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchTicket = async () => {
    try {
      if (tokenId) {
        const res = await api.get(`/queue/${tokenId}`);
        setToken(res.data);
      } else {
        // Fetch active token
        const res = await api.get('/queue/active/me');
        if (res.data.has_active) {
          setToken(res.data.token);
        } else {
          // If no active token, fetch latest appointment
          const appRes = await api.get('/appointments/me');
          if (appRes.data.length > 0 && appRes.data[0].token_id) {
            const tRes = await api.get(`/queue/${appRes.data[0].token_id}`);
            setToken(tRes.data);
          }
        }
      }
    } catch (e: any) {
      setError('Unable to retrieve digital ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    // Poll every 10s as fallback if socket not open
    const interval = setInterval(fetchTicket, 10000);
    return () => clearInterval(interval);
  }, [tokenId]);

  const handleCancelAppointment = async () => {
    if (!token?.appointment_id) return;
    setCancelling(true);
    try {
      await api.patch(`/appointments/${token.appointment_id}/cancel`);
      setShowCancelModal(false);
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'called':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_service':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'missed':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-10 text-center text-xs text-gray-500">
        Loading digital queue ticket...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-10 text-center space-y-3">
        <Ticket size={32} className="mx-auto text-gray-400" />
        <h2 className="text-sm font-bold text-[#242424]">No Active Ticket Found</h2>
        <p className="text-xs text-[#777777] max-w-sm mx-auto">
          You currently have no active appointments in the digital queue.
        </p>
        <Link
          to="/customer/book"
          className="inline-block px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition"
        >
          Book an Appointment
        </Link>
      </div>
    );
  }

  const isCancellable = token.status === 'waiting';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
          My Digital Ticket
        </h1>
        <p className="text-xs text-[#777777] mt-0.5">
          Present this ticket at the clinic reception or monitor live wait times.
        </p>
      </div>

      {/* Pristine Digital Ticket Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Top Header of Ticket */}
        <div className="bg-[#234F3E] text-white p-5 text-center relative">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#88C65A] mb-1">
            QueueSense — Digital Queue Ticket
          </div>
          <div className="text-4xl font-extrabold tracking-tight mt-1 text-white">
            {token.token_number}
          </div>
          <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 capitalize">
            <span>Status:</span>
            <span className="text-[#88C65A] font-bold">{token.status}</span>
          </div>
        </div>

        {/* Ticket Perforation Graphic Line */}
        <div className="relative border-b-2 border-dashed border-[#E5E7EB] my-1">
          <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[#F4F5F7] border-r border-[#E5E7EB]" />
          <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-[#F4F5F7] border-l border-[#E5E7EB]" />
        </div>

        {/* Ticket Details */}
        <div className="p-6 space-y-4 text-xs text-[#242424]">
          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-100">
            <div>
              <span className="text-[#777777] text-[11px] block">Customer Name</span>
              <span className="font-semibold text-sm">{token.customer_name}</span>
            </div>
            <div>
              <span className="text-[#777777] text-[11px] block">Mobile Number</span>
              <span className="font-medium text-sm">{token.customer_mobile}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-100">
            <div>
              <span className="text-[#777777] text-[11px] block">Healthcare Facility</span>
              <span className="font-semibold">{token.organization_name}</span>
            </div>
            <div>
              <span className="text-[#777777] text-[11px] block">Department</span>
              <span className="font-semibold text-[#234F3E]">{token.department_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-100">
            <div>
              <span className="text-[#777777] text-[11px] block">Clinical Service</span>
              <span className="font-medium">{token.service_name}</span>
            </div>
            <div>
              <span className="text-[#777777] text-[11px] block">Appointment Slot</span>
              <span className="font-medium">{token.appointment_date} ({token.appointment_time})</span>
            </div>
          </div>

          {/* Live Queue Position & Wait Estimation */}
          <div className="bg-[#F4F5F7] rounded-lg p-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="text-[11px] text-[#777777] block font-medium">Position in Line</span>
              <span className="text-xl font-bold text-[#242424]">
                {token.position_in_queue ? `#${token.position_in_queue}` : '—'}
              </span>
              <span className="text-[10px] text-gray-500 block">
                {token.people_ahead !== undefined ? `${token.people_ahead} people ahead` : ''}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#777777] block font-medium">Est. Wait Time</span>
              <span className="text-xl font-bold text-[#88C65A]">
                {token.estimated_waiting_time_minutes !== undefined ? `${token.estimated_waiting_time_minutes} min` : '—'}
              </span>
              <span className="text-[10px] text-gray-500 block">based on service history</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              to={`/customer/queue?id=${token.id}`}
              className="flex-1 py-2.5 px-4 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded-md text-xs transition shadow-xs text-center flex items-center justify-center space-x-1.5"
            >
              <span>View Live Queue Tracker</span>
              <ArrowRight size={14} />
            </Link>

            {isCancellable && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="py-2.5 px-4 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-md text-xs transition cursor-pointer"
              >
                Cancel Appointment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-sm text-[#242424]">Cancel Appointment?</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to cancel token <strong>#{token.token_number}</strong>? Your queue position will be released.
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 border border-[#E5E7EB] text-xs font-medium text-gray-600 rounded hover:bg-gray-50"
              >
                Keep Ticket
              </button>
              <button
                type="button"
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

