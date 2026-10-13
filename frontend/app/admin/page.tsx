'use client';

import { useState, useEffect } from 'react';
import { api, AnalyticsData, API_BASE_URL } from '../../lib/api';
import { 
  BarChart3, Download, Users, Clock, ShieldCheck, Activity, 
  TrendingUp, CheckCircle2, AlertTriangle, Layers, Calendar, RefreshCw 
} from 'lucide-react';
import LiveClockIST from '../../components/LiveClockIST';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    try {
      const metrics = await api.getAnalytics();
      setData(metrics);
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load operational analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 25000);
    return () => clearInterval(interval);
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Administrative Console
            </span>
            <LiveClockIST showDate={true} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Operational Analytics & Accuracy Evaluation
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh analytics data"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <a
            href={`${API_BASE_URL}/analytics/export`}
            download="queueless-analytics.csv"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 flex items-center space-x-2 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Analytics (CSV)</span>
          </a>
        </div>
      </div>

      {loading || !data ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Aggregating operational events...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Served Today</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                {data.total_served_today}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Throughput on track</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg. Waiting Time</span>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {formatSeconds(data.avg_waiting_time_seconds)}
              </div>
              <span className="text-[11px] text-slate-400">Median: {formatSeconds(data.median_waiting_time_seconds)}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg. Service Duration</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                {formatSeconds(data.avg_service_time_seconds)}
              </div>
              <span className="text-[11px] text-slate-400">Target baseline: ~7m</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Desk Utilization</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {data.counter_utilization_percent}%
              </div>
              <span className="text-[11px] text-slate-400">{data.active_counters_count} active counters</span>
            </div>
          </div>

          {/* PREDICTION ACCURACY EVALUATION (AWIE) */}
          <div className="p-6 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Model Calibration & Evaluation
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Adaptive Intelligence Accuracy Metrics
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-white dark:bg-slate-900 text-blue-600 border border-blue-200 dark:border-blue-800">
                AWIE-v1.2-Deterministic
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-500 font-semibold">Mean Absolute Error (MAE)</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  &plusmn;{Math.round(data.prediction_mae_seconds / 60)} mins
                </div>
                <span className="text-[10px] text-slate-400">Evaluated on historical snapshots</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-500 font-semibold">P10–P90 Coverage Rate</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {data.prediction_coverage_percent}%
                </div>
                <span className="text-[10px] text-slate-400">Actuals inside predicted interval</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-500 font-semibold">No-Show & Cancellation</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {data.no_show_rate_percent}% / {data.cancellation_rate_percent}%
                </div>
                <span className="text-[10px] text-slate-400">Queue attrition rate</span>
              </div>
            </div>
          </div>

          {/* VISUALIZATION CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hourly Throughput Chart */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hourly Served Throughput (Completed Services)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourly_throughput}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="hour" fontSize={11} stroke="#888888" />
                    <YAxis fontSize={11} stroke="#888888" />
                    <Tooltip />
                    <Bar dataKey="served" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Breakdown Chart */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Completed Volume by Service
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.service_breakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" fontSize={11} stroke="#888888" />
                    <YAxis dataKey="service" type="category" width={110} fontSize={10} stroke="#888888" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AUDIT LOG TABLE */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Administrative & Operational Audit Trail
            </h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left font-bold uppercase">Actor</th>
                    <th className="px-4 py-3 text-left font-bold uppercase">Action</th>
                    <th className="px-4 py-3 text-left font-bold uppercase">Resource</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">
                        No recent audit log entries.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          {log.actor_email || 'System'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {log.target_resource}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
