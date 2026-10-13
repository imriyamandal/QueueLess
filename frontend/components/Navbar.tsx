'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Clock, Layers, Users, BarChart3, Play, Menu, X, ShieldCheck } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LiveClockIST from './LiveClockIST';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <Clock className="w-6 h-6 animate-pulse-subtle" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                Queue<span className="text-blue-600">Less</span>
              </span>
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 -mt-1">
                Your Time Matters
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/join"
              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Join Queue
            </Link>
            <Link
              href="/staff"
              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center space-x-1"
            >
              <Users className="w-4 h-4 mr-1 text-slate-400" />
              Staff Desk
            </Link>
            <Link
              href="/admin"
              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center space-x-1"
            >
              <BarChart3 className="w-4 h-4 mr-1 text-slate-400" />
              Analytics
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <Play className="w-3 h-3 mr-1 fill-current" />
              Live Demo
            </Link>
            <Link
              href="/features"
              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Features
            </Link>
          </div>

          {/* Actions & Theme */}
          <div className="hidden md:flex items-center space-x-4">
            <LiveClockIST showDate={true} />
            <ThemeToggle />
            <Link
              href="/join"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Virtual Ticket
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center space-x-2">
            <LiveClockIST badgeOnly={true} className="text-[11px]" />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="px-3 pb-2 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">Standard Time:</span>
              <LiveClockIST showDate={true} />
            </div>
            <Link
              href="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Join Queue
            </Link>
            <Link
              href="/staff"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Staff Desk
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Analytics & Admin
            </Link>
            <Link
              href="/demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              Interactive Demo
            </Link>
            <Link
              href="/features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Features & Architecture
            </Link>
            <div className="pt-2">
              <Link
                href="/join"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm"
              >
                Get Virtual Ticket
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
