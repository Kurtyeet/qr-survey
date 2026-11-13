'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SurveyData } from '@/types/survey';
import {
  Plus,
  QrCode,
  Users,
  Calendar,
  ExternalLink,
  Trash2,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
  Zap,
  FileEdit,
} from 'lucide-react';

export default function AdminSurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/surveys');
      if (res.ok) setSurveys(await res.json());
    } catch (err) {
      console.error('Failed to load surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSurveys(); }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/surveys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok)
        setSurveys((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !currentStatus } : s));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? All submissions will also be removed.`)) return;
    try {
      const res = await fetch(`/api/admin/surveys/${id}`, { method: 'DELETE' });
      if (res.ok) setSurveys((prev) => prev.filter((s) => s.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const totalSubmissions = surveys.reduce((acc, s) => acc + (s._count?.submissions || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-brand-sm">
              <QrCode className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">QR Survey</span>
              <span className="hidden sm:inline ml-2 text-xs text-slate-400">Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/new"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-brand-sm transition"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              New Survey
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Surveys', value: surveys.length, icon: QrCode, accent: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Responses', value: totalSubmissions, icon: Users, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Auto-sync', value: 'On', icon: Zap, accent: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(({ label, value, icon: Icon, accent, bg }) => (
            <div key={label} className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-card flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${bg} ${accent} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Survey list ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Your surveys</h2>
          <button
            onClick={fetchSurveys}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading…</p>
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-16 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">No surveys yet</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 leading-relaxed">
              Create your first survey and get a printable QR code that works fully offline.
            </p>
            <Link
              href="/admin/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-brand-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create first survey
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-card-md hover:border-slate-300 transition-all flex flex-col"
              >
                <div className="p-5 flex-1">
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        survey.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {survey.isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                        )}
                        {survey.isActive ? 'Active' : 'Paused'}
                      </span>

                      {survey.isDraft && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          Draft
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">/s/{survey.slug}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 line-clamp-1">
                    {survey.title}
                  </h3>
                  {survey.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{survey.description}</p>
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      {survey._count?.submissions || 0} response{survey._count?.submissions !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {survey.createdAt ? new Date(survey.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-1.5 p-3 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
                  <Link
                    href={`/admin/surveys/${survey.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg text-xs shadow-brand-sm transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR &amp; Results
                  </Link>

                  <Link
                    href={`/admin/new?edit=${survey.id}`}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                    title="Edit survey"
                  >
                    <FileEdit className="w-4 h-4" />
                  </Link>

                  <Link
                    href={`/s/${survey.id}`}
                    target="_blank"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                    title="Preview survey"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleToggleActive(survey.id, survey.isActive)}
                    className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition"
                    title={survey.isActive ? 'Pause' : 'Activate'}
                  >
                    {survey.isActive
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <XCircle className="w-4 h-4 text-slate-400" />
                    }
                  </button>

                  <button
                    onClick={() => handleDelete(survey.id, survey.title)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
