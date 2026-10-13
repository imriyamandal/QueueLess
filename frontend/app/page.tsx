'use client';

import Link from 'next/link';
import { 
  Clock, ArrowRight, ShieldCheck, Activity, Users, 
  Sparkles, CheckCircle2, ChevronRight, Sliders, Bell, Cpu, 
  HelpCircle, BarChart3, AlertCircle, Play
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-24 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 md:pt-20 lg:pt-24">
        {/* Subtle Arctic background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Adaptive Waiting Intelligence Engine (AWIE) v1.2</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Your time matters. <br />
              <span className="text-blue-600 dark:text-blue-500">Your waiting doesn&apos;t have to.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Say goodbye to physical lines. Join a digital queue from anywhere, receive an adaptive waiting prediction with uncertainty bounds, and arrive relaxed right when your turn approaches.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/join"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Join a Queue Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center space-x-2 transition-all"
              >
                <Play className="w-4 h-4 text-emerald-500 fill-current" />
                <span>Explore Live Demo</span>
              </Link>
            </div>

            <div className="flex items-center justify-center space-x-6 text-xs text-slate-500 dark:text-slate-400 pt-4">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Zero Physical Waiting</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Transparent P10–P90 Ranges</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Live WebSockets</span>
              </div>
            </div>
          </div>

          {/* REALISTIC APPLICATION DUAL PREVIEW */}
          <div className="mt-16 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Left: Visitor Ticket Card */}
            <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Live Virtual Ticket
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Apex Central University
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>In Queue</span>
                  </span>
                </div>

                <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Your Token</span>
                  <div className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
                    TRA-005
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Transcript & Degree Audit Desk
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Position Ahead:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">2 people ahead</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Estimated Wait:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">~11 mins (9–14m)</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                    <span className="font-semibold">Recommended Departure:</span> Leave campus café at 2:42 PM for an on-time arrival.
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Auto-refreshed via WebSocket</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
                  Live Sync
                </span>
              </div>
            </div>

            {/* Right: Operational Desk Live Control Preview */}
            <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Staff Live Operations Portal
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Registrar Hub — 3 Active Counters
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    Live Operations
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Desk 1</div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">TRA-004</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-500">In Service (3m)</div>
                  </div>
                  <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 text-center">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Desk 2</div>
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-1">AVAILABLE</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-500">Ready for Next</div>
                  </div>
                  <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Desk 3</div>
                    <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1">PAUSED</div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-500">Scheduled Break</div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Upcoming in Queue</span>
                    <span>Action</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="font-mono font-medium text-slate-900 dark:text-white">TRA-005 — Alex R.</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-medium">Ready to Call</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="font-mono text-slate-600 dark:text-slate-300">TRA-006 — Taylor C.</span>
                    <span className="text-[10px] text-slate-500">Wait: ~11m</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Desk capacity dynamically modeled in real-time</span>
                <Link href="/staff" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center">
                  <span>Open Staff Desk</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE STEP VISITOR WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Frictionless Visitor Journey
          </span>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            How QueueLess transforms your day
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            No downloaded app required. Join from any phone browser in 10 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl mb-6">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Join Digitally
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Select your facility and service. Enter your name and optional travel buffer time. Receive your unique virtual ticket instantly.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl mb-6">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Track with Confidence
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Watch real-time updates powered by the Adaptive Waiting Intelligence Engine. See transparent P10–P90 uncertainty bounds and departure advice.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl mb-6">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Arrive Just in Time
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When your turn approaches, walk in and check in at the assigned counter. Get served without spending 45 minutes standing in a crowded hallway.
            </p>
          </div>
        </div>
      </section>

      {/* CORE DIFFERENTIATOR: ADAPTIVE WAITING INTELLIGENCE */}
      <section className="bg-slate-100/70 dark:bg-slate-900/60 py-20 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Core Innovation Subsystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Not a simple token generator. <br />
                <span className="text-blue-600">Adaptive Waiting Intelligence.</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                Naive systems multiply position by an arbitrary duration. QueueLess runs a discrete counter-scheduling simulation that continuously adapts to reality:
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Counter Discrete Simulation</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Models parallel counters with heterogeneous service permissions and accounts for remaining duration on busy desks.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Uncertainty Bounds & Calibrated Ranges</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Provides honest P10–P90 confidence intervals instead of fake exact promises. Standard error dynamically adjusts as queue length changes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Instant Interruption Adaptation</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      When staff pause a counter or a visitor cancels, predictions instantly recalculate across all affected tickets with transparent explanations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Formula & Metric Card */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-lg space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Prediction Engine Architecture</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  AWIE-v1.2-Deterministic
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-4 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="text-blue-600 dark:text-blue-400 font-semibold">// Discrete Earliest Availability Simulator</div>
                <div>for entry in Q_ahead:</div>
                <div className="pl-4">best_desk = argmin(T_counter)</div>
                <div className="pl-4">T_counter[best_desk] += &mu;_service</div>
                <div className="pt-2 text-slate-500 dark:text-slate-400">// P10-P90 Confidence Bound Formulation</div>
                <div>SE = sqrt(&Sigma;&sigma;^2 / M_effective_counters)</div>
                <div>W_lower = max(30s, &mu; - 1.28*SE)</div>
                <div>W_upper = &mu; + 1.28*SE + buffer_paused</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-center">
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-400">92.4%</div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1">Range Coverage Target</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-center">
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">Zero Paid APIs</div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1">Private Deterministic Logic</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Clear Answers & Operational Trust
          </h2>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Do visitors need to download an application?
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              No. QueueLess runs entirely as a mobile-first progressive web application. Visitors can scan a QR code or visit the web link to immediately join and monitor their ticket.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              How does QueueLess handle unexpected delays or pauses?
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              If a desk counter is paused for a staff break or unexpected interruption, the Adaptive Waiting Intelligence Engine instantly expands prediction intervals and displays a clear message such as &ldquo;1 counter paused: capacity adjusted.&rdquo;
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Is visitor personal information exposed in live broadcasts?
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Never. Public WebSocket channels only broadcast anonymous token identifiers (e.g. TRA-005) and counter numbers. Personal names and contact details remain strictly isolated.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-10 md:p-14 text-center text-white relative overflow-hidden shadow-xl">
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to eliminate waiting lines forever?
            </h2>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Experience the future of virtual queuing. Test the visitor ticket, operate staff counters, or run the interactive simulation.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/join"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-md transition-all hover:scale-105 active:scale-95"
              >
                Join a Live Queue
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-blue-800 text-white hover:bg-blue-900 border border-blue-400/30 transition-all"
              >
                Launch Simulation Sandbox
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
