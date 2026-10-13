import { Cpu, Activity, Clock, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Platform Architecture & Capabilities
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Adaptive Waiting Intelligence
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          QueueLess is designed around mathematical rigor, deterministic statistical simulation, and zero paid API dependencies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Discrete Multi-Desk Simulation
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Rather than dividing people ahead by an arbitrary constant, AWIE models each active counter individually, assigns waiting entries to the earliest projected available counter, and dynamically handles counter permission sets.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            P10–P90 Uncertainty Ranges
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Waiting times in physical service centers have variance. QueueLess displays honest confidence intervals, expanding when counters pause or standard deviation increases.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Smart Departure Advisor
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Visitors input their estimated travel or walk duration. The platform calculates recommended departure times with safety buffers so visitors arrive right on time.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Zero-Leakage Privacy
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Personal identity information is never broadcast over public real-time channels. Only anonymous token codes are shared with connected desk displays.
          </p>
        </div>
      </div>

      <div className="text-center pt-8">
        <Link
          href="/join"
          className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all"
        >
          <span>Try QueueLess Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
