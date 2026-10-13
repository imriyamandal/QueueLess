'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockISTProps {
  showDate?: boolean;
  className?: string;
  badgeOnly?: boolean;
}

export default function LiveClockIST({ showDate = false, className = '', badgeOnly = false }: LiveClockISTProps) {
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateClock = () => {
      const now = new Date();
      // Format actual live Indian Standard Time (Asia/Kolkata) with AM/PM
      const timeFormatted = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const dateFormatted = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      setTimeString(timeFormatted);
      setDateString(dateFormatted);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 animate-pulse ${className}`}
        aria-hidden="true"
      >
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>--:--:-- -- IST</span>
      </div>
    );
  }

  if (badgeOnly) {
    return (
      <span
        className={`inline-flex items-center space-x-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 ${className}`}
        title="Indian Standard Time (Asia/Kolkata)"
        aria-label={`Current Indian Standard Time: ${timeString}`}
      >
        <span>{timeString}</span>
        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">IST</span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-colors ${className}`}
      title="Authoritative Live Indian Standard Time (Asia/Kolkata)"
      aria-live="polite"
      aria-label={`Live Indian Standard Time: ${timeString}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      {showDate && dateString && (
        <span className="text-slate-500 dark:text-slate-400 hidden sm:inline border-r border-slate-300 dark:border-slate-600 pr-2">
          {dateString}
        </span>
      )}
      <span className="font-semibold tracking-tight">{timeString}</span>
      <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60">
        IST
      </span>
    </div>
  );
}
