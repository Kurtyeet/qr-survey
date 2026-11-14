'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db, OfflineSubmission } from '@/lib/db';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import NetworkBanner from '@/components/NetworkBanner';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CheckCircle2,
  Clock,
  CloudUpload,
  ArrowRight,
  User,
  RefreshCw,
  Users,
} from 'lucide-react';

function ConfirmationContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const surveyId = params?.id as string;
  const submissionId = searchParams?.get('subId');
  const packedParam = searchParams?.get('d');

  const { isOnline } = useNetworkStatus();
  const [submission, setSubmission] = useState<OfflineSubmission | null>(null);

  // Total responses collected on this surveyor phone for this survey
  const totalCollected = useLiveQuery(
    async () => {
      try {
        if (!surveyId) return 0;
        return await db.submissionsQueue.where('surveyId').equals(surveyId).count();
      } catch {
        return 0;
      }
    },
    [surveyId],
    1
  );

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

  const isSynced = submission?.status === 'synced';

  const handleNextRespondent = async () => {
    if (surveyId) {
      await db.drafts.delete(surveyId).catch(console.warn);
    }
    const targetUrl = `/s/${surveyId}${packedParam ? `?d=${packedParam}` : ''}`;
    window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-12">
      <NetworkBanner surveyId={surveyId} />

      <main className="flex-1 max-w-sm w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card-md p-6 sm:p-8 text-center animate-slide-up">
          {/* Status icon */}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
              isSynced ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {isSynced ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
            ) : (
              <CloudUpload className="w-7 h-7 text-amber-600 animate-pulse" strokeWidth={1.5} />
            )}
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-1.5">
            {isSynced ? 'Response Uploaded!' : 'Response Saved on Device!'}
          </h1>

          <p className="text-xs text-slate-500 leading-relaxed mb-4 max-w-xs mx-auto">
            {isSynced
              ? 'Thank you! Your survey response has been transmitted directly to the surveyor.'
              : 'Your answers are recorded safely on this device and will auto-upload when internet reconnects.'}
          </p>

          {/* Respondent detail chip */}
          {submission && (submission.respondentName || submission.respondentRole) && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 mb-4 text-left text-xs text-blue-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <User className="w-3.5 h-3.5 text-blue-600" />
                {submission.respondentName || 'Anonymous'}
              </span>
              {submission.respondentRole && (
                <span className="bg-white border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium text-blue-700">
                  {submission.respondentRole}
                </span>
              )}
            </div>
          )}

          {/* Sync Meta */}
          <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-200/80 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Status</span>
              {isSynced ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Queued Locally
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Network</span>
              <span className={`font-semibold ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isOnline ? 'Online' : 'Offline (Hotspot)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                Collected on this device
              </span>
              <span className="font-bold text-slate-800">
                {totalCollected ?? 1} response{(totalCollected ?? 1) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={handleNextRespondent}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-brand-sm"
            >
              <span>Submit Another Response</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/"
              className="block text-xs text-slate-400 hover:text-slate-600 py-1 transition text-center"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
