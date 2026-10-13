'use client';

import { useState, useEffect } from 'react';
import { api, TicketDetail, StaffDashboardData, WS_BASE_URL } from '../../lib/api';
import { 
  Play, RotateCcw, UserPlus, PauseCircle, PhoneOff, CheckCircle2, 
  Sparkles, AlertCircle, Compass, Cpu, Activity, Clock 
} from 'lucide-react';

export default function DemoSimulatorPage() {
  const [staffData, setStaffData] = useState<StaffDashboardData | null>(null);
  const [activeTicket, setActiveTicket] = useState<TicketDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([
    'Demo scenario initialized with 3 counters and 4 waiting visitors.',
  ]);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 7),
    ]);
  };

  const refreshState = async () => {
    try {
      const data = await api.getStaffDashboard();
      setStaffData(data);

      // If waiting entries exist, inspect first waiting ticket
      if (data.waiting_entries.length > 0) {
        const ticketDetail = await api.getTicket(data.waiting_entries[0].id);
        setActiveTicket(ticketDetail);
      } else if (data.in_service_entries.length > 0) {
        const ticketDetail = await api.getTicket(data.in_service_entries[0].id);
        setActiveTicket(ticketDetail);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerAction = async (action: string, payload?: any) => {
    setActionLoading(true);
    try {
      const res = await api.simulate(action, payload);
      addLog(res.message);
      await refreshState();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Prominent Simulated Data Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-3">
          <span className="p-2 rounded-xl bg-amber-500 text-white font-black text-xs uppercase tracking-wider">
            Simulated Data
          </span>
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Interactive Hackathon Scenario Sandbox
            </h3>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              This sandbox triggers real backend state transitions and verifies dynamic AWIE prediction recalibration.
            </p>
          </div>
        </div>

        <button
          onClick={() => triggerAction('RESET_SCENARIO')}
          disabled={actionLoading}
          className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1.5 shadow-sm transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Scenario Seed</span>
        </button>
      </div>

      {/* CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Scenario Event Injections
          </span>
          <span className="text-xs text-slate-400">Click any action to see live multi-counter recomputation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => triggerAction('ADD_VISITOR')}
            disabled={actionLoading}
            className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>+ Add Visitor</span>
          </button>

          <button
            onClick={() => triggerAction('CALL_NEXT')}
            disabled={actionLoading}
            className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <Play className="w-4 h-4 text-emerald-600 fill-current" />
            <span>Call Next</span>
          </button>

          <button
            onClick={() => triggerAction('COMPLETE_SERVICE')}
            disabled={actionLoading}
            className="p-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>Complete Active</span>
          </button>

          <button
            onClick={() => triggerAction('PAUSE_COUNTER')}
            disabled={actionLoading}
            className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <PauseCircle className="w-4 h-4 text-amber-600" />
            <span>Pause Desk #2</span>
          </button>

          <button
            onClick={() => triggerAction('RESUME_COUNTER')}
            disabled={actionLoading}
            className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <Play className="w-4 h-4 text-indigo-600" />
            <span>Resume Desk #2</span>
          </button>

          <button
            onClick={() => triggerAction('INJECT_NO_SHOW')}
            disabled={actionLoading}
            className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <PhoneOff className="w-4 h-4 text-rose-600" />
            <span>Inject No-Show</span>
          </button>
        </div>
      </div>

      {/* DUAL PANE LIVE REAL-TIME DEMO PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Visitor Ticket Live Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Visitor Ticket Reaction
            </h3>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              Real Engine State
            </span>
          </div>

          {activeTicket ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-5">
              <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Inspected Token</span>
                <div className="text-4xl font-black text-slate-900 dark:text-white mt-0.5">
                  {activeTicket.ticket.token_number}
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {activeTicket.ticket.visitor_name} — {activeTicket.ticket.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                    <span className="text-[11px] text-slate-500">Queue Position</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      #{activeTicket.position_ahead + 1}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                    <span className="text-[11px] text-slate-500">Wait Estimate</span>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                      ~{Math.round(activeTicket.estimated_wait_seconds / 60)} mins
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-300">
                  <span className="font-bold">Transparent Prediction Notice:</span>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {activeTicket.explanation}
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Confidence: {activeTicket.data_quality}</span>
                  <span>
                    Range: {Math.round(activeTicket.lower_bound_seconds / 60)}m – {Math.round(activeTicket.upper_bound_seconds / 60)}m
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
              No tickets found. Click &ldquo;+ Add Visitor&rdquo; above.
            </div>
          )}
        </div>

        {/* Right: Operational Desks & Event Log */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Facility Desks Status
            </h3>
            {staffData && (
              <div className="grid grid-cols-3 gap-3">
                {staffData.counters.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center"
                  >
                    <span className="text-[10px] font-semibold text-slate-400">Desk #{c.counter_number}</span>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{c.name}</div>
                    <span
                      className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : c.status === 'BUSY'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time simulation event stream */}
          <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono text-xs space-y-2 border border-slate-800 shadow-md">
            <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-bold flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulation Event Stream</span>
              </span>
              <span className="text-[10px]">Real-time AWIE Subsystem</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {logMessages.map((msg, i) => (
                <div key={i} className="text-slate-300">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5-MINUTE HACKATHON DEMONSTRATION SCRIPT */}
      <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-slate-700 dark:text-slate-300 space-y-3">
        <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Recommended 5-Minute Hackathon Judge Demo Script</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
          <li><strong>Step 1:</strong> Note the 4 waiting visitors and current ~11m wait time on Desk 1.</li>
          <li><strong>Step 2 (The Pause Test):</strong> Click &ldquo;Pause Desk #2&rdquo;. Immediately observe the wait time increase and the explanation note that desk capacity was reduced.</li>
          <li><strong>Step 3 (The Resume Test):</strong> Click &ldquo;Resume Desk #2&rdquo;. Notice the estimate immediately recovers as capacity is restored.</li>
          <li><strong>Step 4:</strong> Click &ldquo;Call Next&rdquo; and &ldquo;Complete Active&rdquo; to observe queue progression and free desks.</li>
          <li><strong>Step 5:</strong> Click &ldquo;Analytics&rdquo; in the navbar to review MAE accuracy and prediction range coverage evaluation across historical tickets.</li>
        </ol>
      </div>
    </div>
  );
}
