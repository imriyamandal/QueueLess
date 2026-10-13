'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, QueueItem, Service } from '../../lib/api';
import { Clock, Users, ArrowRight, ShieldCheck, MapPin, Sparkles, AlertCircle } from 'lucide-react';
import LiveClockIST from '../../components/LiveClockIST';

export default function JoinQueuePage() {
  const router = useRouter();
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [travelMinutes, setTravelMinutes] = useState(8);
  const [priorityTier, setPriorityTier] = useState(0);

  useEffect(() => {
    async function loadQueues() {
      try {
        const data = await api.getQueues();
        setQueues(data);
        if (data.length > 0) {
          setSelectedQueueId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load queues from server.');
      } finally {
        setLoading(false);
      }
    }
    loadQueues();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueId) {
      setError('Please select a queue to join.');
      return;
    }
    if (!visitorName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const existingToken = typeof window !== 'undefined' ? localStorage.getItem('queueless_fcm_token') : null;
      const res = await api.joinQueue(selectedQueueId, {
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim() || undefined,
        fcm_token: existingToken || undefined,
        priority: priorityTier,
        travel_time_minutes: travelMinutes,
      });

      // Save ticket id to local storage for quick access on /app
      const existing = JSON.parse(localStorage.getItem('my_tickets') || '[]');
      existing.unshift(res.ticket.id);
      localStorage.setItem('my_tickets', JSON.stringify(existing.slice(0, 10)));

      // Route to virtual ticket
      router.push(`/ticket/${res.ticket.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join queue.');
      setSubmitting(false);
    }
  };

  const selectedQueue = queues.find((q) => q.id === selectedQueueId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Zero-Contact Virtual Entry</span>
          </div>
          <LiveClockIST showDate={true} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Join a Digital Queue
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Receive an instant live ticket, real-time wait predictions, and departure alerts.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Connecting to queue intelligence engine...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Form */}
          <form onSubmit={handleJoin} className="md:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                1. Select Service Desk
              </label>
              <select
                value={selectedQueueId}
                onChange={(e) => setSelectedQueueId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.service_name || q.name} ({q.waiting_count} waiting)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                2. Your Full Name
              </label>
              <input
                type="text"
                required
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                3. Mobile Number (Optional for SMS/Arrival Alerts)
              </label>
              <input
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="e.g. +1 (555) 234-5678"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  4. Walking / Travel Time to Desk
                </label>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {travelMinutes} minutes
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={travelMinutes}
                onChange={(e) => setTravelMinutes(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                The intelligence engine calculates your recommended departure time using this buffer.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Priority Tier
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPriorityTier(0)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    priorityTier === 0
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Standard Visitor
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityTier(1)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    priorityTier === 1
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Accessibility / Priority
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? (
                <span>Generating Token...</span>
              ) : (
                <>
                  <span>Join Queue & Get Ticket</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Right Summary Info */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Facility Status
              </h3>
              {selectedQueue ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Apex Central University — Student Success Hub</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedQueue.service_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Queue State:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedQueue.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Currently Waiting:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedQueue.waiting_count} people</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Select a service desk to preview queue details.</p>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-blue-900 dark:text-blue-300">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Arrival Policy Notice</span>
              </div>
              <p className="leading-relaxed">
                You are not required to remain in the building while waiting. When your position reaches #1, arrive at the second floor hall.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
