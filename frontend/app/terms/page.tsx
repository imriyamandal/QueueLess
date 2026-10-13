export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Terms of Service
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Terms of Use & Fair Queueing
        </h1>
        <p className="text-xs text-slate-500">Last updated: October 2026</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Advisory Nature of Wait Predictions</h2>
          <p>
            Waiting-time estimates produced by the Adaptive Waiting Intelligence Engine are probabilistic statistical projections with confidence intervals. They do not constitute guaranteed service appointments. Facilities reserve the right to prioritize urgent student emergencies or adjust operations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Fair Queue Access</h2>
          <p>
            Users agree not to submit automated spam entries, manipulate queue positions, or place duplicate entries across identical queues simultaneously.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Arrival Policy</h2>
          <p>
            Visitors must arrive at the designated service counter when their token is called. Tickets marked as No-Show by desk staff may be requeued or expired according to the facility&apos;s published policies.
          </p>
        </section>
      </div>
    </div>
  );
}
