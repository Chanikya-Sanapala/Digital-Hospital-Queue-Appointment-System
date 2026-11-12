import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { QueuePosition, QueueToken } from '../../types';
import { Radio, Users, Clock, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export const LiveQueue: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenIdParam = searchParams.get('id');

  const [token, setToken] = useState<QueueToken | null>(null);
  const [position, setPosition] = useState<QueuePosition | null>(null);
  const [departmentQueue, setDepartmentQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLiveQueueData = useCallback(async () => {
    try {
      let currentToken = token;
      if (!currentToken) {
        if (tokenIdParam) {
          const tRes = await api.get(`/queue/${tokenIdParam}`);
          currentToken = tRes.data;
          setToken(tRes.data);
        } else {
          const activeRes = await api.get('/queue/active/me');
          if (activeRes.data.has_active) {
            currentToken = activeRes.data.token;
            setToken(activeRes.data.token);
          }
        }
      }

      if (currentToken) {
        const [posRes, deptRes] = await Promise.all([
          api.get(`/queue/${currentToken.id}/position`),
          api.get(`/queue/status/${currentToken.department_id}`),
        ]);
        setPosition(posRes.data);
        setDepartmentQueue(deptRes.data);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch live queue', e);
    } finally {
      setLoading(false);
    }
  }, [tokenIdParam, token]);

  useEffect(() => {
    fetchLiveQueueData();
    // Safety polling every 8s
    const interval = setInterval(fetchLiveQueueData, 8000);
    return () => clearInterval(interval);
  }, [fetchLiveQueueData]);

  // Connect to WebSocket room for real-time instant event pushes!
  const { isConnected } = useQueueSocket({
    organizationId: token?.organization_id,
    departmentId: token?.department_id,
    onEvent: (event) => {
      console.log('Real-time WS event received:', event);
      // Immediately refresh position & queue
      fetchLiveQueueData();
    },
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-10 text-center text-xs text-[#777777]">
        Loading live queue status...
      </div>
    );
  }

  if (!token || !position) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-10 text-center space-y-3">
        <Users size={32} className="mx-auto text-gray-400" />
        <h2 className="text-sm font-bold text-[#242424]">No Live Queue Selected</h2>
        <p className="text-xs text-[#777777] max-w-sm mx-auto">
          Please select an active ticket to track its position in the live clinic queue.
        </p>
        <Link
          to="/customer"
          className="inline-block px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isNowServing = position.token_number === position.currently_serving;
  const isCalled = position.status === 'called';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with Live WebSocket Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
              Live Queue Tracker
            </h1>
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#88C65A] animate-pulse' : 'bg-amber-500'}`} />
              <span>{isConnected ? 'Real-Time Live' : 'Connecting WebSocket...'}</span>
            </span>
          </div>
          <p className="text-xs text-[#777777] mt-0.5">
            {position.department_name} • {position.organization_name}
          </p>
        </div>

        <button
          onClick={fetchLiveQueueData}
          className="self-start sm:self-auto px-3 py-1.5 border border-[#E5E7EB] hover:bg-gray-50 rounded text-xs text-gray-600 flex items-center space-x-1.5 transition"
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Called Alert Spotlight */}
      {isCalled && (
        <div className="p-4 rounded-lg bg-blue-600 text-white shadow-md flex items-center justify-between animate-pulse">
          <div className="space-y-0.5">
            <div className="text-xs uppercase tracking-wider font-bold text-blue-200">Attention Required</div>
            <div className="text-lg font-bold">Your Token #{position.token_number} Has Been Called!</div>
            <div className="text-xs text-blue-100">Please proceed directly to the doctor's consultation desk.</div>
          </div>
        </div>
      )}

      {/* Main Queue Status Board Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] p-6 space-y-6">
        {/* Top 2 Big Numbers: Currently Serving vs Your Token */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Currently Serving */}
          <div className="p-5 rounded-lg bg-[#F4F5F7] border border-gray-200 text-center">
            <span className="text-xs font-semibold text-[#777777] uppercase tracking-wider block">
              Currently Serving
            </span>
            <span className="text-4xl font-extrabold text-[#234F3E] block mt-1 tracking-tight">
              {position.currently_serving || 'None'}
            </span>
            <span className="text-[11px] text-gray-500 mt-1 block">
              In consultation room
            </span>
          </div>

          {/* Your Token */}
          <div className="p-5 rounded-lg bg-emerald-50/50 border border-emerald-200 text-center">
            <span className="text-xs font-semibold text-[#234F3E] uppercase tracking-wider block">
              Your Token Number
            </span>
            <span className="text-4xl font-extrabold text-[#88C65A] block mt-1 tracking-tight">
              {position.token_number}
            </span>
            <span className="text-[11px] text-gray-600 mt-1 block capitalize">
              Your Status: <strong>{position.status}</strong>
            </span>
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-3 gap-3 text-center border-t border-b border-gray-100 py-4">
          <div>
            <span className="text-xs text-[#777777] block font-medium">Position in Queue</span>
            <span className="text-xl font-bold text-[#242424] mt-0.5 block">
              {position.position > 0 ? `#${position.position}` : '—'}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#777777] block font-medium">People Ahead</span>
            <span className="text-xl font-bold text-[#242424] mt-0.5 block">
              {position.people_ahead}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#777777] block font-medium">Estimated Wait</span>
            <span className="text-xl font-bold text-[#88C65A] mt-0.5 block">
              {position.estimated_wait_minutes !== undefined ? `${position.estimated_wait_minutes} min` : '—'}
            </span>
          </div>
        </div>

        {/* Estimation Explanation Note */}
        <div className="text-[11px] text-gray-500 bg-gray-50 p-3 rounded border border-gray-200 space-y-1">
          <div className="font-semibold text-gray-700">How is this calculated?</div>
          <p>
            Estimated wait is computed from active patients ahead multiplied by historical service duration
            (~{departmentQueue?.estimated_wait_per_person_minutes || 15} mins/patient) for {position.department_name}.
          </p>
        </div>

        {/* Department Overview */}
        {departmentQueue && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-[#242424]">Department Queue Overview Today</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-gray-500 block">Waiting</span>
                <span className="font-bold text-gray-800">{departmentQueue.waiting_count} patients</span>
              </div>
              <div className="p-2.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-gray-500 block">In Service</span>
                <span className="font-bold text-gray-800">{departmentQueue.in_service_count} patients</span>
              </div>
              <div className="p-2.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-gray-500 block">Completed Today</span>
                <span className="font-bold text-[#234F3E]">{departmentQueue.completed_today_count} patients</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 text-center">
          <Link
            to="/customer"
            className="text-xs text-[#234F3E] font-medium hover:underline inline-flex items-center space-x-1"
          >
            <ArrowLeft size={12} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

