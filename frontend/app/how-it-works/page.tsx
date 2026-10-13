import Link from 'next/link';
import { ArrowRight, CheckCircle2, QrCode, Bell, UserCheck, Shield } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          User Flow & Operational Playbook
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          How QueueLess Works
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          A seamless experience designed for both busy students and desk staff.
        </p>
      </div>

      <div className="space-y-12">
        <div className="flex flex-col md:flex-row items-start gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
            01
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Scan or Tap from Anywhere
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Scan a QR code posted on campus or visit the facility portal directly. Select the department and service you need, specify your walking travel time, and enter the digital line in seconds.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
            02
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Go About Your Day While Tracking Your Spot
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Study at the library, grab lunch, or sit comfortably outside. Your virtual ticket updates in real time via WebSockets, showing exactly how many visitors are ahead and providing dynamic departure advice.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
            03
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Direct Service Without Waiting
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When your turn is called, head straight to the assigned counter. Check in with your digital ticket and complete your service immediately.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/join"
          className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all"
        >
          <span>Get Started Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
