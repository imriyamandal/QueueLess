'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, TicketDetail, WS_BASE_URL } from '../../../lib/api';
import { requestPushPermissionAndGetToken, showLocalNotification, onForegroundMessage } from '../../../lib/firebase';
import LiveClockIST from '../../../components/LiveClockIST';
import { 
  Clock, Users, MapPin, AlertCircle, ArrowLeft, CheckCircle2, 
  XCircle, Bell, RefreshCw, Radio, Compass, ShieldCheck, 
  Smartphone, History, Check, Timer 
} from 'lucide-react';
import Link from 'next/link';

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.ticketId as string;

  const [ticketData, setTicketData] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedServiceSeconds, setElapsedServiceSeconds] = useState<number>(0);
  const [turnAlert, setTurnAlert] = useState<string | null>(null);
  const lastStateRef = useRef<{ status?: string; positionAhead?: number }>({});

  // FCM Web Push State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPushEnabled(true);
      }
    }
  }, []);

  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      const res = await requestPushPermissionAndGetToken();
      if (res.token) {
        await api.registerFcmToken(ticketId, res.token);
        setPushEnabled(true);
        setPushFeedback('Push notifications enabled for this ticket!');
      } else {
        setPushFeedback(res.error || 'Permission was not granted.');
      }
    } catch (err: any) {
      setPushFeedback(err?.message || 'Failed to register push token.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('queueless_fcm_token') : null;
      if (token) {
        await api.testFcmPush(token, 'QueueLess Web Push Test', `Test notification for Token ${ticketData?.ticket.token_number || ''}`);
        showLocalNotification('QueueLess Test Alert', {
          body: `Web push delivery verified for Token ${ticketData?.ticket.token_number || ''}.`,
        });
        setPushFeedback('Test push notification delivered!');
      } else {
        setPushFeedback('No device token found. Please re-enable alerts.');
      }
    } catch (err: any) {
      setPushFeedback(err?.message || 'Failed to dispatch test push.');
    } finally {
      setPushLoading(false);
    }
  };

  // Live dynamic remaining wait time (seconds) updating every second as real-world time passes
  const [liveRemainingWait, setLiveRemainingWait] = useState<number | null>(null);

  // Time formatting helper
  const formatSeconds = (sec: number) => {
    if (sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  const formatRemainingWait = (sec: number) => {
    if (sec <= 0) return 'Due any moment';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    if (m >= 5 && s === 0) return `${m} mins`;
    return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
  };

  const formatFacilityTime = (dateStr?: string, tz?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: tz || 'Asia/Kolkata',
      });
    } catch {
      return new Date(dateStr).toLocaleTimeString('en-US', { hour12: true });
    }
  };

  // Live dynamic countdown timer that continuously recalculates remaining wait as real time passes
  useEffect(() => {
    if (ticketData?.ticket.status === 'WAITING' && ticketData?.estimated_turn_time) {
      const targetMs = new Date(ticketData.estimated_turn_time).getTime();
      const updateCountdown = () => {
        const nowMs = Date.now();
        const diffSec = Math.floor((targetMs - nowMs) / 1000);
        setLiveRemainingWait(Math.max(0, diffSec));
      };
      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    } else {
      setLiveRemainingWait(null);
    }
  }, [ticketData?.ticket.status, ticketData?.estimated_turn_time]);

  const loadTicket = async () => {
    if (!ticketId) return;
    try {
      const data = await api.getTicket(ticketId);
      const prev = lastStateRef.current;
      const newStatus = data.ticket.status;
      const newPos = data.position_ahead;

      // Detect transition to CALLED: trigger free browser notification and banner
      if (prev.status && prev.status !== 'CALLED' && newStatus === 'CALLED') {
        const title = `YOUR TURN IS CALLED! (Token ${data.ticket.token_number})`;
        const body = `Please proceed immediately to ${data.ticket.assigned_counter_name || 'the service counter'}.`;
        setTurnAlert(body);
        showLocalNotification(title, { body });
      } else if (
        prev.status === 'WAITING' &&
        newStatus === 'WAITING' &&
        typeof newPos === 'number' &&
        newPos <= 1 &&
        (prev.positionAhead === undefined || prev.positionAhead > 1)
      ) {
        // Approaching alert
        const title = `Your Turn is Approaching! (Token ${data.ticket.token_number})`;
        const body = `Only ${newPos} ahead of you. Please prepare to proceed to the desk.`;
        setTurnAlert(body);
        showLocalNotification(title, { body });
      }

      lastStateRef.current = { status: newStatus, positionAhead: newPos };
      setTicketData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  // Foreground FCM messages
  useEffect(() => {
    let unsubscribe: any = () => {};
    onForegroundMessage((payload) => {
      if (payload?.notification) {
        setTurnAlert(payload.notification.body || 'New queue status update.');
      }
      loadTicket();
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [ticketId]);

  // Live elapsed service timer when IN_SERVICE
  useEffect(() => {
    if (ticketData?.ticket.status === 'IN_SERVICE' && ticketData?.ticket.service_start_at) {
      const startMs = new Date(ticketData.ticket.service_start_at).getTime();
      const updateTimer = () => {
        const nowMs = Date.now();
        setElapsedServiceSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      };
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [ticketData?.ticket.status, ticketData?.ticket.service_start_at]);

  // Resilient WebSocket live synchronization with auto-reconnect
  useEffect(() => {
    if (!ticketData?.ticket.queue_id) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isSubscribed = true;

    const connectWs = () => {
      if (!isSubscribed) return;
      try {
        const url = `${WS_BASE_URL}/queues/${ticketData.ticket.queue_id}`;
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (isSubscribed) setWsConnected(true);
        };
        ws.onmessage = () => {
          if (isSubscribed) loadTicket();
        };
        ws.onclose = () => {
          if (isSubscribed) {
            setWsConnected(false);
            reconnectTimeout = setTimeout(connectWs, 3000);
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
          reconnectTimeout = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();
    const pollIntervalMs = wsConnected ? 20000 : 6000;
    const pollInterval = setInterval(() => {
      if (isSubscribed) loadTicket();
    }, pollIntervalMs);

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, [ticketData?.ticket.queue_id, wsConnected]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your place in this queue?')) return;
    setActionLoading(true);
    try {
      const updated = await api.cancelTicket(ticketId);
      setTicketData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const updated = await api.checkInTicket(ticketId);
      setTicketData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to check in.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Retrieving authoritative ticket details...</p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ticket Unavailable</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{error || 'Ticket not found.'}</p>
        <Link href="/join" className="inline-block mt-4 text-sm font-semibold text-blue-600 hover:underline">
          Return to Queue Selection
        </Link>
      </div>
    );
  }

  const { 
    ticket, position_ahead, estimated_wait_seconds, lower_bound_seconds, 
    upper_bound_seconds, explanation, recommended_departure_time, 
    facility_timezone, estimated_turn_time, turn_time_lower, turn_time_upper,
    status_message, notifications 
  } = ticketData;

  const isApproaching = ticket.status === 'WAITING' && (position_ahead <= 1 || estimated_wait_seconds <= 300);

  const getStatusBadge = () => {
    if (ticket.status === 'CALLED') {
      return (
        <div className="py-2.5 px-3.5 rounded-xl text-center text-xs font-bold bg-amber-500 text-white animate-pulse shadow-md">
          🔔 YOUR TURN IS CALLED! PROCEED TO DESK NOW
        </div>
      );
    }
    if (ticket.status === 'IN_SERVICE') {
      return (
        <div className="py-2.5 px-3.5 rounded-xl text-center text-xs font-bold bg-blue-600 text-white shadow-md flex items-center justify-center space-x-2">
          <Timer className="w-4 h-4 animate-spin" />
          <span>Currently in Service ({formatSeconds(elapsedServiceSeconds)})</span>
        </div>
      );
    }
    if (ticket.status === 'COMPLETED') {
      return (
        <div className="py-2.5 px-3.5 rounded-xl text-center text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center justify-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>Service Completed</span>
        </div>
      );
    }
    if (isApproaching) {
      return (
        <div className="py-2.5 px-3.5 rounded-xl text-center text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse">
          ⚡ Your Turn is Approaching! Head to Service Desk
        </div>
      );
    }
    return (
      <div className="py-2 px-3 rounded-xl text-center text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        Waiting in Queue
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      {/* Top Bar Navigation */}
      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
        <Link href="/join" className="flex items-center space-x-1 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Queues</span>
        </Link>

        {/* Status Indicators & Live Clock */}
        <div className="flex items-center space-x-3">
          <LiveClockIST badgeOnly={true} className="text-xs" />
          <Link href="/app" className="flex items-center space-x-1 hover:text-blue-600 text-slate-500">
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My History</span>
          </Link>
          <div className="flex items-center space-x-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span>{wsConnected ? 'Live' : 'Polling'}</span>
          </div>
        </div>
      </div>

      {/* Prominent Real-time Turn Alert Banner */}
      {turnAlert && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start space-x-2.5">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Live Queue Alert</p>
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mt-0.5">{turnAlert}</p>
            </div>
          </div>
          <button
            onClick={() => setTurnAlert(null)}
            className="text-xs text-amber-700 dark:text-amber-300 font-bold hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIRTUAL TICKET PASS CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center relative">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/20 backdrop-blur-sm mb-2">
            Virtual Ticket
          </div>
          <div className="text-5xl font-black tracking-tight">{ticket.token_number}</div>
          <p className="text-xs text-blue-100 mt-1 font-medium">{ticketData.service_name}</p>
          <div className="mt-3 flex items-center justify-center space-x-1 text-[11px] text-blue-200">
            <MapPin className="w-3 h-3" />
            <span>{ticketData.facility_name}</span>
          </div>
          <div className="mt-2.5 flex justify-center">
            <LiveClockIST showDate={true} className="bg-white/20 text-white border-white/30 text-[11px]" />
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-6">
          {/* Status Alert Banner */}
          {getStatusBadge()}

          {/* Assigned Counter if called or in service */}
          {ticket.assigned_counter_name && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wider">
                Assigned Desk
              </span>
              <div className="text-base font-bold text-amber-950 dark:text-amber-200 mt-0.5">
                {ticket.assigned_counter_name}
              </div>
            </div>
          )}

          {/* COMPLETED SUMMARY CARD */}
          {ticket.status === 'COMPLETED' && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                Service Completion Summary:
              </span>
              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500">Total Wait:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatSeconds(ticket.actual_waiting_seconds || 0)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500">Service Duration:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatSeconds(ticket.actual_service_seconds || 0)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center pt-1">
                Completed at {formatFacilityTime(ticket.completed_at, facility_timezone)} ({facility_timezone})
              </p>
            </div>
          )}

          {/* Dynamic Queue Metrics (When Waiting) */}
          {ticket.status === 'WAITING' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Position Ahead</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    #{position_ahead + 1}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {position_ahead === 0 ? 'You are next!' : `${position_ahead} ahead`}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Remaining Wait</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" title="Dynamic real-time ETA" />
                  </div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {liveRemainingWait !== null ? formatRemainingWait(liveRemainingWait) : formatRemainingWait(estimated_wait_seconds)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Est. Range: {formatSeconds(lower_bound_seconds)}–{formatSeconds(upper_bound_seconds)}
                  </span>
                </div>
              </div>

              {/* Expected Service Time Card */}
              {estimated_turn_time && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Expected Service Time</span>
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
                      ~{formatFacilityTime(estimated_turn_time, facility_timezone)} <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">IST</span>
                    </div>
                    <span className="text-[10px] text-slate-400 italic">Dynamic estimate based on live queue pace</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium">Estimated Window</span>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {formatFacilityTime(turn_time_lower, facility_timezone)} – {formatFacilityTime(turn_time_upper, facility_timezone)}
                    </div>
                  </div>
                </div>
              )}

              {/* Uncertainty Confidence Interval Bar */}
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-1 text-xs">
                <div className="flex justify-between items-center text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                  <span>P10–P90 Confidence Interval</span>
                  <span>{ticketData.data_quality} Confidence</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {explanation}
                </p>
              </div>

              {/* Recommended Departure Advice */}
              {recommended_departure_time && (
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-start space-x-2.5 text-xs text-emerald-900 dark:text-emerald-300">
                  <Compass className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Smart Return Recommendation:</span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Based on your {ticket.travel_time_minutes}-min walking buffer, head to the desk by{' '}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatFacilityTime(recommended_departure_time, facility_timezone)}
                      </span>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FCM Web Push Notification Card */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className={`w-4 h-4 ${pushEnabled ? 'text-emerald-500' : 'text-blue-600'}`} />
                <span className="font-bold text-slate-900 dark:text-white">
                  {pushEnabled ? 'Web Push Alerts: Active' : 'Browser Push Notifications'}
                </span>
              </div>
              {pushEnabled ? (
                <button
                  onClick={handleTestPush}
                  disabled={pushLoading}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 transition"
                >
                  {pushLoading ? 'Testing...' : 'Test Push'}
                </button>
              ) : (
                <button
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="px-3 py-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
                >
                  {pushLoading ? 'Enabling...' : 'Enable Alerts'}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {pushEnabled
                ? 'Device registered with Firebase Cloud Messaging. You will receive alerts when your turn is approaching, called, or delayed.'
                : 'Receive alerts when your turn is approaching, when your ticket is called, or when queue capacity changes.'}
            </p>
            {pushFeedback && (
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {pushFeedback}
              </p>
            )}
          </div>

          {/* SMS Notification Status Pill (Channel: SMS) */}
          {ticket.visitor_phone && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  SMS Text Alerts: {ticket.visitor_phone}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {notifications.some(n => n.channel === 'SMS') ? 'SMS Sent' : 'Optional SMS'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {ticket.status === 'CALLED' && (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="w-full py-3.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all text-sm flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Check-in at Counter</span>
              </button>
            )}

            {ticket.status === 'WAITING' && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 transition-colors"
              >
                Cancel My Ticket
              </button>
            )}
          </div>
        </div>

        {/* Ticket Footer Meta */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
          <span>Joined: {formatFacilityTime(ticket.joined_at, facility_timezone)} ({facility_timezone})</span>
          <span>Visitor: {ticket.visitor_name || 'Guest'}</span>
        </div>
      </div>

      {/* Helpful Policy Note */}
      <div className="text-center text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
        <p>Keep this tab open for live turn updates.</p>
        <p>Estimates recalculate continuously using real desk observations.</p>
      </div>
    </div>
  );
}
