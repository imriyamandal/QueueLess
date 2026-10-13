import Link from 'next/link';
import { Clock, Shield, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                Queue<span className="text-blue-600">Less</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Adaptive Waiting Intelligence Platform for student administrative centers, medical clinics, and public facilities.
            </p>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>WCAG 2.2 AA Accessible & Privacy-Preserving</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Visitor Experience
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/join" className="hover:text-blue-600 transition-colors">Join Digital Queue</Link></li>
              <li><Link href="/how-it-works" className="hover:text-blue-600 transition-colors">How It Works</Link></li>
              <li><Link href="/app" className="hover:text-blue-600 transition-colors">My Virtual Tickets</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Facility & Operations
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/staff" className="hover:text-blue-600 transition-colors">Staff Operations Desk</Link></li>
              <li><Link href="/admin" className="hover:text-blue-600 transition-colors">Analytics & Audit</Link></li>
              <li><Link href="/demo" className="hover:text-blue-600 transition-colors">Interactive Demo Mode</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Platform & Legal
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/features" className="hover:text-blue-600 transition-colors">Adaptive Intelligence Engine</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy & Data Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} QueueLess — Your Time Matters. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 flex items-center space-x-1">
            <span>Deterministic Statistical Intelligence</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Zero-Dependency Baseline</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
