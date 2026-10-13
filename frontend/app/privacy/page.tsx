import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Privacy Policy & Data Ethics
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Privacy by Design
        </h1>
        <p className="text-xs text-slate-500">Last updated: October 2026</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Data Minimization</h2>
          <p>
            QueueLess collects only the minimum operational data required to provide virtual queue ticketing: your display name and optional notification phone number. We do not require national IDs, financial data, or sensitive academic records to enter a queue.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Public Real-Time Channels</h2>
          <p>
            Public WebSocket channels broadcast strictly anonymous token numbers (such as &ldquo;TRA-005&rdquo;) and counter assignments. Your personal name and contact details are never exposed to other visitors.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Retention & Deletion</h2>
          <p>
            Queue entry records and associated operational snapshots are automatically pruned according to the hosting facility&apos;s data retention policy. Historical duration records are stored in aggregated, anonymized form for statistical baseline prediction.
          </p>
        </section>
      </div>
    </div>
  );
}
