'use client';

import { useState, useEffect } from 'react';
import { api, StaffDashboardData, Counter, QueueEntry, QueueItem, WS_BASE_URL } from '../../lib/api';
import { 
  Users, Play, CheckCircle2, PauseCircle, PhoneOff, RotateCcw, 
  Clock, AlertCircle, RefreshCw, Radio, Shield, Check, UserCheck 
} from 'lucide-react';
import LiveClockIST from '../../components/LiveClockIST';

export default function StaffDeskPage() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [selectedCounterId, setSelectedCounterId] = useState<string>('cnt-001');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const loadQueues = async () => {
    try {
      const qList = await api.getQueues();
      setQueues(qList);
      if (!selectedQueueId && qList.length > 0) {
        setSelectedQueueId(qList[0].id);
      }
      return qList;
    } catch (err: any) {
      console.error('Failed to load queues:', err);
      return [];
    }
  };

  const loadDashboard = async (qId?: string) => {
    const targetQ = qId || selectedQueueId;
    if (!targetQ) return;
    try {
      const dashData = await api.getStaffDashboard(targetQ);
      setData(dashData);
    } catch (err: any) {
      console.error('Failed to load staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadQueues().then((list) => {
      const firstId = list[0]?.id;
      if (firstId) {
        loadDashboard(firstId);
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Fetch when queue selection changes
  useEffect(() => {
    if (selectedQueueId) {
      loadDashboard(selectedQueueId);
    }
  }, [selectedQueueId]);

  // Resilient WebSocket Live Sync with Auto-Reconnect
  useEffect(() => {
    if (!selectedQueueId) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isSubscribed = true;

    const connectWs = () => {
      if (!isSubscribed) return;
      try {
        ws = new WebSocket(`${WS_BASE_URL}/queues/${selectedQueueId}`);
        ws.onopen = () => {
          if (isSubscribed) setWsConnected(true);
        };
        ws.onmessage = () => {
          if (isSubscribed) loadDashboard(selectedQueueId);
        };
        ws.onclose = () => {
          if (isSubscribed) {
            setWsConnected(false);
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };
        ws.onerror = () => {
          if (isSubscribed) {
            setWsConnected(false);
            ws?.close();
          }
        };
      } catch (e) {
        if (isSubscribed) {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    // Adaptive fallback polling: 25s when WebSocket is active, 6s when disconnected
    const pollIntervalMs = wsConnected ? 25000 : 6000;
    const interval = setInterval(() => {
      if (isSubscribed) loadDashboard(selectedQueueId);
    }, pollIntervalMs);

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(interval);
    };
  }, [selectedQueueId, wsConnected]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Staff Actions
  const handleCallNext = async () => {
    if (!selectedQueueId || !selectedCounterId) return;
    setActionLoading(true);
    try {
      const res = await api.callNext(selectedQueueId, selectedCounterId);
      showToast(res.message);
      await loadDashboard(selectedQueueId);
    } catch (err: any) {
      alert(err.message || 'Failed to call visitor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartService = async (ticketId: string) => {
    setActionLoading(true);
    try {
      const res = await api.startService(ticketId);
      showToast(res.message);
      await loadDashboard(selectedQueueId);
    } catch (err: any) {
      alert(err.message || 'Failed to start service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async (ticketId: string) => {
    setActionLoading(true);
    try {
      const res = await api.completeService(ticketId);
      showToast(res.message);
      await loadDashboard(selectedQueueId);
    } catch (err: any) {
      alert(err.message || 'Failed to complete service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async (ticketId: string) => {
    if (!confirm('Mark visitor as No-Show and release counter?')) return;
    setActionLoading(true);
    try {
      const res = await api.markNoShow(ticketId);
      showToast(res.message);
      await loadDashboard(selectedQueueId);
    } catch (err: any) {
      alert(err.message || 'Failed to mark no-show.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequeue = async (ticketId: string) => {
    setActionLoading(true);
    try {
      const res = await api.requeueTicket(ticketId);
      showToast(res.message);
      await loadDashboard(selectedQueueId);
    } catch (err: any) {
      alert(err.message || 'Failed to requeue visitor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePause = async (counter: Counter) => {
    setActionLoading(true);
    try {
      if (counter.status === 'PAUSED') {
        const res = await api.resumeCounter(counter.id);
        showToast(res.message);
      } else {
        const res = await api.pauseCounter(counter.id);
        showToast(res.message);
      }
      await loadDashboard(selectedQueueId);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle counter status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Staff Portal
            </span>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span>{wsConnected ? 'Live Synchronized' : 'Polling Sync'}</span>
            </div>
            <LiveClockIST showDate={true} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Service Desk Operations
          </h1>
        </div>

        {/* Queue Selector & Controls */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Queue:</label>
          <select
            value={selectedQueueId}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.service_name || q.name} ({q.waiting_count} waiting)
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              loadDashboard(selectedQueueId);
              loadQueues();
            }}
            title="Refresh dashboard state"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {loading || !data ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Loading desk operations data...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* COUNTERS STRIP */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Facility Desks & Counter Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.counters.map((c) => {
                const isSelected = selectedCounterId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCounterId(c.id)}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Desk #{c.counter_number}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : c.status === 'BUSY'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 text-xs">
                      {c.current_token_number ? (
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {c.current_token_number}
                          </span>
                          <span className="text-slate-500">{c.current_visitor_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No active visitor assigned</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500">
                        {isSelected ? '✓ Operating this desk' : 'Click to select desk'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePause(c);
                        }}
                        disabled={c.status === 'BUSY'}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 disabled:opacity-40"
                      >
                        {c.status === 'PAUSED' ? 'Resume Counter' : 'Pause Counter'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE DISK OPERATIONS BAR */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selected Counter:</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {data.counters.find((c) => c.id === selectedCounterId)?.name || 'Desk 1'}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 flex items-center space-x-2 text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Call Next Visitor</span>
                </button>
              </div>
            </div>
          </div>

          {/* DUAL WORKSPACE: IN-SERVICE TICKETS & WAITING QUEUE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Active Tickets In Service */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Calls & Services ({data.in_service_entries.length})
              </h2>

              {data.in_service_entries.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                  No visitors currently called or in service. Click &ldquo;Call Next Visitor&rdquo; to begin.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.in_service_entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                            {entry.token_number}
                          </span>
                          <p className="text-xs text-slate-500 mt-0.5">{entry.visitor_name || 'Guest'}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold ${
                            entry.status === 'CALLED'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {entry.status === 'CALLED' && (
                          <button
                            onClick={() => handleStartService(entry.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Start Service
                          </button>
                        )}
                        {entry.status === 'IN_SERVICE' && (
                          <button
                            onClick={() => handleCompleteService(entry.id)}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleNoShow(entry.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Mark No-Show
                        </button>
                        <button
                          onClick={() => handleRequeue(entry.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Requeue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waiting Queue List */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Waiting Queue Order ({data.waiting_entries.length})
              </h2>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold uppercase">Token</th>
                      <th className="px-4 py-3 text-left font-bold uppercase">Visitor</th>
                      <th className="px-4 py-3 text-left font-bold uppercase">Priority</th>
                      <th className="px-4 py-3 text-left font-bold uppercase">Joined At</th>
                      <th className="px-4 py-3 text-right font-bold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.waiting_entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                          No visitors currently waiting in this queue.
                        </td>
                      </tr>
                    ) : (
                      data.waiting_entries.map((w, idx) => (
                        <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                            {w.token_number}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                            {w.visitor_name || 'Guest'}
                          </td>
                          <td className="px-4 py-3">
                            {w.priority > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Priority ({w.priority})
                              </span>
                            ) : (
                              <span className="text-slate-400">Standard</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {new Date(w.joined_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Asia/Kolkata',
                            })} IST
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              #{idx + 1} Waiting
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
