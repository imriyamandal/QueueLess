'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, TicketHistoryItem } from '../../lib/api';
import { 
  Clock, Plus, ArrowRight, Ticket, Search, Filter, 
  CheckCircle2, AlertCircle, Phone, Calendar, RefreshCw 
} from 'lucide-react';

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
}

function formatDateTime(isoString?: string): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export default function VisitorPortalPage() {
  const [historyItems, setHistoryItems] = useState<TicketHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [phoneLookup, setPhoneLookup] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const savedIds: string[] = JSON.parse(localStorage.getItem('my_tickets') || '[]');
      
      const params: { phone?: string; ids?: string; status?: string } = {};
      if (phoneLookup.trim()) {
        params.phone = phoneLookup.trim();
      } else if (savedIds.length > 0) {
        params.ids = savedIds.join(',');
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const res = await api.getTicketHistory(params);
      setHistoryItems(Array.isArray(res) ? res : (res as any)?.items || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch queue history from backend');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, phoneLookup]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handlePhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const filteredItems = historyItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.token_number.toLowerCase().includes(q) ||
      item.service_name.toLowerCase().includes(q) ||
      item.facility_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Visitor Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            My Virtual Queue History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative records persisted in QueueLess database (Asia/Kolkata timezone)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchHistory()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center transition"
            title="Refresh from backend"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/join"
            className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Join Another Queue</span>
          </Link>
        </div>
      </div>

      {/* Filter and Lookup Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === tab
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'All Tickets' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search & Phone lookup */}
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handlePhoneSearch} className="flex gap-2">
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                placeholder="Lookup by Phone..."
                value={phoneLookup}
                onChange={(e) => setPhoneLookup(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition"
            >
              Search
            </button>
          </form>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter by token/service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-medium">Fetching verified queue history from database...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Tickets Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {phoneLookup
              ? `No records found for phone ${phoneLookup}. Make sure the full number is entered.`
              : 'You have no tickets saved for this device. Join a queue or use phone lookup to view your visit history.'}
          </p>
          <Link
            href="/join"
            className="inline-block px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
          >
            Join a Queue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((t) => {
            const isCompleted = t.status === 'COMPLETED';
            const isCalled = t.status === 'CALLED';
            const isInService = t.status === 'IN_SERVICE';
            const isWaiting = t.status === 'WAITING';
            const isCancelled = t.status === 'CANCELLED' || t.status === 'NO_SHOW';

            return (
              <div
                key={t.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {t.token_number}
                      </span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {t.service_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {t.facility_name}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isCalled
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                          : isInService
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isCancelled
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Joined</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDateTime(t.joined_at)}
                      </span>
                    </div>

                    {isCompleted && t.completed_at ? (
                      <div>
                        <span className="text-slate-400 block">Completed</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDateTime(t.completed_at)}
                        </span>
                      </div>
                    ) : t.called_at ? (
                      <div>
                        <span className="text-slate-400 block">Called</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDateTime(t.called_at)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-slate-400 block">Status</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Waiting in queue
                        </span>
                      </div>
                    )}

                    {t.actual_waiting_seconds !== undefined && t.actual_waiting_seconds !== null && (
                      <div>
                        <span className="text-slate-400 block">Actual Wait</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDuration(t.actual_waiting_seconds)}
                        </span>
                      </div>
                    )}

                    {t.actual_service_seconds !== undefined && t.actual_service_seconds !== null && (
                      <div>
                        <span className="text-slate-400 block">Service Time</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDuration(t.actual_service_seconds)}
                        </span>
                      </div>
                    )}

                    {t.assigned_counter_name && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Assigned Counter</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {t.assigned_counter_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {t.id.slice(0, 8)}...
                  </span>
                  <Link
                    href={`/ticket/${t.id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center hover:underline"
                  >
                    <span>View Pass & Live Status</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

