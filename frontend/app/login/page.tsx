'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Shield, Users, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (role: 'STAFF' | 'ADMIN' | 'VISITOR') => {
    if (role === 'STAFF') {
      router.push('/staff');
    } else if (role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/app');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Demo mode: direct redirect to staff or admin
    if (email.includes('admin')) {
      router.push('/admin');
    } else {
      router.push('/staff');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-md shadow-blue-500/20">
          <Clock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Access QueueLess
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select a role or sign in to your facility account.
        </p>
      </div>

      {/* QUICK ROLE SELECTOR FOR DEMO JUDGES */}
      <div className="bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-800/40 space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 block">
          Judge & Evaluator Quick Access:
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickLogin('VISITOR')}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors"
          >
            Visitor
          </button>
          <button
            onClick={() => handleQuickLogin('STAFF')}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 hover:border-blue-500 transition-colors"
          >
            Staff Desk
          </button>
          <button
            onClick={() => handleQuickLogin('ADMIN')}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@queueless.edu"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
