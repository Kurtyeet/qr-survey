'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db, OfflineSubmission } from '@/lib/db';
import { syncPendingSubmissions } from '@/lib/syncEngine';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import NetworkBanner from '@/components/NetworkBanner';
import { CheckCircle2, Clock, CloudUpload, ArrowRight, RefreshCw } from 'lucide-react';

export default function ConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const surveyId = params?.id as string;
  const submissionId = searchParams?.get('subId');

  const { isOnline } = useNetworkStatus();
  const [submission, setSubmission] = useState<OfflineSubmission | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    const checkStatus = async () => {
      try {
        const item = await db.submissionsQueue.get(submissionId);
        if (item) setSubmission(item);
      } catch (e) {
        console.error(e);
      }
    };
    checkStatus();
    const timer = setInterval(checkStatus, 1500);
    return () => clearInterval(timer);
  }, [submissionId]);

  const handleSyncNow = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncPendingSubmissions(surveyId);
      if (submissionId) {
        const updated = await db.submissionsQueue.get(submissionId);
        if (updated) setSubmission(updated);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const isSynced = submission?.status === 'synced';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <NetworkBanner surveyId={surveyId} />

      <main className="flex-1 max-w-sm w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card-md p-8 text-center animate-slide-up">
          {/* Status icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 transition-colors ${
            isSynced ? 'bg-emerald-100' : 'bg-amber-100'
          }`}>
            {isSynced
              ? <CheckCircle2 className="w-9 h-9 text-emerald-600" strokeWidth={1.5} />
              : <CloudUpload className="w-8 h-8 text-amber-600 animate-pulse" strokeWidth={1.5} />
            }
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {isSynced ? 'Response uploaded!' : 'Saved to your phone!'}
          </h1>

          <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-xs mx-auto">
            {isSynced
              ? 'Your response has been securely transmitted and recorded in the database.'
              : 'Your answers are safely stored on this device and will upload automatically when internet reconnects.'}
          </p>

          {/* Status detail */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Submission ID</span>
              <span className="font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] truncate max-w-[160px]">
                {submissionId ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Sync status</span>
              {isSynced ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  Queued on device
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Network</span>
              <span className={`font-semibold ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            {!isSynced && isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                {isSyncing ? 'Uploading…' : 'Upload now'}
              </button>
            )}

            <Link
              href={`/s/${surveyId}`}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              Submit another response
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="block text-xs text-slate-400 hover:text-slate-600 py-1 transition"
            >
              Return to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
