'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Incorrect passcode. Default is admin123.');
      }
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-brand">
            <QrCode className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-white/[0.08] rounded-2xl p-8 shadow-card-md">
          <h1 className="text-xl font-bold text-white mb-1 text-center">Admin access</h1>
          <p className="text-sm text-slate-500 text-center mb-6">
            Enter your passcode to manage surveys.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-950/50 border border-red-800/50 rounded-xl text-xs text-red-300 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">
                Passcode
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">Configure via ADMIN_SECRET in .env</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-brand-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                <>
                  Unlock Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
